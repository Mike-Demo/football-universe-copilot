# Minimal API (FastAPI if installed, else run src/pipeline.py directly).
try:
    from fastapi import FastAPI
    from src.pipeline import run
    from src.graph.universe import Universe
    app=FastAPI(title="Football Universe Copilot — Live Match Intelligence")
    @app.get("/health")
    def health(): return {"ok":True,"synthetic_only":True}
    @app.get("/match/intelligence")
    def intelligence(focus_player:str="Erling Haaland"): 
        out=run(focus_player=focus_player); return {k:out[k] for k in ("stats","graph_context","narrative","personalized","overlay")}
    @app.get("/graph/path")
    def path(a:str,b:str):
        u=Universe(); p=u.shortest_path(a,b); return {"from":a,"to":b,"degrees":(len(p)-1 if p else None),"path":p,"edges":u.path_edges(p)}
    @app.get("/graph/leaderboard")
    def leaderboard(): return Universe().kevin_bacon_scores()[:20]
except ImportError:
    app=None
