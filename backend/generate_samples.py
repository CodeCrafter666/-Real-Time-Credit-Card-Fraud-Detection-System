"""
generate_samples.py — Creates 5 realistic sample Excel datasets for testing.

Run this from the backend folder:
    python generate_samples.py

Output:
    ../sample_datasets/01_small_dataset.xlsx         (50 rows,  ~15% fraud)
    ../sample_datasets/02_medium_dataset.xlsx        (300 rows, ~15% fraud)
    ../sample_datasets/03_large_dataset.xlsx         (1000 rows,~15% fraud)
    ../sample_datasets/04_high_fraud_dataset.xlsx    (200 rows, ~45% fraud)
    ../sample_datasets/05_mostly_safe_dataset.xlsx   (200 rows, ~5%  fraud)
"""

import random
import uuid
from datetime import datetime, timedelta

try:
    import openpyxl
    from openpyxl.styles import PatternFill, Font, Alignment
    from openpyxl.utils import get_column_letter
except ImportError:
    print("ERROR: openpyxl not installed.")
    print("Run: pip install openpyxl")
    raise

OUTPUT_DIR = "../sample_datasets"

LOCATIONS = [
    "Mumbai, MH", "Delhi, DL", "Bangalore, KA", "Chennai, TN",
    "Kolkata, WB", "Hyderabad, TS", "Pune, MH", "Ahmedabad, GJ",
    "Jaipur, RJ", "Lucknow, UP", "Chandigarh, CH", "Kochi, KL",
    "Indore, MP", "Bhopal, MP", "Nagpur, MH",
]

MERCHANT_CATEGORIES = [
    "Electronics", "Food & Dining", "Travel", "Healthcare",
    "Entertainment", "Online Shopping", "Grocery", "Gaming",
    "Fuel", "Jewelry", "Cryptocurrency", "Wire Transfer", "Other"
]

DEVICE_TYPES = ["Mobile", "Desktop", "POS Terminal", "ATM", "Virtual Card"]

TRANSACTION_TYPES = ["Purchase", "Withdrawal", "Transfer", "Refund", "Payment"]


def random_timestamp(days_back: int = 30) -> str:
    base = datetime.now() - timedelta(days=random.randint(0, days_back))
    base = base.replace(
        hour=random.randint(0, 23),
        minute=random.randint(0, 59),
        second=random.randint(0, 59)
    )
    return base.strftime("%Y-%m-%d %H:%M:%S")


def make_transaction(fraud: bool) -> dict:
    """Creates one realistic transaction row."""
    if fraud:
        # Fraud pattern: high amount, night hours, high-risk category, often international
        hour = random.choice(list(range(0, 6)) + list(range(22, 24)))
        amount = round(random.uniform(20000, 200000), 2)
        category = random.choice(["Electronics", "Cryptocurrency", "Wire Transfer", "Jewelry", "Travel"])
        device = random.choice(["Virtual Card", "Unknown", "Desktop"])
        is_intl = random.choice([True, True, False])  # 67% international for fraud
        location = random.choice(["Mumbai, MH", "Delhi, DL", "Bangalore, KA", "Hyderabad, TS"])
        prev_fraud = random.choice([1, 1, 0])  # 67% have prior fraud history
        txn_type = random.choice(["Transfer", "Withdrawal", "Purchase"])
    else:
        # Safe pattern: lower amount, daytime, common category, domestic
        hour = random.randint(8, 21)
        amount = round(random.uniform(100, 15000), 2)
        category = random.choice(["Food & Dining", "Grocery", "Fuel", "Healthcare", "Entertainment", "Other"])
        device = random.choice(["Mobile", "POS Terminal", "Mobile", "Desktop"])
        is_intl = random.choice([False, False, False, True])  # 25% international for safe
        location = random.choice(LOCATIONS)
        prev_fraud = 0
        txn_type = random.choice(["Purchase", "Payment", "Purchase", "Refund"])

    # Construct timestamp with correct hour
    base = datetime.now() - timedelta(days=random.randint(0, 30))
    ts = base.replace(hour=hour, minute=random.randint(0, 59), second=random.randint(0, 59))

    return {
        "transaction_id":      f"TXN{uuid.uuid4().hex[:10].upper()}",
        "amount":              amount,
        "timestamp":           ts.strftime("%Y-%m-%d %H:%M:%S"),
        "merchant_category":   category,
        "location":            location,
        "device_type":         device,
        "transaction_type":    txn_type,
        "international":       "Yes" if is_intl else "No",
        "previous_fraud_flag": prev_fraud,
    }


def create_excel(rows: list[dict], filepath: str, title: str):
    """Writes rows to a formatted .xlsx file."""
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Transactions"

    # Column headers
    headers = [
        "transaction_id", "amount", "timestamp", "merchant_category",
        "location", "device_type", "transaction_type",
        "international", "previous_fraud_flag"
    ]

    # Header styling
    header_fill = PatternFill("solid", fgColor="1E293B")
    header_font = Font(bold=True, color="FFFFFF", size=11)

    for col_idx, header in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col_idx, value=header)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center")

    ws.row_dimensions[1].height = 22

    # Data rows — highlight fraud rows in light red
    fraud_fill = PatternFill("solid", fgColor="FEE2E2")

    for row_idx, row in enumerate(rows, 2):
        values = [row[h] for h in headers]
        for col_idx, value in enumerate(values, 1):
            ws.cell(row=row_idx, column=col_idx, value=value)

    # Auto-size columns
    for col_idx, header in enumerate(headers, 1):
        col_letter = get_column_letter(col_idx)
        max_len = max(len(str(header)), max(len(str(row[header])) for row in rows))
        ws.column_dimensions[col_letter].width = min(max_len + 4, 35)

    # Freeze header row
    ws.freeze_panes = "A2"

    wb.save(filepath)
    print(f"  ✅ Saved: {filepath}  ({len(rows)} rows)")


def generate_dataset(n: int, fraud_rate: float) -> list[dict]:
    """Generates n transactions with given fraud rate, then shuffles."""
    n_fraud = int(n * fraud_rate)
    n_safe  = n - n_fraud
    rows = [make_transaction(True) for _ in range(n_fraud)] + \
           [make_transaction(False) for _ in range(n_safe)]
    random.shuffle(rows)
    return rows


def main():
    import os
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    print("\n📊 Generating sample datasets...\n")

    datasets = [
        ("01_small_dataset.xlsx",      50,   0.15, "Small (50 rows, 15% fraud)          — quick testing"),
        ("02_medium_dataset.xlsx",     300,  0.15, "Medium (300 rows, 15% fraud)         — standard testing"),
        ("03_large_dataset.xlsx",      1000, 0.15, "Large (1000 rows, 15% fraud)         — performance testing"),
        ("04_high_fraud_dataset.xlsx", 200,  0.45, "High Fraud (200 rows, 45% fraud)     — stress test alerts"),
        ("05_mostly_safe_dataset.xlsx",200,  0.05, "Mostly Safe (200 rows, 5% fraud)     — low fraud baseline"),
    ]

    for filename, n, rate, desc in datasets:
        rows = generate_dataset(n, rate)
        path = os.path.join(OUTPUT_DIR, filename)
        create_excel(rows, path, desc)

    print(f"\n✅ All 5 datasets created in: {os.path.abspath(OUTPUT_DIR)}")
    print("\nDataset guide:")
    for filename, n, rate, desc in datasets:
        print(f"  {filename:<35} {desc}")


if __name__ == "__main__":
    main()
