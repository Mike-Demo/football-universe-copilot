# Timed, machine-readable broadcast overlay feed — one JSON object per key moment.
def render_overlay(match, stats, ctx, narrator, modes):
    feed=[]
    for i,c in enumerate(ctx["key_moment_context"]):
        feed.append({"overlay_id":f"ov-{i+1:03d}","at_minute":c["minute"],"duration_s":8,"type":"key_moment",
          "title":f"{c['player']} — why this matters","body":(narrator["why_it_matters"][i] if i < len(narrator["why_it_matters"]) else
            f"{c['player']} is {c['degree']} connections deep in the universe graph (Kevin Bacon Score {c['kevin_bacon_score']}). Shortest path to Haaland: {' → '.join(c['path_to_haaland'])}; to Arsenal: {' → '.join(c['path_to_arsenal'])}."),
          "kevin_bacon_score":c["kevin_bacon_score"],"modes":list(modes.keys())})
    return {"match_id":match["events"][0]["match_id"] if match["events"] else None,"format":"football-universe-overlay/v1","timed":True,"feed":feed}
