# Full-season SYNTHETIC simulation — seeded, deterministic, no real results anywhere.
# Two competitions: Premier League (20 clubs, 380 matches) and Women's Super League (12 clubs, 132).
# Every match is simulated from plausible club strength ratings (attack/defence) with a Poisson
# goals model; standings, form, progression and season narratives are computed, never authored.
import math, random
# club: (attack, defence) — higher attack scores more; higher defence concedes fewer. Plausible ordering, synthetic values.
PL = {
 "Arsenal": (1.34,1.36), "Manchester City": (1.38,1.30), "Liverpool": (1.33,1.26), "Chelsea": (1.20,1.12),
 "Tottenham Hotspur": (1.16,1.02), "Manchester United": (1.14,1.04), "Newcastle United": (1.18,1.10),
 "Aston Villa": (1.16,1.08), "Brighton & Hove Albion": (1.10,1.04), "West Ham United": (1.02,0.96),
 "Crystal Palace": (1.06,1.04), "Fulham": (1.04,1.02), "Brentford": (1.08,0.98), "Nottingham Forest": (1.02,1.08),
 "Everton": (0.98,1.02), "Bournemouth": (1.06,0.96), "Wolverhampton Wanderers": (0.94,0.90),
 "Leeds United": (0.98,0.90), "Burnley": (0.84,0.82), "Sunderland": (0.90,0.90),
}
WSL = {
 "Chelsea": (1.36,1.28), "Arsenal": (1.30,1.24), "Manchester City": (1.28,1.20), "Manchester United": (1.20,1.14),
 "Tottenham Hotspur": (1.08,1.02), "Liverpool": (1.06,1.02), "Brighton & Hove Albion": (1.04,1.00),
 "Aston Villa": (1.02,1.00), "Everton": (0.98,0.98), "West Ham United": (0.94,0.94),
 "Leicester City": (0.90,0.90), "London City Lionesses": (0.94,0.92),
}
BASE_HOME, BASE_AWAY = 1.42, 1.12  # league-average expected goals
def poisson(rng, lam):
    L, k, p = math.exp(-lam), 0, 1.0
    while True:
        p *= rng.random()
        if p <= L: return k
        k += 1
def fixtures(clubs):
    teams = list(clubs); n = len(teams); rounds = []
    arr = teams[:]
    for r in range(n - 1):
        pairs = [(arr[i], arr[n - 1 - i]) for i in range(n // 2)]
        if r % 2: pairs = [(b, a) for a, b in pairs]
        rounds.append(pairs)
        arr = [arr[0]] + [arr[-1]] + arr[1:-1]
    second = [[(b, a) for a, b in rd] for rd in rounds]
    out = []
    for i, rd in enumerate(rounds + second, 1):
        for h, a in rd: out.append({"matchweek": i, "home": h, "away": a})
    return out
def simulate(clubs, seed, relegation_spots):
    rng = random.Random(seed)
    table = {c: {"club": c, "played": 0, "won": 0, "drawn": 0, "lost": 0, "gf": 0, "ga": 0,
                 "points": 0, "form": [], "progression": [], "home_points": 0, "away_points": 0} for c in clubs}
    matches = []
    for f in fixtures(clubs):
        h, a = f["home"], f["away"]
        xg_h = BASE_HOME * clubs[h][0] / clubs[a][1]; xg_a = BASE_AWAY * clubs[a][0] / clubs[h][1]
        gh, ga = poisson(rng, xg_h), poisson(rng, xg_a)
        shots_h = gh + rng.randint(5, 12); shots_a = ga + rng.randint(4, 11)
        poss_h = max(28, min(72, round(50 + (clubs[h][0] + clubs[h][1] - clubs[a][0] - clubs[a][1]) * 22 + rng.uniform(-6, 6))))
        matches.append({**f, "home_goals": gh, "away_goals": ga, "home_shots": shots_h, "away_shots": shots_a, "home_possession": poss_h})
        T = table
        T[h]["played"] += 1; T[a]["played"] += 1; T[h]["gf"] += gh; T[h]["ga"] += ga; T[a]["gf"] += ga; T[a]["ga"] += gh
        if gh > ga: T[h]["won"] += 1; T[a]["lost"] += 1; T[h]["points"] += 3; T[h]["home_points"] += 3; T[h]["form"].append("W"); T[a]["form"].append("L")
        elif ga > gh: T[a]["won"] += 1; T[h]["lost"] += 1; T[a]["points"] += 3; T[a]["away_points"] += 3; T[h]["form"].append("L"); T[a]["form"].append("W")
        else: T[h]["drawn"] += 1; T[a]["drawn"] += 1; T[h]["points"] += 1; T[a]["points"] += 1; T[h]["home_points"] += 1; T[a]["away_points"] += 1; T[h]["form"].append("D"); T[a]["form"].append("D")
        for c in (h, a): T[c]["progression"].append(T[c]["points"])
    standings = sorted(table.values(), key=lambda r: (-r["points"], -(r["gf"] - r["ga"]), -r["gf"], r["club"]))
    for i, r in enumerate(standings, 1):
        r["position"] = i; r["gd"] = r["gf"] - r["ga"]; r["form"] = r["form"][-5:]
        r["zone"] = "champions" if i == 1 else ("ucl" if i <= 4 else ("relegation" if i > len(standings) - relegation_spots else ""))
    return matches, standings
def narratives(standings, matches, comp):
    champ, second = standings[0], standings[1]
    rel = [r["club"] for r in standings if r["zone"] == "relegation"]
    best_attack = max(standings, key=lambda r: r["gf"]); best_def = min(standings, key=lambda r: r["ga"])
    chaos = max(matches, key=lambda m: m["home_goals"] + m["away_goals"])
    total_goals = sum(m["home_goals"] + m["away_goals"] for m in matches)
    return [
        f"{champ['club']} win the synthetic {comp} with {champ['points']} points — {champ['points']-second['points']} clear of {second['club']}.",
        f"Relegation: {', '.join(rel)} go down in this simulation.",
        f"Best attack: {best_attack['club']} ({best_attack['gf']} goals). Meanest defence: {best_def['club']} ({best_def['ga']} conceded).",
        f"Highest-scoring match: {chaos['home']} {chaos['home_goals']}–{chaos['away_goals']} {chaos['away']} (matchweek {chaos['matchweek']}).",
        f"Season total: {total_goals} goals across {len(matches)} simulated matches ({total_goals/len(matches):.2f} per match)."]
def build_season():
    out = {"synthetic": True, "note": "Entirely simulated season — seeded model output, NOT real results. Club strength ratings are plausible synthetic values."}
    for key, clubs, seed, rel, name in (("premier_league", PL, 20261020, 3, "Premier League"),
                                        ("wsl", WSL, 20261021, 1, "Women's Super League")):
        m, s = simulate(clubs, seed, rel)
        out[key] = {"competition": name, "clubs": len(clubs), "matches_played": len(m),
                    "standings": s, "matches": m, "narratives": narratives(s, m, name)}
    return out
