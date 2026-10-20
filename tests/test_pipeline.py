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
    def test_leaderboard(self):
        lb=Universe().kevin_bacon_scores(); assert lb and all(0<=x["kevin_bacon_score"]<=10 for x in lb)
if __name__=="__main__": unittest.main()
