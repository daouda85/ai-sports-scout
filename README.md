# NBA Scout Agent

A full-stack AI web application that generates professional scouting reports for any NBA player using live current-season box scores.

Live demo: https://ai-sports-scout.vercel.app

## What it does

- Search any NBA player by name with real-time autocomplete suggestions
- Pulls the player's last five games from current-season box scores
- Generates a concise 3-paragraph scouting report using an LLM
- Compare two players head-to-head with a side-by-side stats view and AI-generated analysis

## Tech stack

**Backend**
- Python, FastAPI
- nba_api for live NBA stats
- Groq API (Llama 3.3) for LLM inference
- Deployed on Render

**Frontend**
- React, Vite
- Deployed on Vercel

## Running locally

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file in the `backend` folder:
GROQ_API_KEY=your_groq_api_key_here

Start the server:

```bash
uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Then open `http://localhost:5173`.

## API endpoints

- `GET /search?query=` — returns matching player names
- `POST /scout` — generates a scouting report for a single player
- `POST /compare` — generates a head-to-head comparison for two players

## Built by

Daouda Tandian