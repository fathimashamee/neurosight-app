"""
NeuroSight Chatbot - Intent Classifier (Inference Module)

Loads trained TF-IDF + SVM weights and classifies patient questions
into one of 6 intents, then generates a context-aware response.

Usage:
    from backend.chatbot.classifier import ChatbotClassifier
    bot = ChatbotClassifier()
    reply, topic, emergency = bot.answer(message, patient_context)
"""

import re
from pathlib import Path

import joblib

MODEL_DIR = Path(__file__).resolve().parent / "model"

EMERGENCY_TERMS = [
    "seizure", "cannot breathe", "can't breathe", "cant breathe",
    "collapsed", "collapse", "unconscious", "1990", "call 1990",
    "severe chest pain", "ambulance", "dying", "emergency room",
    "lost consciousness", "paralysis", "stroke", "choking",
]


def _has_emergency_language(text: str) -> bool:
    lowered = text.lower()
    return any(term in lowered for term in EMERGENCY_TERMS)


def _safe_join(values, sep=" "):
    parts = [str(v).strip() for v in values if v and str(v).strip()]
    return sep.join(parts)


class ChatbotClassifier:
    """
    Brain tumour patient intent classifier.
    Loads model weights from backend/chatbot/model/ at startup.
    """

    def __init__(self):
        self._vectorizer  = joblib.load(MODEL_DIR / "vectorizer.pkl")
        self._classifier  = joblib.load(MODEL_DIR / "intent_model.pkl")
        self._label_enc   = joblib.load(MODEL_DIR / "label_encoder.pkl")

    def predict_intent(self, message: str) -> str:
        cleaned = message.lower().strip()
        vec     = self._vectorizer.transform([cleaned])
        encoded = self._classifier.predict(vec)[0]
        return self._label_enc.inverse_transform([encoded])[0]

    def answer(self, message: str, context: dict) -> tuple[str, str, bool]:
        """
        Returns (reply, topic, is_emergency).

        context keys (from _patient_context in mobile.py):
            patient_name, hospital_id, diagnosis, doctor,
            plan_summary, latest_scan, checkin_info, latest_checkin
        """
        # Fast emergency pre-screen — no model call needed
        if _has_emergency_language(message):
            return (
                "This sounds urgent. Please call 1990 now or go to the "
                "nearest hospital emergency room immediately.",
                "emergency",
                True,
            )

        intent = self.predict_intent(message)
        reply  = self._build_reply(intent, context, message)
        emergency = intent == "emergency"
        return reply, intent, emergency

    # ── Response builders ────────────────────────────────────────────────────

    def _build_reply(self, intent: str, context: dict, message: str) -> str:
        builders = {
            "emergency":  self._reply_emergency,
            "diagnosis":  self._reply_diagnosis,
            "treatment":  self._reply_treatment,
            "nutrition":  self._reply_nutrition,
            "symptom":    self._reply_symptom,
            "general":    self._reply_general,
        }
        builder = builders.get(intent, self._reply_general)
        return builder(context, message)

    def _reply_emergency(self, context: dict, message: str) -> str:
        return (
            "This sounds like a medical emergency. "
            "Please call 1990 now or go to your nearest hospital immediately. "
            "Do not wait — contact your care team right away."
        )

    def _reply_diagnosis(self, context: dict, message: str) -> str:
        diagnosis   = context.get("diagnosis") or "Not classified yet"
        doctor      = context.get("doctor")
        plan        = context.get("plan_summary")
        latest_scan = context.get("latest_scan")

        parts = [f"Based on your record, your diagnosis is: {diagnosis}."]
        if latest_scan:
            parts.append(f"Your latest scan result: {latest_scan}.")
        if plan and plan != "No treatment plan is recorded yet.":
            parts.append(f"Your current treatment plan: {plan}.")
        parts.append(
            f"Please ask {doctor if doctor else 'your doctor'} "
            "to explain what this means for your specific situation."
        )
        return " ".join(parts)

    def _reply_treatment(self, context: dict, message: str) -> str:
        plan   = context.get("plan_summary")
        doctor = context.get("doctor")

        parts = []
        if plan and plan != "No treatment plan is recorded yet.":
            parts.append(f"Your current treatment plan is: {plan}.")
        else:
            parts.append("No treatment plan has been recorded yet in your file.")

        parts.append(
            "Common side effects of brain tumour treatment include fatigue, nausea, and hair loss — "
            "these vary by treatment type."
        )
        parts.append(
            f"Always consult {'Dr. ' + doctor if doctor else 'your doctor'} "
            "before making any changes to your medications or treatment."
        )
        return " ".join(parts)

    def _reply_nutrition(self, context: dict, message: str) -> str:
        return (
            "Small, frequent meals with soft foods are often easier when appetite is low. "
            "Focus on protein-rich foods like eggs, fish, and lentils to help maintain strength. "
            "Avoid spicy or greasy foods if you feel nauseous, and drink plenty of water. "
            "Please consult your doctor or a dietitian for a plan tailored to your treatment."
        )

    def _reply_symptom(self, context: dict, message: str) -> str:
        checkin  = context.get("checkin_info")
        doctor   = context.get("doctor")
        diagnosis = context.get("diagnosis") or "your condition"

        parts = [
            f"Symptoms like these can be related to {diagnosis} or its treatment."
        ]
        if checkin:
            parts.append(f"Your latest check-in recorded: {checkin}.")
        parts.append(
            "If this symptom is new, worsening, or worrying you, please report it to "
            f"{'Dr. ' + doctor if doctor else 'your care team'} as soon as possible."
        )
        parts.append(
            "Call 1990 or go to emergency immediately if symptoms become severe or sudden."
        )
        return " ".join(parts)

    def _reply_general(self, context: dict, message: str) -> str:
        doctor      = context.get("doctor")
        diagnosis   = context.get("diagnosis") or "Not classified"
        plan        = context.get("plan_summary")

        parts = [
            f"Your current diagnosis is {diagnosis}."
        ]
        if plan and plan != "No treatment plan is recorded yet.":
            parts.append(f"Your treatment plan: {plan}.")
        if doctor:
            parts.append(f"Your assigned doctor is Dr. {doctor}.")
        parts.append(
            "For specific questions about your care, please contact your care team directly "
            "or check with your doctor at your next appointment."
        )
        return " ".join(parts)


# Module-level singleton — loaded once when the backend starts
_instance: ChatbotClassifier | None = None


def get_classifier() -> ChatbotClassifier | None:
    """
    Returns the singleton classifier.
    Returns None if model weights are not found (not yet trained).
    """
    global _instance
    if _instance is not None:
        return _instance
    weights = [
        MODEL_DIR / "vectorizer.pkl",
        MODEL_DIR / "intent_model.pkl",
        MODEL_DIR / "label_encoder.pkl",
    ]
    if all(w.exists() for w in weights):
        _instance = ChatbotClassifier()
    return _instance
