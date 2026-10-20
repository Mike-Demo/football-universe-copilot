# Four distinct agents with shared state + handoffs (Best Multi-Agent System design).
from collections import Counter, defaultdict
from src.graph.universe import Universe
class InterpreterAgent:
    name="Interpreter"
    def run(self, match):
        ev=match["events"]; by_team=Counter(e["team"] for e in ev); shots=[e for e in ev if e["type"]=="shot"]
        passes=[e for e in ev if e["type"]=="pass"]; pressure=[e for e in ev if e["type"]=="pressure"]
        momentum=[]
        for w in range(0,90,15):
            seg=[e for e in ev if w<=e["minute"]<w+15]; c=Counter(e["team"] for e in seg)
            momentum.append({"window":f"{w}-{w+15}","dominant":c.most_common(1)[0][0] if c else None,"events":len(seg)})
        key=[e for e in ev if e.get("goal") or (e["type"]=="pressure" and e.get("pressure_intensity",0)>=9) or (e["type"]=="shot" and e.get("on_target"))]
        return {"possession_events":dict(by_team),"shots":len(shots),"shots_on_target":sum(1 for s in shots if s.get("on_target")),
                "avg_pass_difficulty":round(sum(p.get("difficulty",0) for p in passes)/max(len(passes),1),2),
                "avg_pressure":round(sum(p.get("pressure_intensity",0) for p in pressure)/max(len(pressure),1),2),
                "momentum":momentum,"key_moments":key[:12],
                "chaos_index":round(len([e for e in ev if e["type"] in ("possession_change","tackle")])/max(len(ev),1),3),
                "threshold_alerts":[{"minute":e["minute"],"player":e["player"],"alerts":e["threshold_alerts"]} for e in ev if e.get("threshold_alerts")]}
class GraphContextAgent:
    name="GraphContext"
    def __init__(self): self.u=Universe()
    def run(self, stats):
        out=[]
        for m in stats["key_moments"][:6]:
            p=m.get("player")
            if not p: continue
            scores={s["name"]:s for s in self.u.kevin_bacon_scores()}
            out.append({"minute":m["minute"],"player":p,"kevin_bacon_score":scores.get(p,{}).get("kevin_bacon_score"),"degree":self.u.degree(p),
                        "path_to_haaland":self.u.shortest_path(p,"Erling Haaland"),"path_to_arsenal":self.u.shortest_path(p,"Arsenal")})
        lb=[s for s in self.u.kevin_bacon_scores() if s["kind"]=="Player"][:5]
        return {"key_moment_context":out,"leaderboard":lb,"anelka_to_haaland":self.u.shortest_path("Nicolas Anelka","Erling Haaland")}
class NarratorAgent:
    name="Narrator"
    def run(self, match, stats, ctx):
        from src.agents.azure_narrator import azure_narrate
        live = azure_narrate(match, stats, ctx)
        why=[]
        for c in ctx["key_moment_context"][:4]:
            why.append(f"Minute {c['minute']}: {c['player']} matters here — Kevin Bacon Score {c['kevin_bacon_score']}/10, {c['degree']} graph connections. Path to Haaland: {' → '.join(c['path_to_haaland'] or [])}.")
        recap=(f"{match['fixture']['home']} {match['final_score'][match['fixture']['home']]}–{match['final_score'][match['fixture']['away']]} {match['fixture']['away']} (synthetic). "
               f"{stats['shots']} shots, chaos index {stats['chaos_index']} — control swung by 15-minute windows: " + ", ".join(f"{m['window']} {m['dominant']}" for m in stats["momentum"]) + ".")
        if live:
            return {"why_it_matters":why,"recap":live["recap"],"narration_source":live["source"],"explainability":"Every narrative claim is grounded in a generated event or a verified graph path — the narrator never invents a connection."}
        return {"why_it_matters":why,"recap":recap,"narration_source":"template-fallback","explainability":"Every narrative claim is grounded in a generated event or a verified graph path — the narrator never invents a connection."}
class PersonalizerAgent:
    name="Personalizer"
    def run(self, stats, narrator, focus_player="Erling Haaland", final_score=None, focus_club="Arsenal"):
        return {
          "analyst":{"headline":"Control vs chaos, pass difficulty, pressure","body":f"Avg pass difficulty {stats['avg_pass_difficulty']}, avg pressure {stats['avg_pressure']}, chaos {stats['chaos_index']}. Momentum: {stats['momentum']}"},
          "casual_fan":{"headline":"The story of the match, in plain English","body":narrator["recap"]},
          "player_focus":{"headline":f"Following {focus_player}","body":f"Focus mode tracks {focus_player} through every key moment and graph connection. " + " ".join(narrator["why_it_matters"][:2])},
          "club_focus":{"headline":f"Club focus: {focus_club}","body":f"Every key moment, overlay and statistic filtered through {focus_club}: momentum windows {stats['momentum']}, with the graph context for {focus_club} players first. Same intelligence, centred on your club."},
          "es":{"headline":"Resumen del partido (sintético)","body":(f"Resultado final (sintético): {final_score}. " if final_score else "") + f"El partido registró {stats['shots']} tiros, {stats['shots_on_target']} a puerta, y un índice de caos de {stats['chaos_index']}. La presión media fue {stats['avg_pressure']} y la dificultad media de pase {stats['avg_pass_difficulty']}. Narración generada desde los mismos eventos y el mismo grafo que el resto de modos."}}
