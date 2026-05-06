import json
import pickle
import logging
import threading
import numpy as np
import cv2
import pywt
from pathlib import Path
import tensorflow as tf
from tensorflow.keras import layers

logger = logging.getLogger(__name__)

MODELS_DIR = Path(__file__).resolve().parent.parent / "tumor_models"
KERAS_PATH = MODELS_DIR / "wavefusionnet_final.keras"
SVM_PATH   = MODELS_DIR / "svm_clf.pkl"
XGB_PATH   = MODELS_DIR / "xgb_clf.pkl"
SCALER_PATH = MODELS_DIR / "scaler.pkl"
WEIGHTS_PATH = MODELS_DIR / "ensemble_weights.json"

CLASSES = ["glioma", "meningioma", "no_tumor", "pituitary"]
IMG_SIZE = 224

_IMAGENET_MEAN = [0.485, 0.456, 0.406]
_IMAGENET_STD  = [0.229, 0.224, 0.225]

_keras_model = None
_svm_clf     = None
_xgb_clf     = None
_scaler      = None
_weights     = None
_load_lock   = threading.Lock()


# ---------------------------------------------------------------------------
# Custom objects required to deserialize wavefusionnet_final.keras
# ---------------------------------------------------------------------------

@tf.keras.utils.register_keras_serializable()
def preprocess_effnet(x):
    """Scale [0,1] -> [-1,1] for EfficientNetV2."""
    return tf.cast(x, tf.float32) * 2.0 - 1.0


@tf.keras.utils.register_keras_serializable()
def preprocess_densenet(x):
    """Torch-style ImageNet normalization for DenseNet201."""
    x = tf.cast(x, tf.float32)
    mean = tf.constant(_IMAGENET_MEAN, dtype=tf.float32)
    std  = tf.constant(_IMAGENET_STD,  dtype=tf.float32)
    return (x - mean) / std


@tf.keras.utils.register_keras_serializable()
class ChannelAttention(layers.Layer):
    def __init__(self, ratio=8, **kwargs):
        super().__init__(**kwargs)
        self.ratio = ratio

    def build(self, input_shape):
        ch = input_shape[-1]
        self.fc1 = layers.Dense(max(ch // self.ratio, 1), activation="relu",
                                name=self.name + "_fc1")
        self.fc2 = layers.Dense(ch, name=self.name + "_fc2")

    def call(self, x):
        avg_pool = tf.reduce_mean(x, axis=[1, 2], keepdims=True)
        max_pool = tf.reduce_max(x,  axis=[1, 2], keepdims=True)
        avg_out  = self.fc2(self.fc1(avg_pool))
        max_out  = self.fc2(self.fc1(max_pool))
        return x * tf.sigmoid(avg_out + max_out)

    def get_config(self):
        config = super().get_config()
        config.update({"ratio": self.ratio})
        return config


@tf.keras.utils.register_keras_serializable()
class SpatialAttention(layers.Layer):
    def __init__(self, kernel_size=7, **kwargs):
        super().__init__(**kwargs)
        self.kernel_size = kernel_size

    def build(self, input_shape):
        self.conv = layers.Conv2D(1, self.kernel_size, padding="same",
                                  activation="sigmoid",
                                  name=self.name + "_conv")

    def call(self, x):
        avg_pool = tf.reduce_mean(x, axis=-1, keepdims=True)
        max_pool = tf.reduce_max(x,  axis=-1, keepdims=True)
        attention = self.conv(tf.concat([avg_pool, max_pool], axis=-1))
        return x * attention

    def get_config(self):
        config = super().get_config()
        config.update({"kernel_size": self.kernel_size})
        return config


@tf.keras.utils.register_keras_serializable()
class CBAM(layers.Layer):
    def __init__(self, ratio=8, kernel_size=7, **kwargs):
        super().__init__(**kwargs)
        self.ratio       = ratio
        self.kernel_size = kernel_size

    def build(self, input_shape):
        self.ca = ChannelAttention(self.ratio,       name=self.name + "_ca")
        self.sa = SpatialAttention(self.kernel_size, name=self.name + "_sa")

    def call(self, x):
        x = self.ca(x)
        x = self.sa(x)
        return x

    def get_config(self):
        config = super().get_config()
        config.update({"ratio": self.ratio, "kernel_size": self.kernel_size})
        return config


@tf.keras.utils.register_keras_serializable()
class CrossAttentionFusion(layers.Layer):
    def __init__(self, embed_dim=256, num_heads=4, **kwargs):
        super().__init__(**kwargs)
        self.embed_dim = embed_dim
        self.num_heads = num_heads

    def build(self, input_shape):
        key_dim = self.embed_dim // self.num_heads
        self.mha_ab  = layers.MultiHeadAttention(num_heads=self.num_heads, key_dim=key_dim,
                                                 name=self.name + "_mha_ab")
        self.mha_ba  = layers.MultiHeadAttention(num_heads=self.num_heads, key_dim=key_dim,
                                                 name=self.name + "_mha_ba")
        self.norm_a  = layers.LayerNormalization(name=self.name + "_ln_a")
        self.norm_b  = layers.LayerNormalization(name=self.name + "_ln_b")
        self.proj    = layers.Dense(self.embed_dim, activation="relu",
                                    name=self.name + "_proj")
        self.dropout = layers.Dropout(0.1)

    def call(self, inputs, training=False):
        feat_a, feat_b = inputs
        # Cast to float32 to avoid dtype mismatch under mixed_float16 policy
        feat_a = tf.cast(feat_a, tf.float32)
        feat_b = tf.cast(feat_b, tf.float32)
        attn_ab = tf.cast(self.mha_ab(query=feat_a, key=feat_b, value=feat_b), tf.float32)
        attn_ab = self.norm_a(feat_a + attn_ab)
        attn_ba = tf.cast(self.mha_ba(query=feat_b, key=feat_a, value=feat_a), tf.float32)
        attn_ba = self.norm_b(feat_b + attn_ba)
        fused = self.proj(tf.concat([attn_ab, attn_ba], axis=-1))
        return self.dropout(fused, training=training)

    def get_config(self):
        config = super().get_config()
        config.update({"embed_dim": self.embed_dim, "num_heads": self.num_heads})
        return config


_CUSTOM_OBJECTS = {
    "preprocess_effnet":    preprocess_effnet,
    "preprocess_densenet":  preprocess_densenet,
    "ChannelAttention":     ChannelAttention,
    "SpatialAttention":     SpatialAttention,
    "CBAM":                 CBAM,
    "CrossAttentionFusion": CrossAttentionFusion,
}


def _load_all():
    global _keras_model, _svm_clf, _xgb_clf, _scaler, _weights

    missing = [p for p in [KERAS_PATH, SVM_PATH, XGB_PATH, SCALER_PATH, WEIGHTS_PATH] if not p.exists()]
    if missing:
        raise RuntimeError(f"Missing model files: {[str(p) for p in missing]}")

    with _load_lock:
        if _keras_model is None:
            logger.info("Loading Keras model...")
            _keras_model = tf.keras.models.load_model(
                str(KERAS_PATH),
                custom_objects=_CUSTOM_OBJECTS,
                safe_mode=False,
            )
        if _svm_clf is None:
            with open(SVM_PATH, "rb") as f:
                _svm_clf = pickle.load(f)
        if _xgb_clf is None:
            with open(XGB_PATH, "rb") as f:
                _xgb_clf = pickle.load(f)
        if _scaler is None:
            with open(SCALER_PATH, "rb") as f:
                _scaler = pickle.load(f)
        if _weights is None:
            with open(WEIGHTS_PATH, "r") as f:
                _weights = json.load(f)


def _preprocess(image_path: str) -> np.ndarray:
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Cannot read image: {image_path}")

    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

    # CLAHE on LAB luminance channel
    lab = cv2.cvtColor(img, cv2.COLOR_RGB2LAB)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    lab[:, :, 0] = clahe.apply(lab[:, :, 0])
    img = cv2.cvtColor(lab, cv2.COLOR_LAB2RGB)

    # Skull crop: bounding box of the largest contour (brain region)
    gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
    _, thresh = cv2.threshold(gray, 15, 255, cv2.THRESH_BINARY)
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if contours:
        x, y, w, h = cv2.boundingRect(max(contours, key=cv2.contourArea))
        img = img[y:y + h, x:x + w]

    # Wavelet sharpen: boost detail coefficients then reconstruct
    img_f = img.astype(np.float32) / 255.0
    sharpened = np.zeros_like(img_f)
    orig_h, orig_w = img_f.shape[:2]
    for ch in range(3):
        cA, (cH, cV, cD) = pywt.dwt2(img_f[:, :, ch], "haar")
        rec = pywt.idwt2((cA, (cH * 1.5, cV * 1.5, cD * 1.5)), "haar")
        sharpened[:, :, ch] = rec[:orig_h, :orig_w]
    img_f = np.clip(sharpened, 0.0, 1.0)

    # Resize and keep as float32 in [0, 1]
    img_resized = cv2.resize(img_f, (IMG_SIZE, IMG_SIZE))
    return img_resized.astype(np.float32)


def _extract_features(arr: np.ndarray):
    """Returns (softmax_probs, bottleneck) from the Keras model.

    The model exposes two outputs: 4-class softmax and a 256-d bottleneck.
    If only a single output is found, bottleneck is set to None.
    """
    batch = np.expand_dims(arr, axis=0)
    outputs = _keras_model.predict(batch, verbose=0)

    if isinstance(outputs, (list, tuple)) and len(outputs) == 2:
        softmax_probs = np.array(outputs[0]).flatten()
        bottleneck    = np.array(outputs[1]).flatten()
    else:
        softmax_probs = np.array(outputs).flatten()
        bottleneck    = None

    return softmax_probs, bottleneck


def predict(image_path: str) -> tuple:
    """Full ensemble inference.

    Returns:
        (class_label: str, confidence: float)  — confidence in [0, 1]
    """
    _load_all()

    arr = _preprocess(image_path)
    softmax_probs, bottleneck = _extract_features(arr)

    expected_features = getattr(_scaler, "n_features_in_", None)
    can_use_ensemble = (
        bottleneck is not None
        and (expected_features is None or len(bottleneck) == expected_features)
    )

    if can_use_ensemble:
        scaled = _scaler.transform(bottleneck.reshape(1, -1))

        if hasattr(_svm_clf, "predict_proba"):
            svm_probs = _svm_clf.predict_proba(scaled).flatten()
        else:
            dec = _svm_clf.decision_function(scaled).flatten()
            dec = dec - dec.max()
            exp_dec = np.exp(dec)
            svm_probs = exp_dec / exp_dec.sum()

        xgb_probs = _xgb_clf.predict_proba(scaled).flatten()

        w = _weights
        final_probs = (
            w.get("softmax", 0.1) * softmax_probs
            + w.get("svm",     0.65) * svm_probs
            + w.get("xgb",     0.25) * xgb_probs
        )
    else:
        logger.warning("Ensemble unavailable — falling back to softmax-only prediction.")
        final_probs = softmax_probs

    idx        = int(np.argmax(final_probs))
    label      = CLASSES[idx] if idx < len(CLASSES) else str(idx)
    confidence = float(final_probs[idx])

    return label, confidence


def get_model_readiness(load: bool = False) -> dict:
    files = {
        "keras":   KERAS_PATH,
        "svm":     SVM_PATH,
        "xgb":     XGB_PATH,
        "scaler":  SCALER_PATH,
        "weights": WEIGHTS_PATH,
    }
    missing    = [name for name, p in files.items() if not p.exists()]
    all_present = len(missing) == 0

    if not load:
        return {
            "ready":               all_present,
            "model_files_present": {name: p.exists() for name, p in files.items()},
            "model_loaded":        _keras_model is not None,
            "missing_files":       missing,
            "error":               f"Missing: {missing}" if missing else None,
        }

    try:
        _load_all()
        return {
            "ready":               True,
            "model_files_present": {name: True for name in files},
            "model_loaded":        True,
            "missing_files":       [],
            "error":               None,
        }
    except Exception as exc:
        return {
            "ready":               False,
            "model_files_present": {name: p.exists() for name, p in files.items()},
            "model_loaded":        False,
            "missing_files":       missing,
            "error":               str(exc),
        }
