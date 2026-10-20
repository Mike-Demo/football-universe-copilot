# Export everything the static demo needs into docs/data.json
import json, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from src.pipeline import run
from src.graph.universe import Universe
out = run()
u = Universe()
scores = {s["name"]: s for s in u.kevin_bacon_scores()}
nodes = [{"id": n, "kind": u.kind.get(n), "degree": u.degree(n), "kevin_bacon_score": scores.get(n, {}).get("kevin_bacon_score")} for n in sorted(u.adj)]
edges, seen = [], set()
for a, nbrs in u.adj.items():
    for b, label in nbrs.items():
        k = tuple(sorted((a, b)))
        if k in seen: continue
        seen.add(k); edges.append({"source": a, "target": b, "label": label})
from src.season.simulator import PL, BASE_HOME, BASE_AWAY
_lh = BASE_HOME * PL["Arsenal"][0] / PL["Manchester City"][1]   # Poisson lambda, same formula as the season simulator
_la = BASE_AWAY * PL["Manchester City"][0] / PL["Arsenal"][1]
data = {
  "model": {"xg_home": round(_lh, 2), "xg_away": round(_la, 2),
            "note": "Poisson expected goals from the season simulator ratings (attack/defence) — the same lambda values the season draw uses."},
  "fixture": out["match"]["fixture"], "final_score": out["match"]["final_score"],
  "events": out["match"]["events"], "stats": out["stats"], "graph_context": out["graph_context"],
  "narrative": out["narrative"], "personalized": out["personalized"], "overlay": out["overlay"],
  "graph": {"nodes": nodes, "edges": edges, "highlight_path": out["graph_context"]["anelka_to_haaland"]},
}
dest = pathlib.Path(__file__).resolve().parents[1] / "docs" / "data.json"
dest.write_text(json.dumps(data, indent=1))
print("wrote", dest, len(data["events"]), "events,", len(nodes), "nodes,", len(edges), "edges")
