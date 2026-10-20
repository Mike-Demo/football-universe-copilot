# Football Universe graph — pure-python, zero-dependency.
import json, pathlib
from collections import deque, defaultdict
SEED = pathlib.Path(__file__).resolve().parents[2]/"data"/"seed"
class Universe:
    def __init__(self):
        self.adj=defaultdict(dict)  # node -> {nbr: label}
        self.kind={}
        self._load()
    def _add(self,a,b,label):
        self.adj[a][b]=label; self.adj[b][a]=label
    def _load(self):
        players=json.loads((SEED/"players.json").read_text()); clubs=json.loads((SEED/"clubs.json").read_text()); mgrs=json.loads((SEED/"managers.json").read_text()); rel=json.loads((SEED/"relationships.json").read_text())
        for c in clubs: self.kind[c["name"]]="Club"
        for p in players:
            self.kind[p["common_name"]]="Player"
            for st in p["clubs"]: self._add(p["common_name"], st["club"], f"PLAYED_FOR {st['season_start']}-{st['season_end']}")
        for m in mgrs:
            self.kind[m["full_name"]]="Manager"
            for st in m["clubs"]: self._add(st["club"], m["full_name"], f"COACHED_BY {st['season_start']}-{st['season_end']}")
        for r in rel["rivalries"]: self._add(r["a"], r["b"], "RIVAL_OF "+r["name"])
    def shortest_path(self,a,b,max_depth=6):
        if a not in self.adj or b not in self.adj: return None
        q=deque([(a,[a])]); seen={a}
        while q:
            n,path=q.popleft()
            if n==b: return path
            if len(path)-1>=max_depth: continue
            for nb in self.adj[n]:
                if nb not in seen: seen.add(nb); q.append((nb,path+[nb]))
        return None
    def path_edges(self,path): return [self.adj[path[i]][path[i+1]] for i in range(len(path)-1)] if path else []
    def degree(self,n): return len(self.adj.get(n,{}))
    def kevin_bacon_scores(self):
        # Brandes betweenness, normalised, scaled 0-10. Exact on this seed-size graph.
        nodes=list(self.adj); bc={n:0.0 for n in nodes}
        for s in nodes:
            stack=[]; pred={n:[] for n in nodes}; sigma={n:0.0 for n in nodes}; sigma[s]=1.0; dist={n:-1 for n in nodes}; dist[s]=0; q=deque([s])
            while q:
                v=q.popleft(); stack.append(v)
                for nb in self.adj[v]:
                    if dist[nb]<0: dist[nb]=dist[v]+1; q.append(nb)
                    if dist[nb]==dist[v]+1: sigma[nb]+=sigma[v]; pred[nb].append(v)
            delta={n:0.0 for n in nodes}
            while stack:
                v=stack.pop()
                for p in pred[v]: delta[p]+= (sigma[p]/sigma[v])*(1+delta[v])
                if v!=s: bc[v]+=delta[v]
        n=len(nodes); norm=((n-1)*(n-2)/2) if n>2 else 1
        return sorted(({"name":k,"kevin_bacon_score":round(v/norm*10,2),"degree":self.degree(k),"kind":self.kind.get(k)} for k,v in bc.items()), key=lambda x:-x["kevin_bacon_score"])
