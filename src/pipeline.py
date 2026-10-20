# Multi-agent orchestrator: Ingest -> Interpret -> Explain (graph) -> Narrate -> Personalize -> Render.
import json
from src.synthetic.generator import generate
from src.agents.agents import InterpreterAgent, GraphContextAgent, NarratorAgent, PersonalizerAgent
from src.overlay.render import render_overlay
def run(seed=25, focus_player="Erling Haaland"):
    match=generate(seed=seed)                                   # 1 Ingest (synthetic)
    stats=InterpreterAgent().run(match)                        # 2 Interpret
    ctx=GraphContextAgent().run(stats)                         # 3 Explain — graph grounding
    narrator=NarratorAgent().run(match, stats, ctx)            # 3b Narrate
    modes=PersonalizerAgent().run(stats, narrator, focus_player, final_score=f"{match['fixture']['home']} {match['final_score'][match['fixture']['home']]}-{match['final_score'][match['fixture']['away']]} {match['fixture']['away']}")  # 5 Personalize
    overlay=render_overlay(match, stats, ctx, narrator, modes)    # 4 Render
    return {"match":match,"stats":stats,"graph_context":ctx,"narrative":narrator,"personalized":modes,"overlay":overlay,
            "agents":["Interpreter","GraphContext","Narrator","Personalizer"],"handoff":"shared state dict, each agent consumes the previous agent's output"}
if __name__=="__main__":
    out=run(); print(json.dumps({k:out[k] for k in ("stats","graph_context","narrative","personalized","overlay")}, indent=2))
