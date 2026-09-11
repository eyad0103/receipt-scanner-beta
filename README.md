# ReceiptFlow

AI-powered receipt scanner with real OCR processing. Scan receipts, extract items/prices/totals, and manage your spending.

## Features

- **AI Receipt Scanning** — SmolVLM (fine-tuned VLM) + EasyOCR fallback
- **Real OCR** — Not mocked, actual image processing with structured extraction
- **Full Receipt Editing** — Edit merchants, items, prices, dates after scan
- **Multi-language** — Arabic + English receipt support
- **Dark/Light Themes** — Toggle with system preference detection
- **Responsive Design** — Works on mobile, tablet, and desktop
- **Auth System** — Email/password authentication with JWT
- **Dashboard** — Spending analytics with charts
- **Legal Compliance** — Privacy policy, terms, cookie consent

## Architecture

```
Frontend (React 19 + Vite + Tailwind)
    ↓
Node.js Backend (Express 5 + TypeScript)
    ↓
Python OCR Service (FastAPI)
    ↓
SmolVLM-256M (fine-tuned) → EasyOCR fallback
```

| Service | Port | Description |
|---------|------|-------------|
| Frontend | 5173 | Vite dev server |
| Backend | 3001 | Express API |
| OCR Service | 8001 | Python FastAPI |
| SmolVLM AI | 8000 | SmolVLM inference |

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.10+
- npm

### 1. Install dependencies

```bash
# Frontend + Backend
npm install

# Python OCR service
cd ocr-service
pip install -r requirements.txt
```

### 2. Download the AI model

The SmolVLM model requires HuggingFace Hub access. The adapter is in `smolvlm-receipt/` (included). The base model `HuggingFaceTB/SmolVLM-256M-Instruct` will auto-download on first run.

### 3. Start everything

```bash
start-fullstack.bat
```

Or start services individually:
- **SmolVLM AI**: `start-ai.bat`
- **OCR Service**: `cd ocr-service && python main.py`
- **Backend**: `cd server && npx tsx src/index.ts`
- **Frontend**: `npx vite --host`

### 4. Open

Visit `http://localhost:5173`

## Tech Stack

- **Frontend**: React 19, Vite 8, Tailwind CSS v4, React Router, Framer Motion, Recharts
- **Backend**: Express 5, TypeScript, SQLite, Sharp, Tesseract.js
- **AI**: SmolVLM-256M-Instruct (LoRA fine-tuned), EasyOCR
- **Python**: FastAPI, PyTorch, HuggingFace Transformers, PEFT

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/receipts/scan` | Scan a receipt image |
| GET | `/api/receipts` | List all receipts |
| PUT | `/api/receipts/:id` | Update a receipt |
| DELETE | `/api/receipts/:id` | Delete a receipt |
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/receipts/health` | Health check |

## License

MIT
