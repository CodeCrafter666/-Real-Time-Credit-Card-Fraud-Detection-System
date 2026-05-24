"""
model.py — Fraud Prediction Layer v4
=======================================
REMOVED: predict() — was only used by the random live-feed WebSocket (now gone).

KEPT:
  predict_manual(request)  → /analyze-transaction  (manual form)
  predict_row(row)         → /analyze-dataset      (Excel/CSV upload)

Both functions share the same underlying ML model and fallback dummy logic.
"""

import os
import random
import numpy as np


# ─────────────────────────────────────────────────────────────────────────────
# Load trained model artifacts once at startup
# ─────────────────────────────────────────────────────────────────────────────

MODEL_PATH  = os.path.join(os.path.dirname(__file__), "ml_artifacts", "fraud_model.pkl")
SCALER_PATH = os.path.join(os.path.dirname(__file__), "ml_artifacts", "scaler.pkl")

_model    = None
_scaler   = None
_using_ml = False

try:
    import joblib
    if os.path.exists(MODEL_PATH) and os.path.exists(SCALER_PATH):
        _model    = joblib.load(MODEL_PATH)
        _scaler   = joblib.load(SCALER_PATH)
        _using_ml = True
        print("✅ [model.py] Loaded trained ML model from ml_artifacts/")
    else:
        print("⚠️  [model.py] No model.pkl found — using rule-based prediction.")
        print("    Run: python train_model.py  to train and save the model.")
except ImportError:
    print("⚠️  [model.py] joblib not installed — using rule-based prediction.")


# ─────────────────────────────────────────────────────────────────────────────
# Reference data
# ─────────────────────────────────────────────────────────────────────────────

_LOCATIONS = [
    "Mumbai, MH", "Delhi, DL", "Bangalore, KA", "Chennai, TN",
    "Kolkata, WB", "Hyderabad, TS", "Pune, MH", "Ahmedabad, GJ",
    "Jaipur, RJ", "Lucknow, UP", "Chandigarh, CH", "Kochi, KL",
    "Indore, MP", "Bhopal, MP", "Nagpur, MH",
]

_HIGH_RISK_CATEGORIES   = {"Electronics", "Travel", "Cryptocurrency", "Wire Transfer", "Jewelry"}
_MEDIUM_RISK_CATEGORIES = {"Entertainment", "Online Shopping", "Gaming"}

_RISK_THRESHOLDS = [(0.25, "Low"), (0.50, "Medium"), (0.75, "High"), (1.01, "Critical")]


# ─────────────────────────────────────────────────────────────────────────────
# Shared helpers
# ─────────────────────────────────────────────────────────────────────────────

def _parse_hour(time_str: str) -> int:
    """Extracts hour (0–23) from HH:MM:SS, HH:MM, or YYYY-MM-DD HH:MM:SS strings."""
    try:
        part = str(time_str).strip()
        if " " in part:
            part = part.split(" ")[1]
        return int(part.split(":")[0])
    except Exception:
        return 12


def _encode_location(location: str) -> float:
    loc = str(location).strip()
    return float(_LOCATIONS.index(loc)) if loc in _LOCATIONS else 7.0


def _get_risk_level(prob: float) -> str:
    for threshold, label in _RISK_THRESHOLDS:
        if prob < threshold:
            return label
    return "Critical"


def _get_recommendation(status: str, risk_level: str) -> str:
    if status == "fraud":
        if risk_level == "Critical":
            return "Block transaction immediately and contact cardholder."
        elif risk_level == "High":
            return "Flag for manual review and send cardholder alert."
        return "Monitor closely. Consider secondary verification."
    return "Transaction appears safe. Monitor for patterns." if risk_level == "Medium" \
           else "Transaction cleared. No action required."


# ─────────────────────────────────────────────────────────────────────────────
# Feature builders — produce the 5-feature vector the model was trained on
# Order: [amount, amount_sqrt, hour, location_id, is_night]
# ─────────────────────────────────────────────────────────────────────────────

def _features_from_manual(request) -> np.ndarray:
    amount      = float(request.amount)
    hour        = _parse_hour(str(request.time))
    location_id = _encode_location(str(request.location))
    amount_sqrt = float(np.sqrt(amount))
    is_night    = 1.0 if (hour <= 5 or hour >= 22) else 0.0
    return np.array([[amount, amount_sqrt, hour, location_id, is_night]])


def _features_from_row(row) -> np.ndarray:
    amount      = float(row.get("amount", 0))
    hour        = _parse_hour(str(row.get("timestamp", "12:00:00")))
    location_id = _encode_location(str(row.get("location", "")))
    amount_sqrt = float(np.sqrt(max(amount, 0)))
    is_night    = 1.0 if (hour <= 5 or hour >= 22) else 0.0
    return np.array([[amount, amount_sqrt, hour, location_id, is_night]])


# ─────────────────────────────────────────────────────────────────────────────
# Rule-based fallback — deterministic, no randomness
# Used when ml_artifacts/ does not exist yet.
# ─────────────────────────────────────────────────────────────────────────────

def _rule_based_prob(
    amount: float,
    hour: int,
    is_intl: bool = False,
    category: str = "",
    prev_fraud: int = 0,
) -> float:
    """
    Deterministic rule-based scoring — NOT random.
    Produces consistent results for the same input every time.
    """
    # Base score from amount
    if amount > 150_000:
        prob = 0.82
    elif amount > 100_000:
        prob = 0.68
    elif amount > 50_000:
        prob = 0.45
    elif amount > 20_000:
        prob = 0.28
    else:
        prob = 0.12

    # Boost for risk signals
    if hour <= 5 or hour >= 22:
        prob = min(prob + 0.18, 0.97)
    if is_intl:
        prob = min(prob + 0.10, 0.97)
    if category in _HIGH_RISK_CATEGORIES:
        prob = min(prob + 0.15, 0.97)
    elif category in _MEDIUM_RISK_CATEGORIES:
        prob = min(prob + 0.06, 0.97)
    if prev_fraud:
        prob = min(prob + 0.12, 0.97)

    return round(prob, 4)


# ─────────────────────────────────────────────────────────────────────────────
# Core prediction runner
# ─────────────────────────────────────────────────────────────────────────────

def _run_prediction(
    features: np.ndarray,
    boost: float = 0.0,
    amount: float = 0,
    hour: int = 12,
    is_intl: bool = False,
    category: str = "",
    prev_fraud: int = 0,
) -> tuple:
    """
    Runs ML model if available, otherwise rule-based scoring.
    Returns (status, probability).
    """
    if _using_ml:
        try:
            scaled = _scaler.transform(features[:, :5])
            prob   = round(float(_model.predict_proba(scaled)[0][1]), 4)
            prob   = round(min(prob + boost, 0.99), 4)
        except Exception as e:
            print(f"⚠️  ML prediction error ({e}), using rule-based fallback.")
            prob = _rule_based_prob(amount, hour, is_intl, category, prev_fraud)
    else:
        prob = _rule_based_prob(amount, hour, is_intl, category, prev_fraud)

    return ("fraud" if prob > 0.50 else "safe"), prob


# ─────────────────────────────────────────────────────────────────────────────
# Public: predict_manual() — called by POST /analyze-transaction
# ─────────────────────────────────────────────────────────────────────────────

def predict_manual(request) -> dict:
    """
    Runs fraud prediction on a manually entered transaction.
    Returns full explanation: status, probability, risk_level, factors, recommendation.
    """
    amount   = float(request.amount)
    hour     = _parse_hour(str(request.time))
    is_intl  = bool(request.is_international)
    category = str(request.merchant_category)
    features = _features_from_manual(request)

    boost = 0.0
    if is_intl:                          boost += 0.05
    if category in _HIGH_RISK_CATEGORIES: boost += 0.07

    status, prob = _run_prediction(
        features, boost=boost,
        amount=amount, hour=hour, is_intl=is_intl, category=category,
    )
    risk_level = _get_risk_level(prob)

    # Human-readable risk factors for UI display
    factors = []
    if amount > 100_000:
        factors.append(f"Very high transaction amount (₹{amount:,.0f})")
    elif amount > 50_000:
        factors.append(f"High transaction amount (₹{amount:,.0f})")
    if hour <= 5 or hour >= 22:
        factors.append(f"Transaction at unusual hour ({hour:02d}:00 — late night / early morning)")
    if is_intl:
        factors.append("International transaction — cross-border risk")
    if category in _HIGH_RISK_CATEGORIES:
        factors.append(f"High-risk merchant category: {category}")
    elif category in _MEDIUM_RISK_CATEGORIES:
        factors.append(f"Medium-risk merchant category: {category}")
    device = str(request.device_type)
    if device in ("Unknown", "Virtual Card"):
        factors.append(f"Unusual device type: {device}")
    if not factors:
        factors.append("No significant risk factors detected")

    return {
        "status":            status,
        "fraud_probability": prob,
        "risk_level":        risk_level,
        "risk_factors":      factors,
        "recommendation":    _get_recommendation(status, risk_level),
        "model_used":        "Random Forest (ML)" if _using_ml else "Rule-Based",
    }


# ─────────────────────────────────────────────────────────────────────────────
# Public: predict_row() — called by POST /analyze-dataset for each Excel row
# ─────────────────────────────────────────────────────────────────────────────

def predict_row(row) -> dict:
    """
    Runs fraud prediction on one row from an uploaded Excel/CSV DataFrame.
    Reads all available columns for richer feature signals than a manual entry.
    Returns a Transaction dict compatible with the frontend dashboard.
    """
    import uuid as _uuid

    amount     = float(row.get("amount", 0))
    hour       = _parse_hour(str(row.get("timestamp", "12:00:00")))
    is_intl    = str(row.get("international", "No")).strip().lower() in ("yes", "true", "1")
    category   = str(row.get("merchant_category", "")).strip()
    prev_fraud = int(float(str(row.get("previous_fraud_flag", 0) or 0)))
    features   = _features_from_row(row)

    boost = 0.0
    if is_intl:                          boost += 0.05
    if category in _HIGH_RISK_CATEGORIES: boost += 0.07
    if prev_fraud:                        boost += 0.08

    status, prob = _run_prediction(
        features, boost=boost,
        amount=amount, hour=hour, is_intl=is_intl,
        category=category, prev_fraud=prev_fraud,
    )
    risk_level = _get_risk_level(prob)

    # Preserve original transaction_id from file or generate one
    txn_id = str(row.get("transaction_id", "")).strip() or \
             f"TXN{_uuid.uuid4().hex[:8].upper()}"

    # Extract HH:MM:SS from full timestamp
    timestamp = str(row.get("timestamp", ""))
    time_part = (timestamp.split(" ")[1] if " " in timestamp else timestamp)[:8] or "00:00:00"

    return {
        "id":                txn_id,
        "amount":            amount,
        "location":          str(row.get("location", "Unknown")),
        "time":              time_part,
        "status":            status,
        "fraud_probability": prob,
        "risk_level":        risk_level,
        "merchant_category": category,
        "device_type":       str(row.get("device_type", "")),
        "is_international":  is_intl,
        "source":            "upload",
    }
