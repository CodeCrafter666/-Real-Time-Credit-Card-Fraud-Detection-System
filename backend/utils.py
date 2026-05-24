"""
utils.py — Shared utilities v4
================================
REMOVED: generate_transaction(), _generate_amount(), seed_initial_transactions()
         — all random/simulated data generation has been eliminated.

KEPT:    In-memory store, add_transaction(), get_stats(),
         get_recent_transactions(), reset_store()
"""

import uuid
from threading import Lock
from pydantic import BaseModel, Field


# ──────────────────────────────────────────────────────────────────────────────
# Pydantic model (kept for any internal use — no longer used for generation)
# ──────────────────────────────────────────────────────────────────────────────

class TransactionInput(BaseModel):
    id: str = Field(default_factory=lambda: f"TXN{uuid.uuid4().hex[:8].upper()}")
    amount: float = Field(..., gt=0)
    location: str
    time: str


# ──────────────────────────────────────────────────────────────────────────────
# In-memory store
# Replace with PostgreSQL or Redis for production use.
# ──────────────────────────────────────────────────────────────────────────────

_store_lock = Lock()
_transaction_history: list = []
_fraud_count:  int = 0
_normal_count: int = 0


def add_transaction(transaction: dict) -> None:
    """
    Persists one transaction result to the in-memory store.
    Called after:
      - Each row processed from an uploaded dataset
      - Each manual transaction submission
    Capped at 2000 entries (oldest removed first).
    """
    global _fraud_count, _normal_count
    with _store_lock:
        _transaction_history.insert(0, transaction)
        if len(_transaction_history) > 2000:
            _transaction_history.pop()
        if transaction.get("status") == "fraud":
            _fraud_count += 1
        else:
            _normal_count += 1


def get_stats() -> dict:
    """Returns aggregate counts consumed by the StatsCards component."""
    with _store_lock:
        total = _fraud_count + _normal_count
        return {
            "total_transactions": total,
            "fraud_count":        _fraud_count,
            "normal_count":       _normal_count,
            "fraud_percentage":   round((_fraud_count / total * 100), 2) if total > 0 else 0.0,
        }


def get_recent_transactions(limit: int = 100) -> list:
    """Returns the most recent `limit` transactions, newest first."""
    with _store_lock:
        return _transaction_history[:limit]


def reset_store() -> None:
    """
    Clears all transaction history and resets counters to zero.
    Called at the start of each new dataset analysis so the dashboard
    reflects only the current dataset — not a mix of previous data.
    """
    global _fraud_count, _normal_count
    with _store_lock:
        _transaction_history.clear()
        _fraud_count  = 0
        _normal_count = 0
