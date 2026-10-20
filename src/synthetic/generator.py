# Synthetic, football-realistic match event generator.
import random
TYPES=["pass","pressure","tackle","possession_change","shot","foul","corner"]
SQUADS={"Arsenal":["Gael Clichy","Kolo Toure","Samir Nasri","Robin van Persie","Thierry Henry"],"Manchester City":["James Milner","Erling Haaland","Gael Clichy","Kolo Toure","Samir Nasri"]}
import math
GOAL=(105.0,34.0)
def xt(x,y):
    """Simplified expected-threat surface (documented model, tech page): analytic value of a pitch
    location from distance/angle to goal. Peak ~0.30 at close range, decaying with distance and width."""
    d=math.hypot(GOAL[0]-x, GOAL[1]-y)
    return round(0.38*math.exp(-d/24.0)*(1-0.45*abs(y-34.0)/34.0),3)
FORMATION=[(4,34),(18,10),(18,26),(18,42),(18,58),(34,16),(34,34),(34,52),(52,22),(52,46),(66,34)]  # one team's shape, defending left
def _positions(rng2, ball, home_attacking):
    """22 synthetic player positions around the ball: each team's formation shape shifted toward the
    ball and jittered. Returns [[x, y, team_index], ...] on a 105x68 pitch."""
    out=[]
    for ti in range(2):
        for (fx,fy) in FORMATION:
            x = fx if ti==0 else 105-fx; y = fy if ti==0 else 68-fy
            x += (ball[0]-52.5)*0.35; y += (ball[1]-34)*0.3
            x = max(1,min(104, x+rng2.uniform(-7,7))); y = max(1,min(67, y+rng2.uniform(-6,6)))
            out.append([round(x,1), round(y,1), ti])
    return out
def generate(seed=25, minutes=90):
    rng=random.Random(seed); rng2=random.Random(seed+777)  # positions stream — never touches the event stream
    events=[]; score={"Arsenal":0,"Manchester City":0}; t=0.0
    teams=list(SQUADS)
    while t < minutes:
        t+= round(rng.uniform(0.08,0.55),2); 
        if t>minutes: break
        team=rng.choice(teams); opp=teams[1] if team==teams[0] else teams[0]
        player=rng.choice(SQUADS[team]); et=rng.choices(TYPES,weights=[62,10,8,6,7,4,3])[0]
        ev={"match_id":"SYN-ARS-MCI-001","clock":round(t,2),"minute":int(t),"type":et,"team":team,"player":player,"synthetic":True,"player_speed_kmh":round(rng.uniform(4,35),1),"distance_covered_m":round(rng.uniform(8,85),1)}
        if et=="pass": ev.update({"distance_m":round(rng.uniform(4,42),1),"accuracy":round(rng.uniform(0.55,0.99),2),"difficulty":round(rng.uniform(1,10),1)})
        if et=="shot": ev.update({"shot_speed_kmh":round(rng.uniform(62,128),1),"ball_speed_kmh":round(rng.uniform(62,128),1),"on_target":rng.random()<0.42})
        if et=="pressure": ev.update({"pressure_intensity":round(rng.uniform(1,10),1)})
        alerts=[]
        if ev.get("shot_speed_kmh",0)>=110: alerts.append("SPEED_ALERT: shot >= 110 km/h")
        if ev.get("distance_m",0)>=35: alerts.append("LONG_RANGE_ALERT: pass >= 35m")
        if ev["player_speed_kmh"]>=32: alerts.append("SPRINT_ALERT: player speed >= 32 km/h")
        if alerts: ev["threshold_alerts"]=alerts
        # --- pitch coordinates + threat model (synthetic positions; see tech page "Models") ---
        if et=="shot": bx,by=rng2.uniform(84,103), rng2.uniform(18,50)
        elif et=="corner": bx,by=rng2.uniform(96,104), rng2.choice([rng2.uniform(0,6), rng2.uniform(62,68)])
        elif et=="pass": bx,by=rng2.uniform(10,96), rng2.uniform(4,64)
        elif et in ("tackle","pressure"): bx,by=rng2.uniform(25,80), rng2.uniform(8,60)
        else: bx,by=rng2.uniform(5,100), rng2.uniform(2,66)
        if team==teams[0]: x,y=bx,by  # attacking left-to-right as generated
        else: x,y=105-bx,68-by       # away attack mirrored; xT always measured toward the attacked goal
        ev["x"],ev["y"]=round(x,1),round(y,1)
        ev["xt"]=xt(bx,by)
        if events:
            px,py=events[-1]["x"],events[-1]["y"]
            ev["dx"],ev["dy"]=round(x-px,1),round(y-py,1)  # ball displacement vector from previous event
        if et=="pass" and events:
            ev["xt_from"]=events[-1].get("xt", ev["xt"]); ev["xt_delta"]=round(ev["xt"]-ev["xt_from"],3)
        if et=="shot": ev["xg"]=round(min(0.95, 2.2*ev["xt"]),3)
        if et in ("shot","corner") or (et=="pass" and ev.get("distance_m",0)>=35) or ev.get("goal"):
            ev["positions"]=_positions(rng2,(x,y), team==teams[0])
        if et=="shot" and ev["on_target"] and rng.random()<0.28:
            score[team]+=1; ev["goal"]=True; ev["score"]=dict(score)
        events.append(ev)
    return {"fixture":{"home":"Arsenal","away":"Manchester City","competition":"Synthetic Premier League Fixture","synthetic":True},"final_score":score,"events":events}
