# Azure Functions (Python v2 model) — HTTP API over the same pipeline the static demo uses.
# Deploy: see infra/README.md. Local fallback: src/api/app.py (FastAPI) or python -m src.pipeline.
import json, time
import azure.functions as func
from src.pipeline import run
from src.graph.universe import Universe
app = func.FunctionApp(http_auth_level=func.AuthLevel.ANONYMOUS)
@app.route(route="health", methods=["GET"])
def health(req): return func.HttpResponse(json.dumps({"ok": True, "synthetic_only": True}), mimetype="application/json")
_CACHE = {}
_THROTTLE = {}
def _throttled(req):
    ip = (req.headers.get("x-forwarded-for") or "unknown").split(",")[0].strip()
    now = time.time(); hits = [t for t in _THROTTLE.get(ip, []) if now - t < 60]
    if len(hits) >= 20:
        _THROTTLE[ip] = hits; return True
    hits.append(now); _THROTTLE[ip] = hits; return False
@app.route(route="match/intelligence", methods=["GET"])
def intelligence(req):
    # Spend guardrails for an anonymous, model-backed endpoint (Copilot review, PR #4):
    # responses are cached per focus player for 10 minutes (narration included), and each
    # client IP is throttled to 20 requests/minute. In-memory and per-instance, so these
    # bound - not eliminate - model spend; the budget alert remains the outer guardrail.
    if _throttled(req):
        return func.HttpResponse(json.dumps({"error": "rate_limited", "detail": "20 requests/minute per client; try again shortly."}), status_code=429, mimetype="application/json")
    focus = req.params.get("focus_player", "Erling Haaland")
    hit = _CACHE.get(focus)
    if hit and time.time() - hit[0] < 600:
        return func.HttpResponse(hit[1], mimetype="application/json")
    out = run(focus_player=focus)
    body = json.dumps({k: out[k] for k in ("stats", "graph_context", "narrative", "personalized", "overlay")})
    _CACHE[focus] = (time.time(), body)
    return func.HttpResponse(body, mimetype="application/json")
@app.route(route="graph/path", methods=["GET"])
def path(req):
    u = Universe(); a, b = req.params.get("a", ""), req.params.get("b", "")
    p = u.shortest_path(a, b)
    return func.HttpResponse(json.dumps({"from": a, "to": b, "degrees": (len(p) - 1 if p else None), "path": p, "edges": u.path_edges(p)}), mimetype="application/json")
@app.route(route="season", methods=["GET"])
def season(req):
    from src.season.simulator import build_season
    s = build_season(); key = req.params.get("league", "premier_league")
    lg = s[key]
    return func.HttpResponse(json.dumps({"competition": lg["competition"], "standings": lg["standings"], "narratives": lg["narratives"], "synthetic": True}), mimetype="application/json")
@app.route(route="graph/leaderboard", methods=["GET"])
def leaderboard(req): return func.HttpResponse(json.dumps(Universe().kevin_bacon_scores()[:20]), mimetype="application/json")
