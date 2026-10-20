# FCD v3.3-aligned export — FIFA Connect Data (the "FIFA Data Standard" package, fcd/xsd).
#
# What this is: our synthetic match data expressed in the FCD v3.3 model (namespace
# http://fifa.com/fc, types from competition.xsd) so it can be exchanged with tooling that
# speaks the standard. What it is NOT: a FIFA-certified integration — FIFA's own licence
# text reserves implementation to authorised users; this is an alignment exercise on
# synthetic data, labelled as such everywhere.
#
# Honest mapping rules (see src/fds/README.md for the full table):
#  - Status is "Played" (the FCD enum value for a completed match) — never "Officialised":
#    these are simulations, not official records.
#  - Scores live only in Phase elements, exactly as the FCD model requires. The featured
#    match knows its goal minutes, so it gets true 1H/2H phases. Season matches only have
#    full-time scores, so they carry a single 2H phase with the cumulative FT score and
#    NO 1H phase — a half-time split is never invented.
#  - MatchEvent is emitted only for goals (EventType="Goal") — the one FCD event nature
#    our event stream genuinely contains. Our telemetry events (passes, tackles, pressure)
#    have no FCD equivalent and stay in our JSON extension.
#  - Player elements are omitted: MatchPlayerType requires shirt number, captain,
#    goalkeeper and starting-lineup flags, which our synthetic model does not generate.
#    Rather than fabricate lineup data, players are left out (the schema allows it);
#    the goal event still references the scorer's synthetic person ID.
#  - All identifiers are local synthetic IDs in FCD's 7-character FIFAIdentifier
#    format with an "SYN" prefix — they are NOT real FIFA IDs.
import xml.etree.ElementTree as ET
from xml.dom import minidom

NS = "http://fifa.com/fc"
ET.register_namespace("", NS)
# FIFAIdentifier in FCD v3.3 is EXACTLY 7 characters from a restricted alphabet
# (pattern ^[0123456789ABCDEFGHIJKLMNPQRSTUVWXYZ]{6}[0123456789ABCDEFGHIJKLMNPQRSTU]$).
# Our synthetic IDs use an "SYN" prefix inside that alphabet — visibly not real FIFA IDs.
COMPETITION_IDS = {"premier_league": "SYN0001", "wsl": "SYN0002", "featured": "SYN0001"}

def _club_ids():
    from src.season.simulator import PL, WSL
    clubs = sorted(set(PL) | set(WSL))
    return {c: f"SYN1{i:03d}" for i, c in enumerate(clubs)}
CLUB_IDS = _club_ids()

def _player_ids():
    from src.synthetic.generator import SQUADS
    players = sorted({p for s in SQUADS.values() for p in s})
    return {p: f"SYN2{i:03d}" for i, p in enumerate(players)}
PLAYER_IDS = _player_ids()

def _el(tag, **attrs):
    e = ET.Element(f"{{{NS}}}{tag}")
    for k, v in attrs.items():
        if v is not None:
            e.set(k, str(v))
    return e

def _match_el(match_id, competition_id, status="Played", matchday=None):
    return _el("Match", MatchFIFAId=match_id, Status=status, Matchday=matchday,
               CompetitionFIFAId=competition_id)

def _team_el(nature, club, ):
    return _el("Team", TeamNature=nature, OrganisationFIFAId=CLUB_IDS[club])

def _root():
    r = _el("MatchData", ExportDate="2026-10-20T00:00:00", Synthetic="true",
            Standard="FCD 3.3-aligned export — synthetic data, not an official FIFA record")
    return r

def _pretty(root):
    return minidom.parseString(ET.tostring(root, encoding="utf-8")).toprettyxml(indent="  ", encoding="utf-8").decode()

def featured_match_xml(match):
    """match: the generator's output dict (fixture, final_score, events)."""
    root = _root()
    home, away = match["fixture"]["home"], match["fixture"]["away"]
    goals = [e for e in match["events"] if e.get("goal")]
    m = _match_el("SYN3001", COMPETITION_IDS["featured"])
    # Phases with cumulative scores at phase end, derived from real goal minutes.
    for phase, upto in (("1H", 45), ("2H", 90)):
        hs = sum(1 for g in goals if g["team"] == home and g["minute"] <= upto)
        as_ = sum(1 for g in goals if g["team"] == away and g["minute"] <= upto)
        m.append(_el("Phase", Phase=phase, RegularTime=45, HomeScore=hs, AwayScore=as_))
    for g in goals:
        m.append(_el("MatchEvent", MatchPhase=("1H" if g["minute"] <= 45 else "2H"),
                     Minute=g["minute"], StoppageTime=0, EventType="Goal",
                     PlayerFIFAId=PLAYER_IDS[g["player"]]))
    m.append(_team_el("Home", home)); m.append(_team_el("Away", away))
    root.append(m)
    return _pretty(root)

def season_xml(league_key, league):
    """league: one entry of build_season() output (competition, matches)."""
    root = _root()
    comp_id = COMPETITION_IDS[league_key]
    base = "SYN4" if league_key == "premier_league" else "SYN5"
    for i, mt in enumerate(league["matches"]):
        m = _match_el(f"{base}{i:03d}", comp_id, matchday=mt["matchweek"])
        # Single 2H phase carrying the cumulative full-time score (no HT split modelled).
        m.append(_el("Phase", Phase="2H", RegularTime=45,
                     HomeScore=mt["home_goals"], AwayScore=mt["away_goals"]))
        m.append(_team_el("Home", mt["home"])); m.append(_team_el("Away", mt["away"]))
        root.append(m)
    return _pretty(root)

def build_all():
    from src.synthetic.generator import generate
    from src.season.simulator import build_season
    season = build_season()
    return {
        "featured-match.xml": featured_match_xml(generate()),
        "premier-league-season.xml": season_xml("premier_league", season["premier_league"]),
        "wsl-season.xml": season_xml("wsl", season["wsl"]),
    }
