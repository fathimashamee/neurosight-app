"""
NeuroSight RAG Classifier
Multilingual DistilBERT + FAISS for intent classification
and answer retrieval in English, Sinhala, Tamil
"""

from pathlib import Path
import numpy as np
import pandas as pd
import faiss
import torch
import joblib
from transformers import AutoTokenizer, AutoModelForSequenceClassification, DistilBertModel

MODEL_DIR = Path(__file__).resolve().parent / "model"

EMERGENCY_TERMS = [
    # English
    "seizure", "cannot breathe", "can't breathe", "collapsed",
    "unconscious", "1990", "ambulance", "dying", "stroke",
    "paralysis", "choking", "bleeding", "emergency",
    "convulsion", "blackout", "fainted", "not breathing",
    # Sinhala emergency terms
    "ආයාසය", "හුස්ම", "කඩා වැටුණා", "ගිලන් රථ",
    "කැක්කුම", "කැක්කුමක්", "ඥානය නැති", "ඇද වැටුණා",
    "රුධිරය", "හදිසි", "ශ්වාස", "අංශභාගය",
    # Tamil emergency terms
    "வலிப்பு", "சுவாசிக்க", "மயக்கம்", "ஆம்புலன்ஸ்",
    "வலிப்புத்தாக்கு", "இரத்தம்", "சுயநினைவு",
    "பக்கவாதம்", "அவசரம்", "விழுந்தார்",
]
EMERGENCY_RESPONSES = {
    "en": "This sounds like a medical emergency. Please call 1990 immediately or go to the nearest hospital emergency room. Do not wait — contact your care team right away.",
    "si": "මෙය වෛද්‍ය හදිසි අවස්ථාවක් ලෙස පෙනේ. කරුණාකර වහාම 1990 අමතන්න හෝ ළඟම ඇති රෝහල් හදිසි ප්‍රතිකාර ඒකකයට යන්න. රැඳී නොසිටින්න.",
    "ta": "இது மருத்துவ அவசரநிலை போல் தெரிகிறது. உடனே 1990 அழையுங்கள் அல்லது அருகிலுள்ள மருத்துவமனை அவசர சிகிச்சை பிரிவுக்கு செல்லுங்கள். காத்திருக்காதீர்கள்.",
}


def _detect_script_language(text: str) -> str:
    for ch in text:
        cp = ord(ch)
        if 0x0D80 <= cp <= 0x0DFF:
            return "si"
        if 0x0B80 <= cp <= 0x0BFF:
            return "ta"
    return "en"


def _has_emergency_language(text: str) -> bool:
    lowered = text.lower()
    return any(term.lower() in lowered for term in EMERGENCY_TERMS)


# Keyword overrides for Sinhala and Tamil — fixes classifier misclassifying
# non-English messages as "general" when the intent is clearly something else.
INTENT_KEYWORDS = {
    "nutrition": [
        # Sinhala
        "කෑම", "කන්න", "ආහාර", "කෑමට", "පෝෂණ", "බොන්න", "කෑවොත්",
        "ගන්න ආහාර", "ආහාර ගන්න", "කන ආහාර", "කන දේ",
        # Tamil
        "சாப்பிட", "உணவு", "சாப்பாடு", "சாப்பிட வேண்டும்",
        "என்ன சாப்பிட", "குடிக்க", "சாப்பிடலாம்",
    ],
    "symptom": [
        # Sinhala
        "රිදෙනවා", "රදනවා", "දැනෙනවා", "වේදනා", "ඔක්කාරය",
        "හිසරදය", "කැක්කුව", "දුර්වල", "වෙහෙස", "ඔළුව",
        "ඇස්", "දකින්න", "අමතක", "නිද්ද", "වමනය",
        # Tamil
        "வலிக்கிறது", "தலைவலி", "குமட்டல்", "சோர்வு",
        "வலி", "தலை சுற்றல்", "மறதி", "தூக்கம்", "வாந்தி",
    ],
    "diagnosis": [
        # Sinhala
        "රෝගය", "රෝග විනිශ්චය", "ගෙඩිය", "ප්‍රතිඵල",
        "පරීක්ෂණ", "MRI", "හඳුනාගත්", "රෝගී",
        # Tamil
        "நோய்", "கண்டறிதல்", "கட்டி", "முடிவுகள்",
        "பரிசோதனை", "நோயறிதல்",
    ],
    "treatment": [
        # Sinhala
        "ප්‍රතිකාර", "ඖෂධ", "චිකිත්සාව", "බෙහෙත්",
        "ශල්‍යකර්ම", "කෙමෝ", "රේඩියේෂන්", "හමුව",
        # Tamil
        "சிகிச்சை", "மருந்து", "அறுவை", "கீமோ",
        "கதிர்வீச்சு", "சந்திப்பு",
    ],
}


def _keyword_intent_override(text: str) -> str | None:
    lowered = text.lower()
    for intent, keywords in INTENT_KEYWORDS.items():
        if any(kw in lowered for kw in keywords):
            return intent
    return None


class RAGClassifier:
    """
    Multilingual RAG Classifier using DistilBERT + FAISS
    Handles English, Sinhala, Tamil
    """

    def __init__(self):
        print("[RAG] Loading tokenizer...")
        self._tokenizer = AutoTokenizer.from_pretrained(
            str(MODEL_DIR / "neurosight_distilbert")
        )

        print("[RAG] Loading classifier...")
        self._classifier = AutoModelForSequenceClassification.from_pretrained(
            str(MODEL_DIR / "neurosight_distilbert")
        )
        self._classifier.eval()

        print("[RAG] Loading encoder...")
        self._encoder = DistilBertModel.from_pretrained(
            "distilbert-base-multilingual-cased"
        )
        self._encoder.eval()

        print("[RAG] Loading label encoder...")
        self._label_enc = joblib.load(
            MODEL_DIR / "neurosight_distilbert" / "label_encoder.pkl"
        )

        print("[RAG] Loading FAISS index...")
        self._index = faiss.read_index(str(MODEL_DIR / "faiss_index.bin"))

        print("[RAG] Loading QA dataset...")
        self._qa_df = pd.read_csv(MODEL_DIR / "qa_dataset_final.csv")

        self._device = torch.device(
            'cuda' if torch.cuda.is_available() else 'cpu'
        )
        self._classifier = self._classifier.to(self._device)
        self._encoder = self._encoder.to(self._device)

        print(f"[RAG] Ready! Device: {self._device}")

    def _get_embedding(self, text: str) -> np.ndarray:
        inputs = self._tokenizer(
            text,
            return_tensors='pt',
            max_length=128,
            padding='max_length',
            truncation=True
        ).to(self._device)
        with torch.no_grad():
            outputs = self._encoder(**inputs)
        return outputs.last_hidden_state[:, 0, :].cpu().numpy()

    def _predict_intent(self, text: str) -> str:
        inputs = self._tokenizer(
            text,
            return_tensors='pt',
            max_length=128,
            padding='max_length',
            truncation=True
        ).to(self._device)
        with torch.no_grad():
            outputs = self._classifier(**inputs)
        pred = outputs.logits.argmax(dim=-1).item()
        return self._label_enc.inverse_transform([pred])[0]

    def _find_answer(self, question: str, language: str, intent: str) -> str:
        # Use FAISS semantic search when the index aligns with the QA DataFrame
        # (index was built from the same dataset rows in order).
        if self._index.ntotal == len(self._qa_df):
            q_emb = self._get_embedding(question).astype('float32')
            k = min(120, self._index.ntotal)
            _, indices = self._index.search(q_emb, k)

            # Best match: language + intent
            for idx in indices[0]:
                if idx < 0 or idx >= len(self._qa_df):
                    continue
                row = self._qa_df.iloc[int(idx)]
                if row['language'] == language and row['intent'] == intent:
                    return row['answer']

            # Second pass: English fallback with same intent
            for idx in indices[0]:
                if idx < 0 or idx >= len(self._qa_df):
                    continue
                row = self._qa_df.iloc[int(idx)]
                if row['language'] == 'en' and row['intent'] == intent:
                    return row['answer']

        # Exact-filter fallback (used when FAISS index size != DataFrame size)
        target_rows = self._qa_df[
            (self._qa_df['language'] == language) &
            (self._qa_df['intent'] == intent)
        ]
        if len(target_rows) > 0:
            return target_rows.iloc[0]['answer']

        en_rows = self._qa_df[
            (self._qa_df['language'] == 'en') &
            (self._qa_df['intent'] == intent)
        ]
        if len(en_rows) > 0:
            return en_rows.iloc[0]['answer']

        return "Please consult your doctor for more information."

    def answer(self, message: str, context: dict, language: str = "en") -> tuple:
        """
        Returns (reply, intent, is_emergency)
        """
        # Truncate to first sentence or 300 chars to avoid classifying pasted UI text
        message = message.strip()
        for sep in ('\n', '.', '?', '!'):
            idx = message.find(sep)
            if 0 < idx < 300:
                message = message[:idx + 1].strip()
                break
        else:
            message = message[:300]

        # Detect language from the message script (overrides caller's guess)
        detected = _detect_script_language(message)
        if detected != "en":
            language = detected
        print(f"[DEBUG] Language: {language} for message: {message[:60]}")

        # Emergency pre-screen
        if _has_emergency_language(message):
            print(f"[DEBUG] Emergency keyword detected in: {message}")
            reply = EMERGENCY_RESPONSES.get(language, EMERGENCY_RESPONSES["en"])
            return reply, "emergency", True

        # Classify intent directly — multilingual DistilBERT handles Sinhala/Tamil natively
        intent = self._predict_intent(message)
        print(f"[DEBUG] Intent predicted: {intent} for: {message[:60]}")

        # Real emergencies are already caught by the keyword check above.
        # If the classifier says emergency here it is a false positive
        # (model defaulting to emergency for unfamiliar multilingual patterns).
        if intent == "emergency":
            intent = "general"
            print(f"[DEBUG] Classifier emergency overridden → general (no keyword match)")

        # For Sinhala/Tamil, apply keyword override when classifier returns "general"
        # because the model was trained on English and misclassifies non-English intents.
        if language in ("si", "ta") and intent == "general":
            override = _keyword_intent_override(message)
            if override:
                print(f"[DEBUG] Keyword override: general → {override} for: {message[:60]}")
                intent = override

        # Find answer using the classified intent
        base_answer = self._find_answer(message, language, intent=intent)

        # Add patient context
        reply = self._add_context(base_answer, intent, context, language)

        return reply, intent, False

    def _add_context(self, answer: str, intent: str, context: dict, language: str) -> str:
        doctor = context.get("doctor", "")
        diagnosis = context.get("diagnosis", "")
        patient_name = context.get("patient_name", "")

        if language == "en":
            if doctor and intent in ["diagnosis", "treatment", "symptom"]:
                answer += f" Please consult {doctor} for personalized advice."
            if diagnosis and intent == "diagnosis":
                answer += f" Your confirmed diagnosis is {diagnosis}."

        elif language == "si":
            if doctor and intent in ["diagnosis", "treatment", "symptom"]:
                answer += f" පුද්ගලික උපදෙස් සඳහා කරුණාකර වෛද්‍ය {doctor} හමුවන්න."

        elif language == "ta":
            if doctor and intent in ["diagnosis", "treatment", "symptom"]:
                answer += f" தனிப்பட்ட ஆலோசனைக்கு டாக்டர் {doctor} ஐ அணுகவும்."

        return answer


# Singleton
_instance: RAGClassifier | None = None


def get_rag_classifier() -> RAGClassifier | None:
    global _instance
    if _instance is not None:
        return _instance
    required = [
        MODEL_DIR / "neurosight_distilbert" / "model.safetensors",
        MODEL_DIR / "faiss_index.bin",
        MODEL_DIR / "qa_dataset_final.csv",
    ]
    if all(f.exists() for f in required):
        _instance = RAGClassifier()
    return _instance
