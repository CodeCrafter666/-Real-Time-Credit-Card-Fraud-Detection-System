"""
train_model.py — ML Training Script for Credit Card Fraud Detection
====================================================================
Run this ONCE to train the model and save it as model.pkl.

What this script does:
  1. Generates a realistic synthetic dataset (mimics real fraud patterns)
  2. Engineers features from transaction data
  3. Handles class imbalance using SMOTE
  4. Trains a Random Forest classifier
  5. Evaluates using Precision, Recall, F1-score
  6. Saves model + scaler to ml_artifacts/

Usage:
  python train_model.py

Output:
  ml_artifacts/fraud_model.pkl   ← trained Random Forest
  ml_artifacts/scaler.pkl        ← fitted StandardScaler
"""

import os
import numpy as np
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score

# imbalanced-learn for SMOTE
try:
    from imblearn.over_sampling import SMOTE
    SMOTE_AVAILABLE = True
except ImportError:
    print("WARNING: imbalanced-learn not installed. Skipping SMOTE.")
    print("Install with: pip install imbalanced-learn")
    SMOTE_AVAILABLE = False


# ─────────────────────────────────────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────────────────────────────────────

OUTPUT_DIR = "ml_artifacts"
MODEL_PATH = os.path.join(OUTPUT_DIR, "fraud_model.pkl")
SCALER_PATH = os.path.join(OUTPUT_DIR, "scaler.pkl")

TOTAL_SAMPLES = 10_000   # total transactions to simulate
FRAUD_RATE = 0.15        # 15% fraud — matches our frontend demo rate
RANDOM_STATE = 42


# ─────────────────────────────────────────────────────────────────────────────
# STEP 1: Generate synthetic dataset
# ─────────────────────────────────────────────────────────────────────────────

def generate_dataset(n_samples: int, fraud_rate: float):
    """
    Generates a realistic synthetic fraud dataset.

    Fraud patterns built into the simulation:
      - Fraud transactions are more likely at night (hours 0–5)
      - Fraud transactions tend to have higher amounts
      - Certain locations have higher fraud rates (simulated via location_id)

    Returns:
      X: numpy array of shape (n_samples, 4)  — features
      y: numpy array of shape (n_samples,)    — labels (0=safe, 1=fraud)
    """
    print(f"\n[1/5] Generating {n_samples} synthetic transactions ({fraud_rate*100:.0f}% fraud)...")

    n_fraud = int(n_samples * fraud_rate)
    n_safe = n_samples - n_fraud

    # ── Safe transactions ─────────────────────────────────────────────────
    # Mostly daytime, lower amounts, spread across all cities
    safe_amounts   = np.random.exponential(scale=5000, size=n_safe).clip(100, 50000)
    safe_hours     = np.random.choice(range(6, 23), size=n_safe)   # daytime
    safe_locations = np.random.randint(0, 15, size=n_safe)

    # ── Fraud transactions ────────────────────────────────────────────────
    # More at night, higher amounts, concentrated in fewer cities
    fraud_amounts   = np.random.exponential(scale=40000, size=n_fraud).clip(5000, 200000)
    fraud_hours     = np.random.choice(list(range(0, 6)) + list(range(22, 24)), size=n_fraud)  # night
    fraud_locations = np.random.choice([0, 1, 2, 5], size=n_fraud)  # Mumbai, Delhi, Bangalore, Hyderabad

    # ── Combine ───────────────────────────────────────────────────────────
    amounts   = np.concatenate([safe_amounts, fraud_amounts])
    hours     = np.concatenate([safe_hours, fraud_hours])
    locations = np.concatenate([safe_locations, fraud_locations])
    labels    = np.array([0] * n_safe + [1] * n_fraud)

    # ── Feature engineering ───────────────────────────────────────────────
    # amount_sqrt: dampens extreme outliers (large amounts)
    # is_night: binary flag — strongest single predictor of fraud
    amount_sqrt = np.sqrt(amounts)
    is_night    = (hours <= 5) | (hours >= 22)
    is_night    = is_night.astype(float)

    X = np.column_stack([amounts, amount_sqrt, hours, locations, is_night])

    # Shuffle so safe and fraud aren't grouped together
    idx = np.random.permutation(n_samples)
    return X[idx], labels[idx]


# ─────────────────────────────────────────────────────────────────────────────
# STEP 2: Preprocess
# ─────────────────────────────────────────────────────────────────────────────

def preprocess(X_train, X_test):
    """
    Fits a StandardScaler on training data, transforms both train and test.
    StandardScaler: zero mean, unit variance — required for most ML models.
    """
    print("\n[2/5] Scaling features with StandardScaler...")
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)   # fit ONLY on train
    X_test_scaled  = scaler.transform(X_test)         # apply same scale to test
    return X_train_scaled, X_test_scaled, scaler


# ─────────────────────────────────────────────────────────────────────────────
# STEP 3: Handle class imbalance with SMOTE
# ─────────────────────────────────────────────────────────────────────────────

def apply_smote(X_train, y_train):
    """
    SMOTE (Synthetic Minority Oversampling Technique):
    Creates synthetic fraud examples by interpolating between existing ones.
    This prevents the model from being biased towards predicting "safe" always.

    Without SMOTE: model sees 85 safe for every 15 fraud → learns to ignore fraud
    With SMOTE:    balanced training set → model learns fraud patterns properly
    """
    if not SMOTE_AVAILABLE:
        print("\n[3/5] Skipping SMOTE (not installed) — model may have lower recall.")
        return X_train, y_train

    print("\n[3/5] Applying SMOTE to balance classes...")
    before = dict(zip(*np.unique(y_train, return_counts=True)))
    print(f"      Before SMOTE: {before}")

    smote = SMOTE(random_state=RANDOM_STATE)
    X_resampled, y_resampled = smote.fit_resample(X_train, y_train)

    after = dict(zip(*np.unique(y_resampled, return_counts=True)))
    print(f"      After SMOTE:  {after}")
    return X_resampled, y_resampled


# ─────────────────────────────────────────────────────────────────────────────
# STEP 4: Train Random Forest
# ─────────────────────────────────────────────────────────────────────────────

def train(X_train, y_train):
    """
    Trains a Random Forest classifier.

    Why Random Forest?
    - Ensemble of 100 decision trees → robust, less overfitting
    - Returns predict_proba() for smooth probability scores
    - Handles non-linear patterns in fraud data
    - Works well even without perfect feature engineering
    - Easy to explain in a college presentation
    """
    print("\n[4/5] Training Random Forest (100 trees)...")
    model = RandomForestClassifier(
        n_estimators=100,       # 100 trees — good balance of speed vs accuracy
        max_depth=10,           # prevents overfitting
        class_weight="balanced",# extra safety net for imbalance (alongside SMOTE)
        random_state=RANDOM_STATE,
        n_jobs=-1,              # use all CPU cores
    )
    model.fit(X_train, y_train)
    print("      Training complete.")
    return model


# ─────────────────────────────────────────────────────────────────────────────
# STEP 5: Evaluate
# ─────────────────────────────────────────────────────────────────────────────

def evaluate(model, X_test, y_test):
    """
    Evaluates model using fraud-appropriate metrics.

    WHY NOT ACCURACY?
    If 85% of transactions are safe, a model that ALWAYS predicts "safe"
    gets 85% accuracy — but catches ZERO fraud. Useless.

    Better metrics:
    - Precision: of all predicted fraud, how many were actually fraud?
    - Recall:    of all actual fraud, how many did we catch?
    - F1-score:  harmonic mean of precision and recall
    - ROC-AUC:   overall discrimination ability (0.5=random, 1.0=perfect)

    For fraud detection, RECALL is most important — missing real fraud is costly.
    """
    print("\n[5/5] Evaluating model on test set...")
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]

    print("\n" + "="*60)
    print("CLASSIFICATION REPORT")
    print("="*60)
    print(classification_report(y_test, y_pred, target_names=["Safe", "Fraud"]))

    print("CONFUSION MATRIX")
    print("="*60)
    cm = confusion_matrix(y_test, y_pred)
    print(f"  True Negative  (Safe  → Safe ):  {cm[0][0]}")
    print(f"  False Positive (Safe  → Fraud):  {cm[0][1]}  ← False alarms")
    print(f"  False Negative (Fraud → Safe ):  {cm[1][0]}  ← MISSED FRAUD")
    print(f"  True Positive  (Fraud → Fraud):  {cm[1][1]}  ← Caught!")

    auc = roc_auc_score(y_test, y_prob)
    print(f"\nROC-AUC Score: {auc:.4f}  (1.0 = perfect, 0.5 = random)")
    print("="*60)


# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("  Credit Card Fraud Detection — Model Training")
    print("=" * 60)

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Generate data
    X, y = generate_dataset(TOTAL_SAMPLES, FRAUD_RATE)

    # Train/test split (80/20), stratified to preserve fraud ratio
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=RANDOM_STATE, stratify=y
    )

    # Scale features
    X_train_scaled, X_test_scaled, scaler = preprocess(X_train, X_test)

    # Handle class imbalance
    X_train_balanced, y_train_balanced = apply_smote(X_train_scaled, y_train)

    # Train model
    model = train(X_train_balanced, y_train_balanced)

    # Evaluate
    evaluate(model, X_test_scaled, y_test)

    # Save artifacts
    joblib.dump(model, MODEL_PATH)
    joblib.dump(scaler, SCALER_PATH)
    print(f"\n✅ Model saved  → {MODEL_PATH}")
    print(f"✅ Scaler saved → {SCALER_PATH}")
    print("\nYou can now start the backend — it will load these files automatically.")


if __name__ == "__main__":
    main()
