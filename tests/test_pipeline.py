import unittest
from src.synthetic.generator import generate
from src.graph.universe import Universe
from src.pipeline import run
class T(unittest.TestCase):
    def test_synthetic_only(self):
        m=generate(); assert all(e["synthetic"] for e in m["events"]) and len(m["events"])>100
    def test_anelka_haaland_path(self):
        p=Universe().shortest_path("Nicolas Anelka","Erling Haaland"); assert p and p[0]=="Nicolas Anelka" and p[-1]=="Erling Haaland" and len(p)-1<=6
    def test_pipeline_agents_and_modes(self):
        o=run(); assert o["agents"]==["Interpreter","GraphContext","Narrator","Personalizer"]
        assert set(o["personalized"])>={"analyst","casual_fan","player_focus","es"} and o["overlay"]["timed"] and o["overlay"]["feed"]
    def test_threshold_alerts_and_club_mode(self):
        o=run(); assert "club_focus" in o["personalized"] and o["stats"]["threshold_alerts"]
        assert any(e.get("player_speed_kmh") is not None for e in o["match"]["events"])
    def test_narration_source_is_honest(self):
        o=run(); s=o["narrative"]["narration_source"]; assert s=="template-fallback" or s.startswith(("azure-openai:","microsoft-foundry:"))
        from src.agents.framework_adapter import describe_runtime; assert describe_runtime()["agents"]==["Interpreter","GraphContext","Narrator","Personalizer"]
    def test_leaderboard(self):
        lb=Universe().kevin_bacon_scores(); assert lb and all(0<=x["kevin_bacon_score"]<=10 for x in lb)
if __name__=="__main__": unittest.main()
