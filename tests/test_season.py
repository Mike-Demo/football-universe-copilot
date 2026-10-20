import sys, unittest, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from src.season.simulator import build_season, PL, WSL
class T(unittest.TestCase):
    @classmethod
    def setUpClass(cls): cls.s = build_season()
    def test_counts(self):
        pl, w = self.s["premier_league"], self.s["wsl"]
        assert pl["matches_played"] == 380 and w["matches_played"] == 132
        assert all(r["played"] == 38 for r in pl["standings"]) and all(r["played"] == 22 for r in w["standings"])
    def test_table_math(self):
        for key in ("premier_league", "wsl"):
            st = self.s[key]["standings"]
            assert sum(r["gf"] for r in st) == sum(r["ga"] for r in st)
            for r in st: assert r["points"] == 3 * r["won"] + r["drawn"] and r["played"] == r["won"] + r["drawn"] + r["lost"]
            pts = [r["points"] for r in st]; assert pts == sorted(pts, reverse=True)
            assert len([r for r in st if r["zone"] == "relegation"]) == (3 if key == "premier_league" else 1)
    def test_deterministic(self):
        assert build_season()["premier_league"]["standings"][0] == self.s["premier_league"]["standings"][0]
if __name__ == "__main__": unittest.main()
