import os
from datetime import datetime
from dotenv import load_dotenv
from nba_api.stats.endpoints import playergamelog
from nba_api.stats.static import players
from groq import Groq

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def get_current_season():
    today = datetime.today()
    year = today.year
    month = today.month
    if month >= 10:
        return f"{year}-{str(year + 1)[-2:]}"
    else:
        return f"{year - 1}-{str(year)[-2:]}"

def get_player_stats(player_name, num_games=5):
    matches = players.find_players_by_full_name(player_name)
    if not matches:
        return None, None

    player = matches[0]
    player_id = player['id']

    season = get_current_season()
    gamelog = playergamelog.PlayerGameLog(player_id=player_id, season=season)
    df = gamelog.get_data_frames()[0].head(num_games)

    stats_summary = []
    for _, row in df.iterrows():
        stats_summary.append(
            f"{row['GAME_DATE']} vs {row['MATCHUP'].split()[-1]}: "
            f"{row['PTS']} pts, {row['REB']} reb, {row['AST']} ast, "
            f"{row['FG_PCT']*100:.1f}% FG"
        )

    return player['full_name'], stats_summary


def generate_scout_report(player_name, stats):
    prompt = f"""You are an NBA scout. Based on these recent game stats for {player_name},
write a concise 3-paragraph scouting report covering current form, strengths, and concerns.
Write in plain professional prose. No bullet points, headers, or emojis.

Recent games:
""" + "\n".join(stats)

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}]
    )

    return response.choices[0].message.content


def generate_comparison_report(name_a, stats_a, name_b, stats_b):
    prompt = f"""You are an NBA scout comparing two players based on their last five games.
Write a clear comparison covering who is in better current form, how their playmaking
and scoring differ, and which player has the edge right now and why.
Write in plain professional prose, structured in 3 short paragraphs.
No bullet points, headers, or emojis.

{name_a} recent games:
""" + "\n".join(stats_a) + f"""

{name_b} recent games:
""" + "\n".join(stats_b)

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}]
    )

    return response.choices[0].message.content