# Architecture
Synthetic Events → Interpreter → GraphContext (Universe graph) → Narrator → Personalizer → Overlay Feed + UI
Shared state is a single dict passed agent-to-agent; each agent is single-responsibility, independently testable, and has a deterministic fallback (template narration) if the LLM layer is unavailable.
Anti-hallucination rule: structure first (events + Gremlin/BFS graph path), language second. If no path exists within 6 degrees, the system says so.
Production: Foundry-hosted agents + Cosmos DB Gremlin (serverless, Session) + Functions/Static Web Apps — see infra/README.md.
