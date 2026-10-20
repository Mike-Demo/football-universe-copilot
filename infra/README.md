# Infra — production path (not required for local judging demo)
- Microsoft Foundry: agent project + Azure OpenAI (GPT-4o narration, text-embedding-3-large) — set AZURE_OPENAI_ENDPOINT to enable; offline fallback is default.
- Azure Cosmos DB (Gremlin API, serverless, Session consistency): load data/seed/*.json with the schema in graph/schema/.
- Azure Functions / Container Apps: host src/api/app.py (FastAPI). Azure Static Web Apps: host frontend/ + outputs/.
- Microsoft Agent Framework: the four agents in src/agents/agents.py map 1:1 to framework agents with shared state; Semantic Kernel plugin signatures from the master plan were ported, not used as the runtime.

## Azure layer (added Oct 20, 2026) — code-ready, deploy pending subscription sign-in
- `azure/function_app.py` — Azure Functions v2 HTTP API over the pipeline (/api/health, /api/match/intelligence, /api/graph/path, /api/graph/leaderboard)
- `src/agents/azure_narrator.py` — Azure OpenAI narration (REST, gpt-4o-mini default) with deterministic template fallback; `narration_source` in every output states which ran
- `src/agents/framework_adapter.py` + `foundry/agents.json` — Microsoft Agent Framework manifest for the 4 agents and the Foundry registration steps
- `infra/main.bicep` + `infra/deploy.sh` — lean deployment: Functions Consumption + Azure OpenAI + Cosmos Gremlin serverless + budget guardrail
- Costs: see infra/COSTS.md — realistic total through judging is $0-2
