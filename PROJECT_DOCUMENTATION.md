# Credit Card Fraud Detection System
## Complete Developer Documentation

> Written for a junior developer joining this project.
> Read this top to bottom before touching any code.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Folder Structure](#3-folder-structure)
4. [Frontend Explanation](#4-frontend-explanation)
5. [Backend Explanation](#5-backend-explanation)
6. [ML System Explanation](#6-ml-system-explanation)
7. [Complete Data Flow](#7-complete-data-flow)
8. [Most Important Files](#8-most-important-files)
9. [How to Run the Project](#9-how-to-run-the-project)
10. [Common Issues & Debugging](#10-common-issues--debugging)
11. [Future Improvements](#11-future-improvements)
12. [Viva / Interview Explanation](#12-viva--interview-explanation)

---

## 1. Project Overview

### What This Project Does

This is a **Credit Card Fraud Detection System** — a full-stack web application that allows analysts to:

- **Upload** a bank transaction dataset (Excel or CSV file)
- **Automatically analyze** every transaction using a Machine Learning model
- **Manually test** a single transaction through a form
- **View results** in a real-time dashboard with charts, alerts, and a transaction feed

Think of it like a fraud analyst's workstation — you bring your transaction data, and the system tells you which ones are likely fraud.

### Main Features

| Feature | What it Does |
|---|---|
| Dataset Upload | Drag & drop an Excel/CSV file, system analyzes every row |
| Manual Fraud Check | Enter one transaction manually, get instant fraud prediction |
| Real-time Dashboard | Transaction feed updates live as rows are processed |
| Fraud Charts | Pie/bar chart showing fraud vs safe breakdown |
| Stats Cards | Total transactions, fraud count, fraud percentage |
| Fraud Alert | Red banner pops up when a fraud transaction is detected |
| Risk Levels | Every transaction gets Low / Medium / High / Critical risk label |
| Risk Factors | Human-readable explanation of why a transaction is suspicious |

### Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | Next.js 15 + React 19 | Modern React framework with server/client components |
| Styling | Tailwind CSS + shadcn/ui | Fast, consistent, professional UI components |
| Backend | FastAPI (Python) | Fast, modern Python web framework with async support |
| ML Model | scikit-learn (Random Forest) | Simple, explainable, no GPU needed |
| Real-time | WebSocket | Push updates from backend to frontend instantly |
| File Processing | pandas + openpyxl | Read and process Excel/CSV files in Python |
| Language | TypeScript (frontend) + Python (backend) | Type safety on both sides |

### Overall Workflow

```
User opens browser → Dashboard loads (empty state shown)
        ↓
User uploads Excel file → Backend validates → ML predicts each row
        ↓
Results stream to dashboard in real time via WebSocket
        ↓
Charts, stats, transaction feed — all update automatically
```

---

## 2. System Architecture

### Big Picture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER'S BROWSER                           │
│                                                                 │
│   ┌─────────────┐   ┌──────────────┐   ┌───────────────────┐   │
│   │  Dashboard  │   │Dataset Upload│   │ Manual Fraud Check│   │
│   │  (charts,   │   │  (drag/drop) │   │   (form input)    │   │
│   │   tables)   │   └──────┬───────┘   └────────┬──────────┘   │
│   └──────┬──────┘          │                    │              │
│          │                 │ HTTP POST          │ HTTP POST    │
│          │ WebSocket       │                    │              │
└──────────┼─────────────────┼────────────────────┼─────────────-┘
           │                 │                    │
           │ ws://localhost:8000/ws/upload-progress
           │                 │                    │
┌──────────▼─────────────────▼────────────────────▼──────────────┐
│                      FASTAPI BACKEND  (port 8000)               │
│                                                                 │
│   ┌──────────────────┐  ┌────────────────┐  ┌───────────────┐  │
│   │ /upload-         │  │ /analyze-      │  │ /analyze-     │  │
│   │  transactions    │  │  dataset       │  │  transaction  │  │
│   │ (validate file)  │  │ (run ML)       │  │ (manual form) │  │
│   └──────────────────┘  └───────┬────────┘  └───────┬───────┘  │
│                                 │                   │           │
│                    ┌────────────▼───────────────────▼───────┐  │
│                    │           model.py                      │  │
│                    │  predict_row()   predict_manual()       │  │
│                    └────────────────────┬───────────────────-┘  │
│                                        │                        │
│                    ┌───────────────────▼────────────────────┐   │
│                    │      ml_artifacts/                      │   │
│                    │  fraud_model.pkl  +  scaler.pkl         │   │
│                    │  (Random Forest trained model)          │   │
│                    └────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### How Each Layer Connects

**Next.js (Frontend)**
- Renders the dashboard UI in the browser
- Makes HTTP requests to the FastAPI backend
- Maintains a WebSocket connection to receive real-time updates
- Manages all UI state (which transactions to show, loading states, etc.)

**FastAPI (Backend)**
- Receives uploaded files and manual form data
- Validates and parses incoming data
- Calls the ML model to get fraud predictions
- Stores results in memory
- Broadcasts updates to all connected WebSocket clients

**ML Model (model.py + ml_artifacts/)**
- Loaded once when the backend server starts
- Receives feature vectors (numbers derived from transaction data)
- Returns a fraud probability (0.0 to 1.0)
- If the `.pkl` file doesn't exist, falls back to rule-based scoring

**WebSocket**
- A persistent two-way connection between browser and backend
- Used to push dataset processing progress to the frontend in real time
- Also pushes manual submission results immediately to the dashboard
- No polling needed — backend pushes when there's something new

---

## 3. Folder Structure

```
Credit Card Fraud project/
│
├── backend/                    ← Python FastAPI backend
│   ├── main.py                 ← API server entry point (all endpoints)
│   ├── model.py                ← ML prediction logic
│   ├── utils.py                ← In-memory data store
│   ├── train_model.py          ← Script to train and save the ML model
│   ├── generate_samples.py     ← Script to create sample Excel datasets
│   ├── requirements.txt        ← Python package dependencies
│   ├── ml_artifacts/           ← Trained model files (generated by train_model.py)
│   │   ├── fraud_model.pkl     ← The trained Random Forest model
│   │   └── scaler.pkl          ← The fitted StandardScaler
│   └── venv/                   ← Python virtual environment (don't edit this)
│
├── Client/                     ← Next.js frontend application
│   ├── app/                    ← Next.js app router entry
│   │   ├── page.tsx            ← Root page (renders Dashboard component)
│   │   └── layout.tsx          ← HTML wrapper, fonts, theme provider
│   ├── components/
│   │   ├── dashboard/          ← All dashboard UI components
│   │   │   ├── index.tsx       ← Main Dashboard — orchestrates all components
│   │   │   ├── stats-cards.tsx ← The 4 summary number cards at the top
│   │   │   ├── live-transactions.tsx ← Scrollable live transaction feed
│   │   │   ├── fraud-chart.tsx ← Fraud vs Safe chart
│   │   │   ├── activity-table.tsx    ← Tabular view of recent transactions
│   │   │   ├── fraud-alert.tsx       ← Red banner when fraud is detected
│   │   │   ├── dataset-upload.tsx    ← Excel file upload UI
│   │   │   ├── manual-fraud-check.tsx← Manual transaction form + result
│   │   │   ├── empty-state.tsx       ← Shown when no data exists yet
│   │   │   └── navbar.tsx            ← Top navigation bar
│   │   └── ui/                 ← shadcn/ui base components (Button, Card, etc.)
│   ├── hooks/
│   │   └── use-backend.ts      ← Custom React hook — all backend communication
│   ├── lib/
│   │   └── utils.ts            ← Tailwind utility helper (cn function)
│   ├── .env.local              ← Environment variables (WebSocket URL)
│   └── package.json            ← Node.js dependencies
│
└── sample_datasets/            ← Ready-to-use test Excel files
    ├── 01_small_dataset.xlsx   ← 50 rows, 15% fraud
    ├── 02_medium_dataset.xlsx  ← 300 rows, 15% fraud
    ├── 03_large_dataset.xlsx   ← 1000 rows, 15% fraud
    ├── 04_high_fraud_dataset.xlsx ← 200 rows, 45% fraud
    └── 05_mostly_safe_dataset.xlsx← 200 rows, 5% fraud
```

### What Would Break If You Deleted Each Folder

| Folder/File | If Deleted |
|---|---|
| `backend/main.py` | Entire backend stops working |
| `backend/model.py` | No predictions — backend crashes on startup |
| `backend/utils.py` | No data storage — backend crashes |
| `ml_artifacts/` | ML disabled, falls back to rule-based scoring |
| `hooks/use-backend.ts` | Frontend cannot talk to backend — blank screen |
| `components/dashboard/index.tsx` | Dashboard doesn't render |
| `sample_datasets/` | No test data, but system still works |

---

## 4. Frontend Explanation

### How the Frontend Is Structured

The frontend is a **Next.js** application. Think of Next.js as React with extra features (file-based routing, server components, built-in optimizations).

The dashboard is a **single page** — everything lives at `localhost:3000`. There are no separate routes for upload, manual check, etc. Everything is stacked vertically on one page.

### The Main Brain: `use-backend.ts`

This is the most important frontend file. It is a **custom React hook** — a reusable function that handles all communication with the backend.

```
useBackend() returns:
  transactions  → array of all transactions to display
  isAnalyzing   → is a dataset currently being processed?
  progress      → how far through the dataset (0–100%)
  error         → any error message
  refresh()     → function to re-fetch transactions
```

Every component on the dashboard gets its data from this one hook. This is clean architecture — only one place handles backend communication.

**What it does internally:**

1. On page load, fetches `GET /transactions` to load any existing history
2. Opens a WebSocket connection to `ws://localhost:8000/ws/upload-progress`
3. Listens for three message types:
   - `"progress"` → a dataset row was just processed → add it to the list
   - `"complete"` → dataset done → re-fetch full list from REST
   - `"transaction"` → a manual submission was saved → prepend to list
4. Auto-reconnects if the WebSocket drops (backend restart, etc.)

### Component Breakdown

**`index.tsx` (Dashboard)**
The parent component. Calls `useBackend()` and passes data down to all child components. Decides whether to show the empty state or the full dashboard. Handles the fraud alert timing.

**`stats-cards.tsx`**
Shows 4 cards: Total Transactions, Fraud Detected, Safe Transactions, Fraud Rate. All numbers are computed from the `transactions` array — just counting and dividing.

**`live-transactions.tsx`**
A scrollable card showing the transaction feed. Each item shows amount, location, time, and a green/red badge. The newest transaction is always at the top.

**`fraud-chart.tsx`**
A chart (Recharts library) showing the fraud vs safe split visually. Receives `fraudCount` and `normalCount` as props and renders accordingly.

**`activity-table.tsx`**
A table showing the last 10 transactions in detail. Includes merchant category, device type, and risk level columns.

**`fraud-alert.tsx`**
A dismissible red banner that slides in when a fraud transaction arrives. Shows the amount and location. Auto-dismisses after 5 seconds.

**`dataset-upload.tsx`**
The file upload card. Has its own internal state machine:
```
idle → uploading → validated → analyzing → complete
                 ↘ error
```
Also opens its own WebSocket connection for upload progress display (the progress bar you see during analysis).

**`manual-fraud-check.tsx`**
A two-column card — form on the left, result panel on the right. Makes a `POST /analyze-transaction` request and displays the rich response including probability meter, risk factors, and recommendation.

**`empty-state.tsx`**
Shown when `transactions.length === 0`. Explains what the user needs to do and provides clickable cards that scroll to the upload section.

### State Management

This project uses **React's built-in state** — no Redux or Zustand needed. The pattern is:

- Global data (transactions, connection status) → managed in `useBackend()` hook
- Local UI state (loading spinner, form values, error messages) → managed with `useState` inside each component

This is called **lifting state up** — the hook owns shared data, components own their own UI state.

### How Frontend Receives Real-Time Updates

```
Backend processes a row → broadcasts via WebSocket
                              ↓
use-backend.ts ws.onmessage fires
                              ↓
setTransactions((prev) => [newTransaction, ...prev])
                              ↓
React re-renders LiveTransactions and ActivityTable
                              ↓
User sees new row appear without refreshing the page
```

---

## 5. Backend Explanation

### FastAPI Basics

FastAPI is a Python web framework. It does two things:

1. **REST API** — handles HTTP requests (GET, POST) from the frontend
2. **WebSocket** — maintains persistent connections for real-time communication

Every endpoint is a Python function decorated with `@app.post()` or `@app.get()`.

### All API Endpoints

| Method | Path | What It Does |
|---|---|---|
| `POST` | `/upload-transactions` | Receive Excel/CSV, validate columns, store in memory |
| `POST` | `/analyze-dataset?upload_id=X` | Process stored dataset row by row with ML |
| `POST` | `/analyze-transaction` | Predict fraud for one manually entered transaction |
| `GET` | `/transactions?limit=100` | Return recent transaction history |
| `GET` | `/stats` | Return fraud/safe counts and percentage |
| `WS` | `/ws/upload-progress` | Push real-time events to connected browsers |

### The WebSocket Manager

```python
class ConnectionManager:
    active_connections: list[WebSocket]

    async def connect(ws)    → accept and store connection
    async def broadcast(msg) → send message to ALL connected clients
    def disconnect(ws)       → remove connection when browser closes tab
```

There is one `activity_manager` instance shared across all endpoints. When `/analyze-dataset` processes a row, it calls `activity_manager.broadcast(...)` and every connected browser tab receives the update instantly.

### File Upload Processing Flow

```
POST /upload-transactions:
  1. Check file extension (.xlsx or .csv only)
  2. Read file bytes → parse with pandas
  3. Normalize column names (lowercase, replace spaces with _)
  4. Check all 9 required columns exist
  5. Validate 'amount' is numeric
  6. Drop rows with null amounts
  7. Store DataFrame in _uploaded_df variable
  8. Return upload_id + row count to frontend

POST /analyze-dataset:
  1. Check upload_id matches stored dataset
  2. Call reset_store() — clears previous data
  3. Loop through each row:
     a. Call predict_row(row) → get fraud prediction
     b. Call add_transaction(result) → save to memory
     c. Broadcast progress % + transaction to WebSocket
     d. Sleep 0.04s to allow frontend to render updates
  4. Broadcast "complete" message
  5. Return summary JSON
```

### Data Validation with Pydantic

For the manual form, FastAPI uses Pydantic models:

```python
class ManualTransactionRequest(BaseModel):
    amount: float = Field(..., gt=0)  # must be > 0
    time: str
    merchant_category: str
    location: str
    device_type: str
    is_international: bool
```

If the frontend sends invalid data (negative amount, missing field), FastAPI automatically returns a 422 error with a clear message. No manual validation code needed.

### In-Memory Storage (`utils.py`)

The backend stores transactions in a Python list in RAM:

```python
_transaction_history: list = []  # newest first
_fraud_count: int = 0
_normal_count: int = 0
```

A `threading.Lock` protects these from race conditions (two requests writing at the same time).

**Important:** This data disappears when the server restarts. For production, use a database like PostgreSQL.

### CORS Middleware

The backend runs on port 8000, the frontend on port 3000. Browsers block requests between different ports by default (CORS policy). The backend adds middleware to allow the frontend:

```python
allow_origins=["http://localhost:3000"]
```

Without this, every fetch() from the frontend would fail with a CORS error.

---

## 6. ML System Explanation

### Which Model Is Used

**Random Forest Classifier** from scikit-learn.

A Random Forest is an ensemble of many decision trees (this project uses 100 trees). Each tree votes on whether a transaction is fraud or safe. The majority vote wins. It also provides a probability score via `predict_proba()`.

### Why Random Forest Was Chosen

| Reason | Explanation |
|---|---|
| No GPU needed | Runs on any laptop |
| Returns probability | We need a 0–1 score, not just yes/no |
| Handles class imbalance well | With `class_weight="balanced"` |
| Doesn't need much feature engineering | Works with raw numbers |
| Easy to explain | "100 decision trees vote" is simple to present |
| Good baseline accuracy | Typically 85–95% F1 on fraud datasets |

### How the Model Is Trained (`train_model.py`)

Run this once — it does not run automatically.

```
Step 1: Generate synthetic training data
        → 10,000 transactions (8,500 safe + 1,500 fraud)
        → Fraud patterns: high amounts, night hours, big cities

Step 2: Feature engineering
        → amount (raw)
        → amount_sqrt (square root — reduces effect of extreme values)
        → hour (0–23, from timestamp)
        → location_id (city encoded as 0–14)
        → is_night (1 if hour ≤ 5 or ≥ 22, else 0)

Step 3: StandardScaler
        → Normalize all features to zero mean, unit variance
        → Scaler is fitted on training data ONLY

Step 4: SMOTE (Synthetic Minority Oversampling)
        → Creates synthetic fraud examples to balance classes
        → Without this: model learns to always say "safe" (85% accurate but useless)

Step 5: Train RandomForestClassifier
        → 100 trees, max_depth=10, class_weight="balanced"

Step 6: Evaluate on test set
        → Precision, Recall, F1-score (NOT accuracy)
        → ROC-AUC score

Step 7: Save to ml_artifacts/
        → fraud_model.pkl (the trained model)
        → scaler.pkl (the fitted scaler)
```

### How Model Is Loaded

In `model.py`, at the very top (module import time, before any request):

```python
_model  = joblib.load("ml_artifacts/fraud_model.pkl")
_scaler = joblib.load("ml_artifacts/scaler.pkl")
_using_ml = True
```

This runs **once** when the server starts. Every subsequent prediction reuses the loaded model. If the `.pkl` files don't exist, `_using_ml = False` and the rule-based fallback is used.

### How Prediction Works

```
Transaction data comes in (either from Excel row or manual form)
            ↓
_features_from_row() or _features_from_manual()
  → extracts: [amount, amount_sqrt, hour, location_id, is_night]
  → returns a numpy array of shape (1, 5)
            ↓
_scaler.transform(features)
  → applies the same scaling that was used during training
  → model expects scaled input — raw numbers would give wrong results
            ↓
_model.predict_proba(scaled_features)[0][1]
  → [0] = first (and only) sample
  → [1] = probability of class 1 (fraud)
  → returns a float between 0.0 and 1.0
            ↓
Apply boosts for extra signals:
  → +0.05 if international transaction
  → +0.07 if high-risk merchant category (Electronics, Crypto, etc.)
  → +0.08 if previous_fraud_flag = 1 (Excel uploads only)
            ↓
If probability > 0.50 → status = "fraud"
If probability ≤ 0.50 → status = "safe"
```

### Rule-Based Fallback (No ML Model)

When `ml_artifacts/` doesn't exist, the system uses `_rule_based_prob()`. This is deterministic (same input → same output, no randomness). It assigns a base score from amount tiers, then boosts for night hours, international flag, and high-risk categories.

### Current ML Limitations (Be Honest About This)

| Limitation | Impact |
|---|---|
| Trained on synthetic data | Model won't have learned real fraud patterns from real bank data |
| Only 5 features | Real fraud models use 100+ features |
| No user behavior modeling | Can't detect account takeover patterns |
| Scaler mismatch | If you change features, you must retrain scaler too |
| No model versioning | Replacing the .pkl silently changes all predictions |

**What to improve later:** Train on the actual Kaggle Credit Card Fraud dataset (284k real transactions with V1–V28 PCA features) and map your Excel columns to those features.

---

## 7. Complete Data Flow

### A. Excel Upload Flow

```
1. USER drags a .xlsx file onto the upload zone

2. FRONTEND (dataset-upload.tsx)
   → Checks extension + file size (client-side validation)
   → Creates FormData object
   → POST /upload-transactions (multipart form)

3. BACKEND (main.py → /upload-transactions)
   → Reads file bytes
   → pd.read_excel() parses the file into a DataFrame
   → Normalizes column names (lowercase)
   → Checks all 9 required columns exist
   → Validates 'amount' is numeric
   → Stores DataFrame in _uploaded_df
   → Returns: { upload_id, total_rows, filename }

4. FRONTEND
   → Shows "File validated — X rows ready"
   → Opens WebSocket to /ws/upload-progress
   → User clicks "Analyze Dataset"

5. FRONTEND → POST /analyze-dataset?upload_id=XXXX

6. BACKEND (main.py → /analyze-dataset)
   → Calls reset_store() — clears old data
   → Loops through each DataFrame row:
       a. predict_row(row) in model.py
            → Extracts features from row columns
            → Scales with scaler.pkl
            → Runs Random Forest prediction
            → Returns { id, amount, location, status, fraud_probability, risk_level, ... }
       b. add_transaction(result) in utils.py
            → Inserts into _transaction_history list
            → Increments fraud_count or normal_count
       c. activity_manager.broadcast({ type:"progress", percent:X, transaction:{...} })
            → Sends to ALL connected WebSocket clients

7. FRONTEND (use-backend.ts → ws.onmessage)
   → Receives "progress" message
   → Prepends transaction to state
   → React re-renders LiveTransactions, Charts, Table
   → Progress bar in dataset-upload.tsx updates

8. After all rows processed:
   BACKEND → broadcast { type: "complete", fraud_count, safe_count }
   FRONTEND → setIsAnalyzing(false) → fetchTransactions() → full state sync
```

### B. Manual Fraud Check Flow

```
1. USER fills in the form (amount, time, category, location, device, international)

2. FRONTEND (manual-fraud-check.tsx)
   → Validates form (all fields filled, amount > 0)
   → POST /analyze-transaction with JSON body

3. BACKEND (main.py → /analyze-transaction)
   → Pydantic validates the request body automatically
   → Calls predict_manual(request) in model.py
       → Builds 5-feature vector
       → Runs prediction (ML or rule-based)
       → Generates risk_factors list
       → Returns { status, fraud_probability, risk_level, risk_factors, recommendation }
   → Builds dashboard_record with source: "manual"
   → Calls add_transaction(dashboard_record)
   → Broadcasts { type:"transaction", transaction:{...} } via WebSocket
   → Returns the rich prediction response to HTTP caller

4. FRONTEND (manual-fraud-check.tsx)
   → Shows result panel: probability meter, risk badge, factors, recommendation

5. FRONTEND (use-backend.ts → ws.onmessage)
   → Receives "transaction" message simultaneously
   → Prepends to transactions state
   → Transaction appears in live feed and activity table
```

### C. Dashboard Update Flow

```
After any event (upload or manual):

transactions state changes
        ↓
React re-renders all components that depend on it:
  → StatsCards: re-counts fraud/safe from transactions array
  → LiveTransactions: shows new item at top
  → FraudChart: updates fraud/safe ratio
  → ActivityTable: shows latest 10 rows
  → FraudAlert: fires if newest transaction is fraud
```

---

## 8. Most Important Files

### Backend

**`backend/main.py`** — The heart of the backend. Defines all API endpoints and the WebSocket. If this file breaks, nothing works. Every request goes through here.

**`backend/model.py`** — The intelligence of the system. This file is where fraud predictions actually happen. It loads the ML model at startup and provides `predict_row()` and `predict_manual()`. If you want to swap in a new model, this is the only file you change.

**`backend/utils.py`** — The memory of the backend. Stores all transaction history and counts. Provides `add_transaction()`, `get_stats()`, `get_recent_transactions()`, and `reset_store()`. If you add a database later, this file is where you'd make the change.

**`backend/train_model.py`** — The teacher. Run this once to train the Random Forest and save it as `.pkl` files. Not used during normal operation.

### Frontend

**`Client/hooks/use-backend.ts`** — The communication layer. Every piece of transaction data in the UI comes through this hook. It manages the WebSocket connection, fetches history, and exposes clean state to all components. If this breaks, the entire dashboard goes blank.

**`Client/components/dashboard/index.tsx`** — The orchestrator. Calls `useBackend()` and passes data to every child component. Decides whether to show the empty state or the full dashboard. If you add a new section to the dashboard, you add it here.

---

## 9. How to Run the Project

### Prerequisites

- Python 3.11 (NOT 3.12, 3.13, or 3.14 — scikit-learn has no wheels for them yet)
- Node.js 18+ (any modern version works)
- Git (optional)

### Backend Setup (Do This First)

```cmd
:: Navigate to backend
cd "C:\Credit Card Fraud project\backend"

:: Create virtual environment using Python 3.11 specifically
py -3.11 -m venv venv

:: Activate virtual environment
venv\Scripts\activate        ← Windows CMD
venv\Scripts\Activate.ps1   ← Windows PowerShell

:: Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

:: (Optional but recommended) Train the ML model
python train_model.py
:: This creates ml_artifacts/fraud_model.pkl and ml_artifacts/scaler.pkl
:: Without this step, the system uses rule-based scoring instead of ML

:: Start the backend server
uvicorn main:app --reload --port 8000
```

You should see:
```
✅ [model.py] Loaded trained ML model from ml_artifacts/
INFO: Uvicorn running on http://127.0.0.1:8000
```

### Frontend Setup

```cmd
:: Open a NEW terminal (keep backend running)
cd "C:\Credit Card Fraud project\Client"

:: Install Node dependencies (only needed once)
npm install

:: Start the frontend
npm run dev
```

You should see:
```
▲ Next.js 15.x.x
- Local: http://localhost:3000
```

Open `http://localhost:3000` in your browser.

### Generate Sample Datasets (Optional)

```cmd
:: From the backend folder with venv active
python generate_samples.py
```

This creates 5 Excel files in `/sample_datasets/` ready to upload and test.

### Environment Variables

`Client/.env.local` contains:
```
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws/upload-progress
```

This tells the frontend where the WebSocket is. If you change the backend port, update this file.

### Summary: Two Terminals Always Running

```
Terminal 1:  backend/  → uvicorn main:app --reload --port 8000
Terminal 2:  Client/   → npm run dev
```

---

## 10. Common Issues & Debugging

### Backend Won't Start

**Error:** `ModuleNotFoundError: No module named 'fastapi'`
**Fix:** Virtual environment not activated. Run `venv\Scripts\activate` first.

**Error:** `ERROR: Failed building wheel for pydantic-core`
**Fix:** You're using Python 3.12+ which has no prebuilt wheels. Use Python 3.11 specifically: `py -3.11 -m venv venv`

**Error:** `Address already in use`
**Fix:** Another process is using port 8000. Either kill it or use `--port 8001` and update `.env.local`.

### ML Model Not Loading

**Message:** `⚠️ No model.pkl found — using rule-based prediction`
**Fix:** Run `python train_model.py` to generate the `.pkl` files. This is expected on first run.

**Error:** `sklearn.exceptions.NotFittedError`
**Fix:** The scaler or model file is corrupted. Delete `ml_artifacts/` and run `train_model.py` again.

### Frontend Shows "Backend Unreachable"

**Cause:** Backend is not running, or running on a different port.
**Fix:**
1. Confirm backend is running: open `http://localhost:8000/docs` in browser
2. Check `.env.local` has the correct WebSocket URL
3. Check CORS settings in `main.py` include `http://localhost:3000`

### WebSocket Connection Fails

**Symptom:** Dashboard loads but never updates during dataset analysis.
**Debug steps:**
1. Open browser DevTools → Network tab → filter by "WS"
2. You should see a connection to `ws://localhost:8000/ws/upload-progress`
3. If it's failing: check backend is running and CORS middleware is configured
4. If it connects but no messages: check backend console for errors during analysis

### Excel Upload Fails

**Error:** `Missing required columns: ['merchant_category', 'previous_fraud_flag']`
**Fix:** Your Excel file is missing columns. Use a sample file from `/sample_datasets/` as a template.

**Error:** `'amount' column must be numeric`
**Fix:** Amount column has text values or currency symbols (like "₹1,000"). Remove formatting and use plain numbers.

**Error:** `Only .xlsx and .csv files are accepted`
**Fix:** Convert your file to Excel format. `.xls` (old format) is not supported — use `.xlsx`.

### Dashboard Empty After Analysis

**Symptom:** Analysis completed but dashboard is still empty.
**Cause:** `reset_store()` cleared old data but WebSocket didn't send the new data.
**Fix:** Refresh the browser. The `GET /transactions` call on mount will reload everything.

### Debugging Tips

```
Backend logs: watch the terminal where uvicorn is running
Frontend logs: browser DevTools → Console tab
Network requests: browser DevTools → Network tab
API explorer: http://localhost:8000/docs (FastAPI auto-generated docs)
WebSocket messages: DevTools → Network → WS → Messages
```

---

## 11. Future Improvements

### High Priority (Makes It Production-Ready)

**1. Real Database (PostgreSQL)**
Currently all data lives in Python variables and disappears on restart. Replace `utils.py` with SQLAlchemy + PostgreSQL. Use Alembic for migrations.

```
# Current
_transaction_history: list = []

# Future
session.add(Transaction(...))
session.commit()
```

**2. User Authentication**
Add JWT-based login so analysts have their own accounts and transaction history. Use FastAPI's OAuth2 with JWT, or integrate with Auth0.

**3. Real ML Dataset**
Train the model on the [Kaggle Credit Card Fraud dataset](https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud) — 284,807 real transactions. This gives far better real-world accuracy.

**4. Model Versioning**
Use MLflow to track model experiments, compare versions, and roll back if a new model performs worse.

### Medium Priority (Better ML)

**5. XGBoost or LightGBM**
Replace Random Forest with gradient boosting models — typically 5-10% better F1 score on fraud data with faster inference.

**6. Feature Engineering**
Add velocity features: "how many transactions from this location in the last hour?" This catches card cloning patterns that amount alone can't detect.

**7. Explainability with SHAP**
Use SHAP (SHapley Additive exPlanations) to show exactly which features contributed to each fraud prediction. Useful for explaining decisions to compliance teams.

### Infrastructure

**8. Kafka / Event Streaming**
For real bank-scale systems, transactions come as a continuous stream. Replace file uploads with Apache Kafka consumers that process transactions as they happen.

**9. Docker + Docker Compose**
Package backend and frontend into containers:
```yaml
services:
  backend:  build: ./backend
  frontend: build: ./Client
  db:       image: postgres:15
```

**10. Cloud Deployment**
- Backend: AWS EC2, Google Cloud Run, or Railway
- Frontend: Vercel (built for Next.js)
- Database: AWS RDS or Supabase
- Model serving: AWS SageMaker for high-throughput inference

**11. Monitoring & Alerting**
Add Prometheus + Grafana to monitor:
- Fraud rate trends over time
- Model prediction latency
- API error rates
- Unusual spikes in transaction volume

**12. Batch Processing for Large Files**
Currently processes rows one by one. For files with 100,000+ rows, use pandas vectorized operations and process in chunks to avoid memory issues.

---

## 12. Viva / Interview Explanation

### How to Explain the Project in 2 Minutes

> "I built a Credit Card Fraud Detection System — a full-stack web application. The backend is FastAPI in Python with a Random Forest ML model. The frontend is Next.js with React. Users upload an Excel file of bank transactions, the backend runs each row through the ML model, and results stream back to the dashboard in real time using WebSockets. The dashboard shows fraud vs safe charts, a live transaction feed, and alerts when fraud is detected. Users can also manually test a single transaction through a form. The ML model was trained on synthetic transaction data using SMOTE to handle class imbalance, and evaluated using Precision, Recall, and F1-score — not just accuracy."

### How to Explain the Architecture

> "The system has three layers. The frontend is Next.js — it's what the user sees. The backend is FastAPI — it handles file uploads, runs ML predictions, and manages the data. The ML layer is a trained Random Forest saved as a .pkl file, loaded once when the server starts. Real-time updates work through WebSockets — when the backend processes a transaction, it broadcasts the result to all connected browsers instantly, no page refresh needed."

### How to Explain ML Integration

> "When a user uploads an Excel file, the backend reads it with pandas, then loops through each row. For each row, we extract 5 features: transaction amount, square root of amount, hour of day, location encoded as a number, and a binary flag for late-night transactions. We scale these features using the same StandardScaler fitted during training. Then we call `model.predict_proba()` which returns a fraud probability between 0 and 1. If it's above 0.5, we flag it as fraud. We also apply additional boosts for high-risk merchant categories and international transactions. The model was trained with SMOTE because fraud data is highly imbalanced — only 15% of transactions are fraud, so without SMOTE the model would learn to always say safe."

### How to Explain Real-Time Dashboard

> "The real-time part works with WebSockets — a persistent connection between the browser and backend. When the backend finishes analyzing each transaction row, it broadcasts a message to all connected clients. The frontend's `useBackend` hook listens for these messages and updates the React state, which triggers React to re-render the charts, transaction feed, and stats cards. This gives the appearance of a live updating dashboard even though it's driven by file processing."

### Common Viva Questions and Answers

**Q: Why Random Forest instead of a neural network?**
A: Random Forest is more explainable — each tree makes a simple decision. For fraud detection, explainability matters because you need to justify why a transaction was flagged. It also works well with small training datasets, doesn't need a GPU, and gives probability scores natively.

**Q: What is SMOTE and why did you use it?**
A: SMOTE is Synthetic Minority Oversampling Technique. In fraud data, only ~15% of transactions are fraud. Without correction, the model learns to always predict "safe" and gets 85% accuracy — but catches zero fraud. SMOTE creates synthetic fraud examples by interpolating between existing fraud cases, balancing the training data so the model learns what fraud actually looks like.

**Q: Why use WebSockets instead of polling?**
A: With polling, the frontend would ask "any updates?" every N seconds — wasteful and adds latency. WebSockets keep a persistent connection open, so the backend pushes data the instant it's ready. This gives true real-time behavior with lower bandwidth.

**Q: What happens if the ML model file doesn't exist?**
A: The system falls back to rule-based scoring — a deterministic algorithm that assigns fraud probability based on amount tiers, time of day, merchant category, and international flag. The frontend still works correctly, it's just using simpler logic. The `model_used` field in the response tells the user which mode is active.

**Q: What's the difference between accuracy and F1-score for fraud detection?**
A: If 85% of transactions are safe, a model that always predicts "safe" gets 85% accuracy — useless for catching fraud. F1-score combines Precision (of everything flagged as fraud, how many were actually fraud) and Recall (of all actual fraud, how many did we catch). For fraud, Recall is most important — a missed fraud is more costly than a false alarm.

**Q: How would you scale this to handle 1 million transactions per day?**
A: Several changes needed. Replace the in-memory Python list with PostgreSQL. Replace file uploads with a Kafka message queue where each transaction is a message. Deploy the ML model as a separate service (FastAPI or TorchServe) so it can scale independently. Use async batch processing instead of row-by-row. Add Redis for caching stats. Deploy with Kubernetes for horizontal scaling.

**Q: What security vulnerabilities does this system have?**
A: Several. No authentication — anyone can access the API. No rate limiting — API can be spammed. File uploads aren't scanned for malicious content. The in-memory store can be exhausted with a large enough file (DoS). No input sanitization beyond Pydantic validation. In production, add JWT auth, rate limiting, file size limits, and input sanitization.

---

*Documentation written based on the actual source code. Last updated to reflect v4 of the backend (all random data generation removed, Excel upload and manual check as sole data sources).*
