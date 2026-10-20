import unittest, xml.etree.ElementTree as ET, pathlib
NS = "{http://fifa.com/fc}"
ROOT = pathlib.Path(__file__).resolve().parents[1] / "docs" / "fds"
class TestFDS(unittest.TestCase):
    def test_featured(self):
        d = ET.parse(ROOT / "featured-match.xml"); m = d.getroot().find(f"{NS}Match")
        self.assertEqual(m.get("Status"), "Played")
        phases = {p.get("Phase"): (p.get("HomeScore"), p.get("AwayScore")) for p in m.findall(f"{NS}Phase")}
        self.assertEqual(phases["1H"], ("0", "1")); self.assertEqual(phases["2H"], ("0", "1"))
        goals = [e for e in m.findall(f"{NS}MatchEvent") if e.get("EventType") == "Goal"]
        self.assertEqual(len(goals), 1); self.assertEqual(goals[0].get("Minute"), "36")
        self.assertTrue(all(len(x) == 7 for x in [m.get("MatchFIFAId"), m.get("CompetitionFIFAId")]))
    def test_season_counts(self):
        for f, n in (("premier-league-season.xml", 380), ("wsl-season.xml", 132)):
            d = ET.parse(ROOT / f)
            self.assertEqual(len(d.getroot().findall(f"{NS}Match")), n)
if __name__ == "__main__": unittest.main()
