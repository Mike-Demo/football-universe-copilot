import json, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from src.season.simulator import build_season
s = build_season()
out = pathlib.Path(__file__).resolve().parents[1] / "docs" / "season.json"
out.write_text(json.dumps(s))
for k in ("premier_league", "wsl"):
    lg = s[k]; print(k, lg["matches_played"], "matches; champion:", lg["standings"][0]["club"], lg["standings"][0]["points"], "pts")
print("wrote", out, out.stat().st_size, "bytes")
