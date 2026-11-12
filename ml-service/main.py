import os
import re
import json
from typing import List, Dict, Any, Optional, Union
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import joblib
import numpy as np

app = FastAPI(
    title="HealthX ML Emergency Triage & Safety Service",
    description="Machine Learning service for real-time emergency triage categorization and drug-allergy safety validation.",
    version="1.0.0"
)

# Enable CORS for direct frontend interaction and backend proxies
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Model Loading
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "triage_model.joblib")
METRICS_PATH = os.path.join(BASE_DIR, "metrics.json")

model_artifact = None
if os.path.exists(MODEL_PATH):
    try:
        model_artifact = joblib.load(MODEL_PATH)
        print(f"Loaded trained RandomForest model from {MODEL_PATH}")
    except Exception as e:
        print(f"Error loading model: {e}")

# --- Pydantic Request/Response Models ---

class VitalsInput(BaseModel):
    heartRate: float = Field(..., ge=0, le=300, description="Heart rate in beats per minute (BPM)")
    spo2: float = Field(..., ge=0, le=100, description="Oxygen saturation percentage (%)")
    systolicBP: float = Field(..., ge=0, le=300, description="Systolic blood pressure (mmHg)")
    respiratoryRate: float = Field(..., ge=0, le=80, description="Respiratory rate in breaths per minute")
    consciousness: Union[int, str] = Field(
        ..., 
        description="Consciousness level: 0/'alert', 1/'voice', 2/'pain', 3/'unresponsive'"
    )
    bleeding: Union[int, str] = Field(
        ..., 
        description="Bleeding severity: 0/'none', 1/'moderate', 2/'severe'"
    )

class TriagePredictionResponse(BaseModel):
    triage_tag: str
    confidence: float
    probabilities: Dict[str, float]
    vital_alerts: List[str]
    color_code: str
    priority_level: str
    recommended_action: str

class SafetyCheckInput(BaseModel):
    steps: List[str] = Field(..., description="List of proposed first-aid or emergency triage steps")
    allergies: Union[str, List[str]] = Field(default="", description="Patient allergies")
    medications: Union[str, List[str]] = Field(default="", description="Patient medications")
    conditions: Union[str, List[str]] = Field(default="", description="Patient chronic conditions")

class ConflictDetail(BaseModel):
    severity: str
    trigger_step: str
    conflict_factor: str
    reason: str
    clinical_recommendation: str

class SafetyCheckResponse(BaseModel):
    safe: bool
    conflicts_count: int
    conflicts: List[ConflictDetail]
    notes: List[str]

# --- Helper Normalizers ---

def normalize_consciousness(val: Union[int, str]) -> int:
    if isinstance(val, (int, float)):
        return int(np.clip(val, 0, 3))
    val_str = str(val).lower().strip()
    if 'unresponsive' in val_str or 'coma' in val_str or 'unconscious' in val_str:
        return 3
    if 'pain' in val_str:
        return 2
    if 'voice' in val_str or 'drowsy' in val_str or 'confused' in val_str:
        return 1
    return 0  # Alert

def normalize_bleeding(val: Union[int, str]) -> int:
    if isinstance(val, (int, float)):
        return int(np.clip(val, 0, 2))
    val_str = str(val).lower().strip()
    if 'severe' in val_str or 'arterial' in val_str or 'massive' in val_str:
        return 2
    if 'mod' in val_str:
        return 1
    return 0

def stringify_field(val: Union[str, List[str]]) -> str:
    if isinstance(val, list):
        return " ".join(val).lower()
    return str(val).lower()

# --- Endpoints ---

@app.get("/")
def root():
    return {
        "service": "HealthX ML Triage & Safety Service",
        "status": "online",
        "model_loaded": model_artifact is not None
    }

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "model_loaded": model_artifact is not None,
        "classes": model_artifact['classes'] if model_artifact else []
    }

@app.get("/metrics")
def get_metrics():
    if os.path.exists(METRICS_PATH):
        with open(METRICS_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    raise HTTPException(status_code=404, detail="Metrics file not found. Train model first.")

@app.post("/predict-triage", response_model=TriagePredictionResponse)
def predict_triage(vitals: VitalsInput):
    if not model_artifact:
        raise HTTPException(status_code=500, detail="Model is not loaded. Run train.py first.")

    clf = model_artifact['model']
    classes = model_artifact['classes']

    c_num = normalize_consciousness(vitals.consciousness)
    b_num = normalize_bleeding(vitals.bleeding)

    features = np.array([[
        vitals.heartRate,
        vitals.spo2,
        vitals.systolicBP,
        vitals.respiratoryRate,
        c_num,
        b_num
    ]])

    pred_tag = clf.predict(features)[0]
    probs = clf.predict_proba(features)[0]
    prob_dict = {cls_name: round(float(prob), 4) for cls_name, prob in zip(classes, probs)}
    confidence = round(float(np.max(probs)), 4)

    # Clinical Vital Alerts
    alerts = []
    if vitals.spo2 < 85:
        alerts.append(f"Critical Hypoxemia (SpO2 {vitals.spo2}%)")
    elif vitals.spo2 < 92:
        alerts.append(f"Moderate Hypoxemia (SpO2 {vitals.spo2}%)")

    if vitals.systolicBP < 80 and vitals.systolicBP > 0:
        alerts.append(f"Severe Hypotension / Shock (BP {vitals.systolicBP} mmHg)")
    elif vitals.systolicBP > 180:
        alerts.append(f"Hypertensive Crisis (BP {vitals.systolicBP} mmHg)")

    if vitals.heartRate > 130:
        alerts.append(f"Severe Tachycardia (HR {vitals.heartRate} bpm)")
    elif vitals.heartRate < 45 and vitals.heartRate > 0:
        alerts.append(f"Severe Bradycardia (HR {vitals.heartRate} bpm)")

    if vitals.respiratoryRate > 32:
        alerts.append(f"Severe Tachypnea (RR {vitals.respiratoryRate}/min)")
    elif vitals.respiratoryRate < 8 and vitals.respiratoryRate > 0:
        alerts.append(f"Bradypnea / Respiratory Failure (RR {vitals.respiratoryRate}/min)")

    if c_num >= 2:
        alerts.append("Severely Altered Consciousness (Responds only to pain or unresponsive)")

    if b_num == 2:
        alerts.append("Uncontrolled Massive External Bleeding")

    meta_lookup = {
        'RED': {
            'color': '#ef4444',
            'priority': 'Priority 1 (Immediate / Resuscitation)',
            'action': 'Immediate life-saving intervention required. Secure airway, control hemorrhage, call ALS ambulance now.'
        },
        'YELLOW': {
            'color': '#f59e0b',
            'priority': 'Priority 2 (Delayed / Urgent)',
            'action': 'Serious medical condition requiring urgent physician evaluation. Re-assess vitals every 10-15 minutes.'
        },
        'GREEN': {
            'color': '#10b981',
            'priority': 'Priority 3 (Minor / Ambulatory)',
            'action': 'Non-urgent stable vitals. Provide standard supportive first aid and routine care.'
        },
        'BLACK': {
            'color': '#1f2937',
            'priority': 'Priority 0 (Expectant / Deceased)',
            'action': 'No signs of life, agonal breathing, or catastrophic fatal injuries. Provide palliative care if comfort indicated.'
        }
    }

    meta = meta_lookup.get(pred_tag, meta_lookup['YELLOW'])

    return TriagePredictionResponse(
        triage_tag=pred_tag,
        confidence=confidence,
        probabilities=prob_dict,
        vital_alerts=alerts,
        color_code=meta['color'],
        priority_level=meta['priority'],
        recommended_action=meta['action']
    )

@app.post("/check-safety", response_model=SafetyCheckResponse)
def check_safety(payload: SafetyCheckInput):
    allergies_text = stringify_field(payload.allergies)
    meds_text = stringify_field(payload.medications)
    conditions_text = stringify_field(payload.conditions)

    conflicts: List[ConflictDetail] = []
    notes: List[str] = []

    # Blood Thinner medication triggers
    blood_thinners = [
        'warfarin', 'coumadin', 'eliquis', 'apixaban', 'xarelto', 'rivaroxaban',
        'heparin', 'plavix', 'clopidogrel', 'pradaxa', 'dabigatran', 'brilinta',
        'ticagrelor', 'blood thinner', 'anticoagulant', 'antiplatelet'
    ]
    has_blood_thinner = any(bt in meds_text for bt in blood_thinners)

    # NSAID & Aspirin allergy triggers
    nsaid_allergies = ['nsaid', 'aspirin', 'ibuprofen', 'advil', 'motrin', 'naproxen', 'aleve', 'salicylate']
    has_nsaid_allergy = any(na in allergies_text for na in nsaid_allergies)

    # Bleeding condition triggers
    has_bleeding_disorder = any(bc in conditions_text for bc in ['hemophilia', 'bleeding', 'ulcer', 'von willebrand', 'thrombocytopenia'])

    for step in payload.steps:
        step_lower = step.lower()

        # 1. Aspirin & NSAID Contraindication Checks
        if any(term in step_lower for term in ['aspirin', 'ibuprofen', 'nsaid', 'advil', 'motrin', 'naproxen']):
            # Conflict with allergy
            if has_nsaid_allergy:
                conflicts.append(ConflictDetail(
                    severity="CRITICAL",
                    trigger_step=step,
                    conflict_factor=f"Allergy match in: '{payload.allergies}'",
                    reason="Patient has a documented allergy to Aspirin/NSAIDs.",
                    clinical_recommendation="DO NOT administer Aspirin or NSAIDs. Risk of severe anaphylaxis, angioedema, and bronchospasm. Use non-NSAID alternatives (e.g. Acetaminophen/Paracetamol) if indicated."
                ))
            # Conflict with blood thinners
            if has_blood_thinner:
                conflicts.append(ConflictDetail(
                    severity="CRITICAL",
                    trigger_step=step,
                    conflict_factor=f"Active Anticoagulant medication: '{payload.medications}'",
                    reason="Patient is on active blood thinner / anticoagulant medication.",
                    clinical_recommendation="DO NOT give Aspirin/NSAIDs. Extreme risk of life-threatening gastrointestinal hemorrhage or internal cerebral bleeding."
                ))
            # Conflict with ulcer/bleeding disorder
            if has_bleeding_disorder:
                conflicts.append(ConflictDetail(
                    severity="WARNING",
                    trigger_step=step,
                    conflict_factor=f"Underlying condition: '{payload.conditions}'",
                    reason="Patient has active ulcers or a known bleeding diathesis.",
                    clinical_recommendation="Avoid platelet-inhibiting NSAIDs to prevent acute bleeding exacerbation."
                ))

        # 2. Oral administration / choking risk in seizures or unconsciousness
        if any(term in step_lower for term in ['drink', 'water', 'swallow', 'candy', 'sugary drink', 'juice', 'oral']):
            if any(cond in conditions_text for cond in ['epilepsy', 'seizure', 'convulsion']):
                conflicts.append(ConflictDetail(
                    severity="CRITICAL",
                    trigger_step=step,
                    conflict_factor="Patient has Epilepsy / Seizure history",
                    reason="Oral fluids or solid food given during an altered mental state poses high aspiration risk.",
                    clinical_recommendation="Never administer oral liquids or food during or immediately following a seizure. Keep airway clear and place patient in recovery position."
                ))

        # 3. Restraint / Object in Mouth during Seizures
        if any(term in step_lower for term in ['restrain', 'hold down', 'mouth', 'bite block', 'spoon']):
            if any(cond in conditions_text for cond in ['epilepsy', 'seizure']):
                conflicts.append(ConflictDetail(
                    severity="CRITICAL",
                    trigger_step=step,
                    conflict_factor="Dangerous First-Aid Practice for Seizures",
                    reason="Physical restraint during tonic-clonic convulsions can cause bone fractures, joint dislocation, and airway occlusion.",
                    clinical_recommendation="Do NOT restrain the patient. Do NOT insert any objects into their mouth. Protect head with soft padding and time the seizure."
                ))

        # 4. Epinephrine / EpiPen verification
        if 'epipen' in step_lower or 'epinephrine' in step_lower:
            if not any(a in allergies_text for a in ['peanut', 'anaphylaxis', 'bee', 'wasp', 'nut', 'severe']):
                notes.append("Epinephrine auto-injector mentioned: Ensure signs of true anaphylaxis (stridor, hives, hypotension, dyspnea) are present prior to injection.")

        # 5. Penicillin / Antibiotics
        if any(term in step_lower for term in ['penicillin', 'amoxicillin', 'augmentin']):
            if 'penicillin' in allergies_text:
                conflicts.append(ConflictDetail(
                    severity="CRITICAL",
                    trigger_step=step,
                    conflict_factor="Penicillin allergy documented",
                    reason="Patient has a documented Penicillin allergy.",
                    clinical_recommendation="Withhold beta-lactam antibiotics. Immediate anaphylaxis precaution."
                ))

    is_safe = len(conflicts) == 0

    if is_safe:
        notes.append("No active contraindications or drug-allergy interactions detected between patient profile and first-aid instructions.")

    return SafetyCheckResponse(
        safe=is_safe,
        conflicts_count=len(conflicts),
        conflicts=conflicts,
        notes=notes
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
