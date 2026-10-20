# Submission checklist — Inside the Game (deadline Tue Oct 27, 2026, 11:59pm PT)
- [x] Registered (confirmed by Demo, Oct 19)
- [x] Public GitHub repo: https://github.com/Mike-Demo/football-universe-copilot (29 files pushed Oct 19; .github/workflows/ci.yml remains local only — the API token lacks workflow scope, add it via the web UI if wanted)
- [ ] Hackathon project page: pitch, Microsoft/Azure tech used, problem solved
- [ ] Demo video < 2 min, public URL, shows the project working (script: docs/demo-script-2min.md)
- [x] Working demo link, free/unrestricted for judges until Nov 10, 2026: https://mike-demo.github.io/football-universe-copilot/ (GitHub Pages, main /docs, enabled Oct 19)
- [ ] Synthetic data only; no Premier League footage/data without rights
- [ ] All submission materials in English


## Project page copy (Innovation Studio form, prepared Oct 20)

**Title (77/140):** Football Universe Copilot — Synthetic Match Intelligence, Explained by Agents

**Tagline (244/300):** Four cooperating agents turn synthetic live match events into explainable intelligence, a timed broadcast overlay, and stories personalized for every fan — narrated by Microsoft's Phi-4-mini on Foundry and grounded in a football universe graph.

**Keywords:** multi-agent systems · Microsoft Foundry · Phi-4 · Azure Functions · Cosmos DB Gremlin · synthetic data · explainable AI · football analytics · broadcast overlay · personalization · Premier League · Women's Super League

**Challenge:** The Synthetic Match Insights Engine for Premier League Studio

**Writing code:** Yes

**Skills Needed / open for others to join:** No (solo project)

**Code repository (add after saving):** https://github.com/Mike-Demo/football-universe-copilot

**Description (markdown):**

## What it is
Football Universe Copilot is a Synthetic Match Insights Engine for a Premier League studio: it ingests synthetic live match events and turns them into explainable, personalized match intelligence — rendered as a timed, machine-readable broadcast overlay.

## The pipeline (four cooperating agents, shared-state handoffs)
1. **Interpreter** — aggregates raw synthetic events into statistics, momentum windows, control-vs-chaos and threshold alerts (shot speed ≥110 km/h, 35m+ passes, sprints). Every event carries player ID, pass distance/difficulty, shot speed and distance covered.
2. **GraphContext** — grounds each key moment in the Football Universe graph: verified BFS shortest paths and a betweenness-based "Kevin Bacon Score" (e.g. Nicolas Anelka → Manchester City → Erling Haaland is 2 degrees). It returns no connection rather than an invented one.
3. **Narrator** — explains WHY the moment matters and writes the auto match recap. In Azure this is Microsoft's own **Phi-4-mini-instruct on Microsoft Foundry**; a deterministic template is the offline fallback, and every output labels its `narration_source` so the claim is provable.
4. **Personalizer** — renders the same intelligence five ways: analyst, casual fan, player focus, club focus ("My Club"), and Spanish (with a real generated Spanish recap).

## Full seasons, not one match
A seeded Poisson simulator plays out the complete synthetic calendars — **380 Premier League matches and 132 Women's Super League matches** — with computed standings, form, points progressions and season narratives. On the demo site you can pick your team and any of the 512 fixtures from the calendar and watch a deterministic replay of it.

## Microsoft technology used
Microsoft Foundry (Phi-4-mini-instruct), Microsoft Agent Framework (agent manifest in the repo), Azure Functions (Consumption), Azure Cosmos DB (Gremlin, serverless), Application Insights, Bicep infrastructure-as-code. Deployed live under its own billing profile with a $10 budget alert; total running cost through judging is designed to be $0–2.

## Try it (judges)
- Live demo: https://mike-demo.github.io/football-universe-copilot/ — pick a match, press Play, tap the graph (touch supported), open the Open Source & Tech Stack page
- Live Azure API: https://fuc-api-pv4pnqx2o2t4y.azurewebsites.net/api/health (also /api/match/intelligence, /api/graph/path, /api/season?league=wsl)
- Code (MIT): https://github.com/Mike-Demo/football-universe-copilot

## Data honesty
All match and season data is 100% synthetic and seeded — no real Premier League/WSL data or footage is used anywhere. The graph is a small hand-authored seed of historical connections.
