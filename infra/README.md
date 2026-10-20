# Infra — production path (not required for local judging demo)
- Microsoft Foundry: agent project + Azure OpenAI (GPT-4o narration, text-embedding-3-large) — set AZURE_OPENAI_ENDPOINT to enable; offline fallback is default.
- Azure Cosmos DB (Gremlin API, serverless, Session consistency): load data/seed/*.json with the schema in graph/schema/.
- Azure Functions / Container Apps: host src/api/app.py (FastAPI). Azure Static Web Apps: host frontend/ + outputs/.
- Microsoft Agent Framework: the four agents in src/agents/agents.py map 1:1 to framework agents with shared state; Semantic Kernel plugin signatures from the master plan were ported, not used as the runtime.
