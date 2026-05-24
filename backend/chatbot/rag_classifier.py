"""
NeuroSight RAG Classifier
Multilingual DistilBERT + FAISS for intent classification
and answer retrieval in English, Sinhala, Tamil
"""

import re
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

        diagnosis = context.get("diagnosis", "")
        plan_summary = context.get("plan_summary", "")
        checkin_info = context.get("checkin_info", "")

        # Replace the QA dataset's generic "brain tumor/tumour" placeholder with
        # the patient's actual diagnosis so every response is specific.
        if diagnosis and "no tumour" not in diagnosis.lower():
            base_answer = re.sub(
                r'brain\s+tum(?:o|ou)r',
                diagnosis,
                base_answer,
                flags=re.IGNORECASE,
            )

        # QA dataset only has tumour-positive "diagnosis" answers.
        # Override with a reassuring No Tumour response when appropriate.
        if intent == "diagnosis" and "no tumour" in diagnosis.lower():
            no_tumour_answers = {
                "en": "Your MRI scan shows no brain tumour, which is very reassuring. Any symptoms you are experiencing may have other causes that your doctor will evaluate and address.",
                "ta": "உங்கள் MRI ஸ்கேன் மூளை கட்டி இல்லை என்று காட்டுகிறது, இது மிகவும் ஆறுதலான செய்தி. நீங்கள் அனுபவிக்கும் அறிகுறிகளுக்கு வேறு காரணங்கள் இருக்கலாம்; உங்கள் மருத்துவர் அவற்றை மதிப்பீடு செய்வார்.",
                "si": "ඔබේ MRI ස්කෑන් මොළේ ගෙඩියක් නොමැති බව දක්වයි. මෙය ඉතා ශුභදායක ප්‍රවෘත්තිය. ඔබ අත්විඳින රෝග ලක්ෂණවලට වෙනත් හේතු ද ඇති විය හැකිය; ඔබේ වෛද්‍යවරයා ඒවා ඇගයීමට ලක් කරනු ඇත.",
            }
            base_answer = no_tumour_answers.get(language, no_tumour_answers["en"])

        # QA dataset answers for "treatment" are generic. When the patient has
        # a recorded plan, prepend it so the reply is actually personalised.
        elif intent == "treatment" and plan_summary and plan_summary != "No treatment plan is recorded yet.":
            base_answer = f"Your current treatment plan is: {plan_summary}. {base_answer}"

        # For symptom intent, surface the latest check-in data if available.
        if intent == "symptom" and checkin_info:
            base_answer += f" Your latest check-in recorded: {checkin_info}."

        # Add patient context
        reply = self._add_context(base_answer, intent, context, language)

        return reply, intent, False

    def _add_context(self, answer: str, intent: str, context: dict, language: str) -> str:
        doctor      = context.get("doctor", "")
        diagnosis   = context.get("diagnosis", "")
        plan        = context.get("plan_summary", "")
        latest_scan = context.get("latest_scan", "")

        is_no_tumour = "no tumour" in diagnosis.lower() if diagnosis else False
        has_plan     = bool(plan and plan != "No treatment plan is recorded yet.")
        dr = doctor if doctor and re.match(r'^[Dd]r\.?\s+', doctor.strip()) else (f"Dr. {doctor}" if doctor else "your doctor")

        if language == "en":
            if intent == "diagnosis":
                if latest_scan:
                    answer += f" Your latest scan result: {latest_scan}."
                if has_plan:
                    answer += f" Your current treatment plan: {plan}."
                if diagnosis:
                    if is_no_tumour:
                        answer += " Your scan results confirm No Tumour — this is good news."
                    else:
                        answer += f" Your confirmed diagnosis is {diagnosis}."
                answer += f" Please ask {dr} to explain what this means for your specific situation."

            elif intent == "treatment":
                # plan_summary is already prepended in answer(); add the doctor sign-off
                answer += f" Always consult {dr} before making any changes to your medications or treatment."

            elif intent == "symptom":
                if diagnosis:
                    answer += f" These symptoms may be related to {diagnosis} or its treatment."
                answer += f" Report any new or worsening symptoms to {dr} as soon as possible."

            elif intent == "general":
                if diagnosis:
                    answer += f" Your current diagnosis is {diagnosis}."
                if has_plan:
                    answer += f" Your treatment plan: {plan}."
                answer += f" For specific questions, contact your care team or {dr} directly."

            elif intent == "nutrition":
                answer += f" Please consult {dr} or a dietitian for a nutrition plan tailored to your specific treatment."

        elif language == "si":
            if intent == "diagnosis":
                if latest_scan:
                    answer += f" ඔබේ නවතම ස්කෑන් ප්‍රතිඵලය: {latest_scan}."
                if has_plan:
                    answer += f" ඔබේ ප්‍රතිකාර සැලැස්ම: {plan}."
                if diagnosis:
                    if is_no_tumour:
                        answer += " ඔබේ ස්කෑන් ප්‍රතිඵල ගෙඩියක් නොමැති බව පෙන්වයි — මෙය සුභ ප්‍රවෘත්තිය."
                    else:
                        answer += f" ඔබේ රෝග විනිශ්චය: {diagnosis}."
                if doctor:
                    answer += f" පුද්ගලික උපදෙස් සඳහා කරුණාකර වෛද්‍ය {doctor} හමුවන්න."

            elif intent == "treatment":
                if doctor:
                    answer += f" ඔබේ ඖෂධ හෝ ප්‍රතිකාර වෙනස් කිරීමට පෙර සෑම විටම වෛද්‍ය {doctor} හමුවන්න."

            elif intent == "symptom":
                if diagnosis:
                    answer += f" මෙම රෝග ලක්ෂණ {diagnosis} හෝ එහි ප්‍රතිකාරය සමඟ සම්බන්ධ විය හැකිය."
                if doctor:
                    answer += f" නව හෝ වැඩිවන රෝග ලක්ෂණ ගැන වෛද්‍ය {doctor} ට දන්වන්න."

            elif intent == "general":
                if diagnosis:
                    answer += f" ඔබේ වත්මන් රෝග විනිශ්චය: {diagnosis}."
                if has_plan:
                    answer += f" ඔබේ ප්‍රතිකාර සැලැස්ම: {plan}."
                if doctor:
                    answer += f" ඔබේ වෛද්‍යවරයා: {doctor}."

            elif intent == "nutrition":
                if doctor:
                    answer += f" ඔබේ ප්‍රතිකාරයට ගැළපෙන පෝෂණ සැලැස්මක් සඳහා වෛද්‍ය {doctor} හෝ ආහාරවේදියෙකු හමුවන්න."

        elif language == "ta":
            if intent == "diagnosis":
                if latest_scan:
                    answer += f" உங்கள் சமீபத்திய ஸ்கேன் முடிவு: {latest_scan}."
                if has_plan:
                    answer += f" உங்கள் தற்போதைய சிகிச்சை திட்டம்: {plan}."
                if diagnosis:
                    if is_no_tumour:
                        answer += " உங்கள் ஸ்கேன் முடிவுகள் கட்டி இல்லை என்று உறுதிப்படுத்துகின்றன — இது நல்ல செய்தி."
                    else:
                        answer += f" உங்கள் நோயறிதல்: {diagnosis}."
                if doctor:
                    answer += f" தனிப்பட்ட ஆலோசனைக்கு டாக்டர் {doctor} ஐ அணுகவும்."

            elif intent == "treatment":
                if doctor:
                    answer += f" உங்கள் மருந்துகள் அல்லது சிகிச்சையில் மாற்றம் செய்வதற்கு முன் டாக்டர் {doctor} ஐ அணுகவும்."

            elif intent == "symptom":
                if diagnosis:
                    answer += f" இந்த அறிகுறிகள் {diagnosis} அல்லது அதன் சிகிச்சையுடன் தொடர்புடையதாக இருக்கலாம்."
                if doctor:
                    answer += f" புதிய அல்லது மோசமாகும் அறிகுறிகளை டாக்டர் {doctor} க்கு தெரிவிக்கவும்."

            elif intent == "general":
                if diagnosis:
                    answer += f" உங்கள் தற்போதைய நோயறிதல்: {diagnosis}."
                if has_plan:
                    answer += f" உங்கள் சிகிச்சை திட்டம்: {plan}."
                if doctor:
                    answer += f" உங்கள் மருத்துவர்: {doctor}. குறிப்பிட்ட கேள்விகளுக்கு நேரடியாக தொடர்பு கொள்ளவும்."

            elif intent == "nutrition":
                if doctor:
                    answer += f" உங்கள் சிகிச்சைக்கு ஏற்ற உணவு திட்டத்திற்கு டாக்டர் {doctor} அல்லது உணவியல் நிபுணரை அணுகவும்."

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
