# Football Universe Copilot — Live Match Intelligence

**Inside the Game: Microsoft Premier League Hackathon** · Categories targeted: **Best Multi-Agent System** (primary), **Best Use of Microsoft Foundry**, Grand Prize

> Synthetic football events in. Explainable match intelligence out — rendered as a timed broadcast overlay, personalized for every fan.

**Live demo: https://mike-demo.github.io/football-universe-copilot/
Live Azure API (Functions + Foundry Phi-4-mini + Cosmos Gremlin, westus2, own billing profile): https://fuc-api-pv4pnqx2o2t4y.azurewebsites.net/api/health** — play the synthetic match replay, animate the graph path, switch personalization modes.

## The problem
Match data tells fans *what* happened. It rarely explains *why it matters*, and the same feed serves an analyst and a first-time fan identically.

## What we built — the required 5-stage pipeline
1. **Ingest** — a synthetic, football-realistic event engine (`src/synthetic/`) generates passes (distance / accuracy / difficulty), shots (speed, on-target), tackles, pressure and possession changes for a synthetic Arsenal vs Manchester City fixture. **No real match data or footage is used.**
2. **Interpret** — the **Interpreter agent** aggregates momentum by 15-min windows, control-vs-chaos index, pass difficulty and pressure.
3. **Explain** — the **GraphContext agent** grounds each key moment in the Football Universe graph (players / clubs / managers, PLAYED_FOR + COACHED_BY + RIVAL_OF): shortest paths, degree, and the **Kevin Bacon Score** (Brandes betweenness, computed — not invented). The **Narrator agent** only narrates verified events and graph paths; it never invents a connection.
4. **Render** — a timed, machine-readable overlay feed (`football-universe-overlay/v1`, `src/overlay/`) plus a broadcast-style web UI (`frontend/`).
5. **Personalize** — the **Personalizer agent** delivers the same intelligence as Analyst, Casual Fan, Player-Focus (Haaland), and Spanish modes, plus an auto-generated full-time recap.

Verified demo fact: the true shortest path is **Nicolas Anelka → Manchester City → Erling Haaland (2 degrees)** — Anelka played for City (2002–2005). Earlier draft material claimed a 3-degree path via Wenger; the graph corrects it.

## Run it (zero dependencies)
```bash
python3 -m unittest discover -s tests -v   # 11 tests
python3 -m src.pipeline                    # full multi-agent run, JSON out
python3 -m http.server 8000                # then open /frontend/ (reads outputs/sample_match_intelligence.json)
```
Optional API: `pip install fastapi uvicorn` then `uvicorn src.api.app:app` — `/health`, `/match/intelligence`, `/graph/path?a=Nicolas Anelka&b=Erling Haaland`, `/graph/leaderboard`.

## Microsoft stack
Microsoft Foundry with Microsoft's own **Phi-4-mini-instruct** as the primary narration model (deterministic template as fallback — every output labels its `narration_source`) · Microsoft Agent Framework orchestration pattern (4 agents, shared state, explicit handoffs, failure fallback) · Azure Cosmos DB Gremlin API (production graph target, schema in `graph/schema/`; local in-memory graph with identical schema for judge-friendly runs) · Microsoft Fabric (roadmap ingestion) · Azure Functions / Static Web Apps (hosting path, `infra/`).

## Repo map
`src/synthetic` event engine · `src/graph` universe + centrality · `src/agents` 4 agents · `src/overlay` timed overlay · `src/pipeline.py` orchestrator · `data/seed` 20 players / 20 clubs / 10 managers (from the master build plan §7.3) · `outputs/` a real generated run + recap · `docs/` architecture + 2-minute demo script · `SUBMISSION.md` checklist

## Honest limits
Seed graph is 20 players, so Kevin Bacon Scores are computed on that graph (top: Anelka 1.55/10, Milner 1.53/10 (standard normalised undirected Brandes)) — not the inflated predictions in early draft material. Live LLM narration is a real Azure path (Phi-4-mini-instruct on Microsoft Foundry, labelled per response). Cosmos DB Gremlin is provisioned with the graph schema and seed definition, but the API serves the graph in-process from `data/seed/` — Cosmos is not the runtime query path, and there is no Fabric ingestion. See `infra/README.md`.
