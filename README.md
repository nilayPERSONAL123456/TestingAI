# PraxisCA - CRM & Practice Management for Chartered Accountants

A modern, free, open-source CRM and Practice Management platform designed for Indian Chartered Accountants and CA firms.

## Features (MVP)

- **Lead Management** - Capture, track, and convert leads with pipeline stages
- **Client Management** - Full client database with PAN, GSTIN, entity type tracking
- **Compliance Calendar** - Auto-generated GST/IT/ROC/PF/ESI tracker with 14 Indian rules
- **Task Management** - Prioritized tasks with status tracking and due dates
- **GST Invoicing** - Invoice generation with CGST/SGST/IGST auto-calculation
- **Payment Tracking** - Record payments, track outstanding balances
- **Dashboard** - Real-time KPIs: clients, compliance status, revenue, tasks

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.12 + FastAPI |
| Database | SQLite (zero-cost, no setup) |
| Frontend | React 18 + Vite + Tailwind CSS |
| Auth | JWT (bcrypt hashed passwords) |
| API | REST with auto-generated Swagger docs |
| Containers | Docker + Docker Compose |

## Quick Start

### Option 1: Docker Compose (recommended)

```bash
docker-compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Option 2: Manual Setup

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## Getting Started

1. Open http://localhost:3000
2. Click "Register" and create your account
3. Login with your credentials
4. Go to Compliance > Click "Seed Rules" to load Indian compliance rules
5. Add clients and generate their compliance calendars
6. Create tasks, invoices, and track everything from the dashboard

## Indian Compliance Rules (Pre-loaded)

| Code | Name | Frequency |
|------|------|-----------|
| GSTR1_M | GSTR-1 Monthly | Monthly |
| GSTR3B_M | GSTR-3B Monthly | Monthly |
| GSTR9 | Annual Return | Yearly |
| TDS_24Q | TDS - Salary | Quarterly |
| TDS_26Q | TDS - Non-Salary | Quarterly |
| ITR_IND | ITR Individual | Yearly |
| ITR_AUDIT | ITR Audit Cases | Yearly |
| TAR_3CD | Tax Audit Report | Yearly |
| ROC_AOC4 | AOC-4 Filing | Yearly |
| ROC_MGT7 | MGT-7 Filing | Yearly |
| ROC_DIR3 | DIR-3 KYC | Yearly |
| PF_ECR | PF ECR Filing | Monthly |
| ESI | ESI Filing | Monthly |
| PT_M | Professional Tax | Monthly |

## API Documentation

Visit http://localhost:8000/docs for interactive Swagger UI.

## Cost

**$0/month** - Everything runs locally or on any $5/month VPS.

## License

MIT
