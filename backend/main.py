"""
main.py — FastAPI backend v4 — Credit Card Fraud Detection
============================================================
All random/simulated transaction generation has been REMOVED.

The ONLY sources of transaction data are now:
  1. Uploaded Excel/CSV datasets  (POST /upload-transactions → POST /analyze-dataset)
  2. Manual fraud check form      (POST /analyze-transaction)

REST endpoints:
  POST /analyze-transaction    → manual form submission
  POST /upload-transactions    → validate an uploaded Excel/CSV file
  POST /analyze-dataset        → run ML on uploaded dataset row by row
  GET  /stats                  → aggregate fraud vs normal counts
  GET  /transactions           → full transaction history

WebSocket:
  /ws/upload-progress → streams per-row results while a dataset is being analyzed
                         (also used to push manual submission results in real time)

REMOVED (was random data generation):
  - GET /ws                    → auto-generated fake transactions every 2s
  - seed_initial_transactions  → fake startup data
"""

import asyncio
import io
import json
import uuid
from contextlib import asynccontextmanager
from typing import Optional

import pandas as pd
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from model import predict_manual, predict_row
from utils import (
    get_stats,
    get_recent_transactions,
    add_transaction,
    reset_store,
)


# ──────────────────────────────────────────────────────────────────────────────
# Required columns for uploaded Excel/CSV files
# ──────────────────────────────────────────────────────────────────────────────

REQUIRED_COLUMNS = {
    "transaction_id", "amount", "timestamp",
    "merchant_category", "location", "device_type",
    "transaction_type", "international", "previous_fraud_flag",
}


# ──────────────────────────────────────────────────────────────────────────────
# In-memory uploaded dataset store (one active dataset at a time)
# ──────────────────────────────────────────────────────────────────────────────

_uploaded_df: Optional[pd.DataFrame] = None
_upload_id:   Optional[str] = None


# ──────────────────────────────────────────────────────────────────────────────
# Lifespan — NO fake data seeded on startup
# ──────────────────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Store starts empty — user must upload a dataset or submit manual entries
    print("✅ [main.py] Server started. Awaiting user data (upload or manual entry).")
    yield


# ──────────────────────────────────────────────────────────────────────────────
# App
# ──────────────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Credit Card Fraud Detection API",
    version="4.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ──────────────────────────────────────────────────────────────────────────────
# Pydantic models
# ──────────────────────────────────────────────────────────────────────────────

class ManualTransactionRequest(BaseModel):
    """Fields from the Manual Fraud Check form."""
    amount:            float = Field(..., gt=0)
    time:              str
    merchant_category: str
    location:          str
    device_type:       str
    is_international:  bool


# ──────────────────────────────────────────────────────────────────────────────
# WebSocket manager — single channel for real activity only
# ──────────────────────────────────────────────────────────────────────────────

class ConnectionManager:
    """Manages all active WebSocket connections and broadcasts messages."""

    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active_connections.append(ws)

    def disconnect(self, ws: WebSocket):
        if ws in self.active_connections:
            self.active_connections.remove(ws)

    async def broadcast(self, data: dict):
        msg = json.dumps(data)
        for ws in list(self.active_connections):
            try:
                await ws.send_text(msg)
            except Exception:
                self.disconnect(ws)


# Single shared manager — used for upload progress AND manual submission events
activity_manager = ConnectionManager()


# ──────────────────────────────────────────────────────────────────────────────
# REST — Manual fraud check
# ──────────────────────────────────────────────────────────────────────────────

@app.post("/analyze-transaction")
async def analyze_transaction(request: ManualTransactionRequest):
    """
    Runs fraud prediction on a single manually entered transaction.
    Also saves result to history and broadcasts it via WebSocket
    so the dashboard transaction feed updates in real time.

    Returns rich response: status, probability, risk_level, risk_factors, recommendation.
    """
    result = predict_manual(request)

    # Build a transaction record compatible with the dashboard feed
    dashboard_record = {
        "id":                f"MAN{uuid.uuid4().hex[:8].upper()}",
        "amount":            request.amount,
        "location":          request.location,
        "time":              request.time if len(request.time) == 8 else request.time + ":00",
        "status":            result["status"],
        "fraud_probability": result["fraud_probability"],
        "risk_level":        result["risk_level"],
        "merchant_category": request.merchant_category,
        "device_type":       request.device_type,
        "is_international":  request.is_international,
        "source":            "manual",   # tag so frontend can distinguish
    }

    # Persist to history + broadcast to WebSocket clients
    add_transaction(dashboard_record)
    await activity_manager.broadcast({
        "type":        "transaction",
        "transaction": dashboard_record,
    })

    return result


# ──────────────────────────────────────────────────────────────────────────────
# REST — Stats and history
# ──────────────────────────────────────────────────────────────────────────────

@app.get("/stats")
async def stats():
    """Returns aggregate counts for the dashboard StatsCards."""
    return get_stats()


@app.get("/transactions")
async def transactions(limit: int = 100):
    """Returns the most recent transactions for the dashboard feed."""
    return get_recent_transactions(limit)


# ──────────────────────────────────────────────────────────────────────────────
# REST — File upload (Step 1 of 2)
# ──────────────────────────────────────────────────────────────────────────────

@app.post("/upload-transactions")
async def upload_transactions(file: UploadFile = File(...)):
    """
    Accepts an Excel (.xlsx) or CSV file, validates its structure,
    and stores it in memory for the analysis step.

    Does NOT run predictions yet — just validates columns and returns a summary.
    """
    global _uploaded_df, _upload_id

    filename = file.filename or ""
    if not (filename.endswith(".xlsx") or filename.endswith(".csv")):
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Only .xlsx and .csv files are accepted.",
        )

    content = await file.read()
    try:
        if filename.endswith(".xlsx"):
            df = pd.read_excel(io.BytesIO(content), engine="openpyxl")
        else:
            df = pd.read_csv(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not parse file: {str(e)}")

    # Normalize column names
    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]

    # Validate required columns
    missing = REQUIRED_COLUMNS - set(df.columns)
    if missing:
        raise HTTPException(
            status_code=422,
            detail=f"Missing required columns: {sorted(missing)}. "
                   f"Download a sample file from /sample_datasets/ for the correct format.",
        )

    # Validate amount is numeric
    try:
        df["amount"] = pd.to_numeric(df["amount"], errors="raise")
    except Exception:
        raise HTTPException(status_code=422, detail="'amount' column must be numeric.")

    df = df.dropna(subset=["amount"]).reset_index(drop=True)

    if len(df) == 0:
        raise HTTPException(status_code=422, detail="File contains no valid data rows.")

    _uploaded_df = df
    _upload_id   = str(uuid.uuid4())[:8].upper()

    return {
        "upload_id":  _upload_id,
        "filename":   filename,
        "total_rows": len(df),
        "columns":    list(df.columns),
        "preview":    df.head(3).to_dict(orient="records"),
        "message":    f"File validated. {len(df)} transactions ready to analyze.",
    }


# ──────────────────────────────────────────────────────────────────────────────
# REST — Dataset analysis (Step 2 of 2)
# ──────────────────────────────────────────────────────────────────────────────

@app.post("/analyze-dataset")
async def analyze_dataset(upload_id: str):
    """
    Runs ML fraud detection on every row of the uploaded dataset.

    Behaviour:
    - Clears previous transaction history (reset_store) so dashboard shows only this dataset
    - Processes rows one by one, streaming progress via WebSocket
    - Each processed row is broadcast as a 'transaction' event to all WS clients
    - Returns a summary at the end
    """
    global _uploaded_df, _upload_id

    if _uploaded_df is None or _upload_id != upload_id:
        raise HTTPException(
            status_code=404,
            detail="No dataset found. Please upload a file first.",
        )

    df    = _uploaded_df.copy()
    total = len(df)

    # Clear previous data — dashboard now shows only this dataset
    reset_store()

    fraud_n = 0
    safe_n  = 0
    results = []

    for idx, row in df.iterrows():
        result = predict_row(row)
        add_transaction(result)

        if result["status"] == "fraud":
            fraud_n += 1
        else:
            safe_n += 1

        results.append(result)

        # Broadcast progress update to all WebSocket clients
        await activity_manager.broadcast({
            "type":          "progress",
            "processed":     int(idx) + 1,
            "total":         total,
            "percent":       round(((int(idx) + 1) / total) * 100, 1),
            "transaction":   result,       # also carry the row so feed updates live
            "fraud_so_far":  fraud_n,
            "safe_so_far":   safe_n,
        })

        # Throttle: yield every row for small files, every 5th for large ones
        if total <= 200 or (int(idx) + 1) % 5 == 0:
            await asyncio.sleep(0.04)

    # Broadcast completion signal
    await activity_manager.broadcast({
        "type":        "complete",
        "total":       total,
        "fraud_count": fraud_n,
        "safe_count":  safe_n,
        "fraud_rate":  round((fraud_n / total) * 100, 2) if total > 0 else 0,
    })

    return {
        "status":      "complete",
        "total":       total,
        "fraud_count": fraud_n,
        "safe_count":  safe_n,
        "fraud_rate":  round((fraud_n / total) * 100, 2) if total > 0 else 0,
        "results":     results[:100],
    }


# ──────────────────────────────────────────────────────────────────────────────
# WebSocket — real activity feed (upload progress + manual submissions)
# ──────────────────────────────────────────────────────────────────────────────

@app.websocket("/ws/upload-progress")
async def websocket_activity(websocket: WebSocket):
    """
    Single WebSocket endpoint for all real-time activity:
      - Dataset upload progress (type: 'progress', 'complete')
      - Manual transaction submissions (type: 'transaction')

    The frontend connects here once and receives all real-time events.
    No random data is ever generated or sent through this channel.
    """
    await activity_manager.connect(websocket)
    try:
        while True:
            await asyncio.sleep(30)   # heartbeat — keeps connection alive
    except WebSocketDisconnect:
        activity_manager.disconnect(websocket)
