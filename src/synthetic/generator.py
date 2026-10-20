# Synthetic, football-realistic match event generator.
import random
TYPES=["pass","pressure","tackle","possession_change","shot","foul","corner"]
SQUADS={"Arsenal":["Gael Clichy","Kolo Toure","Samir Nasri","Robin van Persie","Thierry Henry"],"Manchester City":["James Milner","Erling Haaland","Gael Clichy","Kolo Toure","Samir Nasri"]}
def generate(seed=25, minutes=90):
    rng=random.Random(seed); events=[]; score={"Arsenal":0,"Manchester City":0}; t=0.0
    teams=list(SQUADS)
    while t < minutes:
        t+= round(rng.uniform(0.08,0.55),2); 
        if t>minutes: break
        team=rng.choice(teams); opp=teams[1] if team==teams[0] else teams[0]
        player=rng.choice(SQUADS[team]); et=rng.choices(TYPES,weights=[62,10,8,6,7,4,3])[0]
        ev={"match_id":"SYN-ARS-MCI-001","clock":round(t,2),"minute":int(t),"type":et,"team":team,"player":player,"synthetic":True}
        if et=="pass": ev.update({"distance_m":round(rng.uniform(4,42),1),"accuracy":round(rng.uniform(0.55,0.99),2),"difficulty":round(rng.uniform(1,10),1)})
        if et=="shot": ev.update({"shot_speed_kmh":round(rng.uniform(62,128),1),"ball_speed_kmh":round(rng.uniform(62,128),1),"on_target":rng.random()<0.42})
        if et=="pressure": ev.update({"pressure_intensity":round(rng.uniform(1,10),1)})
        if et=="shot" and ev["on_target"] and rng.random()<0.28:
            score[team]+=1; ev["goal"]=True; ev["score"]=dict(score)
        events.append(ev)
    return {"fixture":{"home":"Arsenal","away":"Manchester City","competition":"Synthetic Premier League Fixture","synthetic":True},"final_score":score,"events":events}
