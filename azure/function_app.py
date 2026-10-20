# Azure Functions (Python v2 model) — HTTP API over the same pipeline the static demo uses.
# Deploy: see infra/README.md. Local fallback: src/api/app.py (FastAPI) or python -m src.pipeline.
import json
import azure.functions as func
from src.pipeline import run
from src.graph.universe import Universe
app = func.FunctionApp(http_auth_level=func.AuthLevel.ANONYMOUS)
@app.route(route="health", methods=["GET"])
def health(req): return func.HttpResponse(json.dumps({"ok": True, "synthetic_only": True}), mimetype="application/json")
@app.route(route="match/intelligence", methods=["GET"])
def intelligence(req):
    out = run(focus_player=req.params.get("focus_player", "Erling Haaland"))
    return func.HttpResponse(json.dumps({k: out[k] for k in ("stats", "graph_context", "narrative", "personalized", "overlay")}), mimetype="application/json")
@app.route(route="graph/path", methods=["GET"])
def path(req):
    u = Universe(); a, b = req.params.get("a", ""), req.params.get("b", "")
    p = u.shortest_path(a, b)
    return func.HttpResponse(json.dumps({"from": a, "to": b, "degrees": (len(p) - 1 if p else None), "path": p, "edges": u.path_edges(p)}), mimetype="application/json")
@app.route(route="graph/leaderboard", methods=["GET"])
def leaderboard(req): return func.HttpResponse(json.dumps(Universe().kevin_bacon_scores()[:20]), mimetype="application/json")
