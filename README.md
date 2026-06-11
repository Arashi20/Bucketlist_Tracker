# 🌍 Bucketlist App

Gamified bucketlist tracker + scratch map. Built with React + FastAPI + PostgreSQL.

## Setup

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux

pip install -r requirements.txt

cp .env.example .env
# Edit .env and fill in your DATABASE_URL

uvicorn main:app --reload
# API runs on http://localhost:8000
# Docs at http://localhost:8000/docs
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# App runs on http://localhost:5173
```

## Project structure
```
bucketlist-app/
├── backend/
│   ├── main.py          # FastAPI app + CORS + startup
│   ├── models.py        # SQLModel database models
│   ├── database.py      # DB connection + session
│   ├── routers/
│   │   └── items.py     # CRUD endpoints for bucket items
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   ├── components/  # UI components (map, list, forms)
    │   ├── pages/       # Page-level components
    │   └── api/         # axios wrappers for backend calls
    ├── index.html
    ├── vite.config.js   # proxy /api → localhost:8000
    └── package.json
```

## Stack
- **Frontend**: React 18 + Vite + Tailwind + Leaflet
- **Backend**: FastAPI + SQLModel + asyncpg
- **Database**: PostgreSQL (Railway)
