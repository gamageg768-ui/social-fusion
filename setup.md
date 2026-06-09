# SocialFusion Setup

## Prerequisites
- Python 3.9+, Node.js 18+, VS Code

## Backend
```bash
cd backend
pip install -r requirements.txt
python app.py
```
Runs at http://localhost:5000 — seeds all dummy data automatically on first run.

## Frontend
```bash
cd frontend
npm install
npm run dev
```
Runs at http://localhost:5173

## Build for production
```bash
cd frontend && npm run build
```

## Stack
- **Frontend**: React + TypeScript + Vite + PWA
- **Backend**: Python Flask + SQLite (via Flask-SQLAlchemy)
- **Dummy data**: 15 users, 30 posts, stories, messages, reels, notifications — auto-seeded
