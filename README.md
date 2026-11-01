
# 💳 Real-Time Credit Card Fraud Detection System

A full-stack Machine Learning application designed to detect potentially fraudulent credit card transactions using transaction datasets and manual transaction inputs.

The system analyzes transactions using a Random Forest classifier and displays fraud detection results through an interactive dashboard with real-time updates.

## 🚀 Project Overview

This project provides a platform for analyzing financial transactions and identifying suspicious activities using Machine Learning.

Users can upload Excel or CSV transaction datasets, analyze individual transactions manually, and monitor fraud detection results through an interactive dashboard.

## ✨ Key Features

- **Dataset Upload:** Upload Excel (.xlsx) and CSV transaction datasets.
- **Machine Learning Detection:** Classify transactions as Fraudulent or Safe.
- **Manual Transaction Analysis:** Enter transaction details and receive individual predictions.
- **Real-Time Dashboard:** Monitor transaction processing through WebSocket updates.
- **Fraud Analytics:** Visualize fraudulent and safe transaction statistics.
- **Risk Classification:** Categorize transactions into Low, Medium, High and Critical risk levels.
- **Fraud Alerts:** Display alerts when suspicious transactions are detected.
- **Transaction History:** View analyzed transactions in a dashboard table.

## 🛠️ Technology Stack

| Component | Technologies |
|---|---|
| Frontend | Next.js 15, React 19, TypeScript |
| UI & Styling | Tailwind CSS, shadcn/ui |
| Backend | Python, FastAPI |
| Machine Learning | Scikit-learn, Random Forest |
| Data Processing | Pandas, NumPy, OpenPyXL |
| Real-Time Communication | WebSockets |
| Model Processing | StandardScaler, SMOTE |

## 🧠 Machine Learning Approach

The system uses a Random Forest Classifier for transaction classification.

The model processes transaction features such as:

- Transaction amount
- Transaction time
- Location
- Night-time transaction indicator
- Additional transaction risk indicators

The prediction pipeline includes:

1. Transaction data preprocessing.
2. Feature extraction.
3. Feature scaling using StandardScaler.
4. Class imbalance handling using SMOTE during training.
5. Random Forest classification.
6. Fraud probability and risk assessment.

If trained model artifacts are unavailable, the backend can use its rule-based fallback prediction logic.

**Note:** The current training pipeline uses synthetic training data. Its predictions are intended for academic demonstration, not real banking decisions.

## 🏗️ System Architecture

```text
          USER
           |
           v
    NEXT.JS FRONTEND
           |
     +-----+------+
     |            |
     v            v
 Excel / CSV   Manual Entry
     |            |
     +------+-----+
            |
            v
      FASTAPI BACKEND
            |
            v
     MACHINE LEARNING
      RANDOM FOREST
            |
            v
    FRAUD PREDICTION
            |
            v
     WEBSOCKET UPDATES
            |
            v
    INTERACTIVE DASHBOARD
            |
     +------+------+
     |             |
     v             v
 Fraud Alerts   Analytics
```

## 📂 Project Structure

```text
Credit-Card-Fraud-Detection/
│
├── Client/
│   ├── app/
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   └── package.json
│
├── backend/
│   ├── main.py
│   ├── model.py
│   ├── utils.py
│   ├── train_model.py
│   ├── generate_samples.py
│   ├── requirements.txt
│   └── ml_artifacts/
│
├── sample_datasets/
│   ├── 01_small_dataset.xlsx
│   ├── 02_medium_dataset.xlsx
│   ├── 03_large_dataset.xlsx
│   ├── 04_high_fraud_dataset.xlsx
│   └── 05_mostly_safe_dataset.xlsx
│
├── PROJECT_DOCUMENTATION.md
└── README.md
```

## ⚙️ Installation and Setup

### Prerequisites

- Python 3.11 recommended
- Node.js 18 or later
- npm
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/CodeCrafter666/-Real-Time-Credit-Card-Fraud-Detection-System.git
```

Navigate into the project:

```bash
cd -Real-Time-Credit-Card-Fraud-Detection-System
```

### 2. Setup Backend

```bash
cd backend
```

Create a virtual environment:

```bash
py -3.11 -m venv venv
```

Activate it in Windows PowerShell:

```powershell
.\venv\Scripts\Activate.ps1
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Train the Machine Learning model:

```bash
python train_model.py
```

Start the backend:

```bash
uvicorn main:app --reload --port 8000
```

Backend API:

http://127.0.0.1:8000

API documentation:

http://127.0.0.1:8000/docs

### 3. Setup Frontend

Open a second terminal:

```bash
cd Client
```

Install dependencies:

```bash
npm install
```

Create a `.env.local` file in the Client directory:

```env
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws/upload-progress
```

Start the frontend:

```bash
npm run dev
```

Open the application:

http://localhost:3000

## 📊 Sample Datasets

The repository includes five sample Excel datasets for testing different transaction scenarios:

| Dataset | Description |
|---|---|
| 01_small_dataset.xlsx | Small transaction dataset |
| 02_medium_dataset.xlsx | Medium transaction dataset |
| 03_large_dataset.xlsx | Large transaction dataset |
| 04_high_fraud_dataset.xlsx | Higher proportion of fraudulent transactions |
| 05_mostly_safe_dataset.xlsx | Mostly legitimate transactions |

These datasets are provided for testing and demonstration.

## 🔍 API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/upload-transactions` | Upload transaction dataset |
| POST | `/analyze-dataset` | Analyze uploaded transactions |
| POST | `/analyze-transaction` | Analyze a manual transaction |
| GET | `/transactions` | Retrieve transaction history |
| GET | `/stats` | Retrieve fraud statistics |
| WebSocket | `/ws/upload-progress` | Receive real-time updates |

## ⚠️ Limitations

- The current ML model is trained using synthetic data.
- Transaction history is stored in memory and resets when the backend restarts.
- The system is an academic prototype, not a production banking solution.
- Predictions should not be treated as verified financial fraud decisions.

## 🔮 Future Improvements

- Integration with real-world fraud datasets.
- Database integration using PostgreSQL.
- User authentication and authorization.
- Improved feature engineering and model evaluation.
- SHAP-based prediction explainability.
- Cloud deployment and scalability.

## 👨‍💻 Author

**Arvind Pareek**

BCA – Data Science and Data Analytics

GitHub: https://github.com/CodeCrafter666

---

⭐ If you find this project interesting, consider giving the repository a star!
