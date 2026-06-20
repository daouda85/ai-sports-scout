from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from scout import get_player_stats, generate_scout_report, generate_comparison_report
from nba_api.stats.static import players

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class ScoutRequest(BaseModel):
    player_name: str

class CompareRequest(BaseModel):
    player_a: str
    player_b: str

@app.get("/")
def root():
    return {"status": "running"}

@app.get("/search")
def search_players(query: str):
    if len(query) < 2:
        return {"results": []}

    all_players = players.get_players()
    query_lower = query.lower()

    matches = [
        p["full_name"] for p in all_players
        if query_lower in p["full_name"].lower()
    ]

    return {"results": matches[:8]}

@app.post("/scout")
def scout_player(request: ScoutRequest):
    name, stats = get_player_stats(request.player_name)

    if not name:
        raise HTTPException(status_code=404, detail="Player not found")

    report = generate_scout_report(name, stats)

    return {
        "player": name,
        "stats": stats,
        "report": report
    }

@app.post("/compare")
def compare_players(request: CompareRequest):
    name_a, stats_a = get_player_stats(request.player_a)
    if not name_a:
        raise HTTPException(status_code=404, detail=f"Player '{request.player_a}' not found")

    name_b, stats_b = get_player_stats(request.player_b)
    if not name_b:
        raise HTTPException(status_code=404, detail=f"Player '{request.player_b}' not found")

    report = generate_comparison_report(name_a, stats_a, name_b, stats_b)

    return {
        "player_a": {"name": name_a, "stats": stats_a},
        "player_b": {"name": name_b, "stats": stats_b},
        "report": report
    }