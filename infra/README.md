# Infra — the Azure layer (deployed Oct 20, 2026)

Deployed topology: one resource group (`football-universe-rg`) in **westus2**, under its own billing profile with a $10 budget (alerts at 90% — an alert, not a spending cap). Teardown is deleting the group.

- **Azure Functions (Consumption, Python v2)** — `azure/function_app.py`, live at https://fuc-api-pv4pnqx2o2t4y.azurewebsites.net/api with routes `/health`, `/match/intelligence`, `/graph/path`, `/graph/leaderboard`, `/season`. The local FastAPI app (`src/api/app.py`) exposes the same five routes. `/match/intelligence` is cached per focus player for 10 minutes and throttled to 20 requests/minute per client IP (in-memory, per-instance — a bound, not a guarantee).
- **Microsoft Foundry** — one AIServices account with a **Phi-4-mini-instruct** serverless deployment; `src/agents/azure_narrator.py` calls it over REST and every response carries `narration_source` stating whether Phi or the deterministic template fallback produced the text. There is no GPT deployment (the pinned gpt-4o-mini version is deprecated for new deployments).
- **Azure Cosmos DB (Gremlin API, serverless)** — provisioned with the graph schema (partition key `/pk`) and the seed graph definition. **The API does not query Cosmos at runtime**: it serves the universe graph in-process from `data/seed/*.json`. Cosmos is the provisioned store for the graph definition, not the live query path — stated plainly so nobody has to guess.
- **Microsoft Agent Framework** — `src/agents/framework_adapter.py` + `foundry/agents.json` register a manifest mapping the four pipeline agents (Interpreter → GraphContext → Narrator → Personalizer) to framework agents with a shared-state handoff. The pipeline runtime is the project's own local orchestrator; the framework is a registration/mapping layer, not the runtime.
- **Deployment** — `infra/main.bicep` + `infra/deploy.sh` (defaults: RG `football-universe-rg`, location `westus2`, passed to Bicep as the `location` parameter). **Auto-deploy:** `.github/workflows/ci-cd.yml` runs the test suite on every push/PR and, on pushes to `main` touching `azure/`, `src/` or `data/`, stages `src`+`data` beside `function_app.py` and publishes to the Function App using its publish profile (repo secret `AZURE_FUNCTIONAPP_PUBLISH_PROFILE`). Manual fallback: the Cloud Shell `func publish` flow in `deploy.sh`. Costs: see `infra/COSTS.md` — realistic total through judging (Nov 10) is $0–2.

## Security audit triage backlog — 2026-10-21

Parent: [Mike-Demo/football-universe-copilot#5](https://github.com/Mike-Demo/football-universe-copilot/issues/5).

The audit reported **0 confirmed findings, 3 needs-validation leads, and 0 rejected candidates**. There are therefore no confirmed remediation issues to prioritize or group by root cause. The leads below are not confirmed vulnerabilities and have no severity assigned. Shared model-spend concerns alone do not establish a shared root cause.

Issue creation is unavailable in this session. This is the filing-ready Markdown fallback for the draft PR, not a record of an issue already filed. File exactly one checklist issue using the title and body below; no application code or deployment settings are changed.

### Issue title

`[security][needs-validation] Audit leads to validate`

### Issue body

Parent audit: https://github.com/Mike-Demo/football-universe-copilot/issues/5

Scope: validate all three leads from the 2026-10-21 static-source audit. No application code was executed and no deployed endpoint was probed for this triage. Source observations are not proof of exploitability; do not assign severity until the missing facts are established.

- [ ] **Anonymous LLM endpoint: throttle keyed on client-supplied X-Forwarded-For, unbounded cache/throttle state, and a budget that only alerts**
  - **Fingerprint:** `anon-intelligence-xff-throttle-and-unbounded-cache-cost`
  - **Claimed root cause:** The spend guardrails key identity and caching on unbounded caller-chosen strings: _throttled() uses the first x-forwarded-for value as the client identity, intelligence() uses the raw focus_player query value as the cache key, and neither _THROTTLE nor _CACHE evicts keys, while the outer $10 budget is alert-only.
  - **Source evidence:** [`azure/function_app.py`, lines 7–32](https://github.com/Mike-Demo/football-universe-copilot/blob/96345437e59b07739bde2a08597161def57b0256/azure/function_app.py#L7-L32) sets anonymous access, selects the first header value, stores throttle keys in a dictionary, and caches by raw `focus_player`. Cache expiry is checked on reads, without key eviction. [Budget documentation](https://github.com/Mike-Demo/football-universe-copilot/blob/96345437e59b07739bde2a08597161def57b0256/infra/README.md#L3) describes an alert, not a spending cap.
  - **Exact missing fact:** Whether the deployed Azure Functions front end for fuc-api-pv4pnqx2o2t4y strips or overwrites client-supplied X-Forwarded-For or appends the real client address to it, making the first value spoofable, is a platform and deployment fact absent from the repository.
  - **Validation needed:** Obtain deployment-specific proxy/header configuration or an owner-authorized controlled observation showing the header received by the function for a supplied header and the actual client address. Record whether the first value is caller-controlled; do not infer this from local code.

- [ ] **Parallel FastAPI implementation exposes the same model-backed pipeline with no throttle or cache at all**
  - **Fingerprint:** `fastapi-parallel-path-no-spend-guardrails`
  - **Claimed root cause:** The parallel FastAPI entry point to the same model-backed pipeline omits the throttle and response-cache guardrails present on the Functions entry point, so any deployed instance would allow unguarded repeated paid narrator calls per request.
  - **Source evidence:** [`src/api/app.py`, lines 9–11](https://github.com/Mike-Demo/football-universe-copilot/blob/96345437e59b07739bde2a08597161def57b0256/src/api/app.py#L9-L11) calls `run()` directly without a throttle or response cache. [`src/agents/azure_narrator.py`, lines 8–13](https://github.com/Mike-Demo/football-universe-copilot/blob/96345437e59b07739bde2a08597161def57b0256/src/agents/azure_narrator.py#L8-L13) requires both model environment variables; missing configuration returns the fallback path. The [local run instructions](https://github.com/Mike-Demo/football-universe-copilot/blob/96345437e59b07739bde2a08597161def57b0256/README.md#run-it-zero-dependencies) do not establish deployment history or external exposure. “Parallel” here means an alternative API implementation, not concurrent execution.
  - **Exact missing fact (verbatim from parent):** Whether any instance of src/api/app.py is or was deployed or exposed beyond the operator localhost, for example via uvicorn bound to 0.0.0.0, a container, or another host, with AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY set, is not established in source; if the owner confirms it has only ever run locally, this candidate is rejected as self-onl…
  - **Validation needed:** Ask the owner for current and historical deployment/exposure evidence and whether both variables were configured at the same time, without collecting their secret values. The parent's final word is truncated; retain that limitation rather than invent omitted text. If the owner confirms localhost-only use, record rejection as directed by the parent.

- [ ] **Anonymous season/leaderboard routes recompute full simulations on every request with no throttle or cache**
  - **Fingerprint:** `unthrottled-anon-compute-routes-season-leaderboard`
  - **Claimed root cause:** The anonymous season and graph leaderboard routes omit the throttle and caching applied to the intelligence route, forcing a full deterministic season simulation and a full graph betweenness recomputation on every request.
  - **Source evidence:** [`azure/function_app.py`, lines 39–46](https://github.com/Mike-Demo/football-universe-copilot/blob/96345437e59b07739bde2a08597161def57b0256/azure/function_app.py#L39-L46) calls `build_season()` and `Universe().kevin_bacon_scores()` per request without throttle/cache checks. Implementations are in [`src/season/simulator.py`](https://github.com/Mike-Demo/football-universe-copilot/blob/96345437e59b07739bde2a08597161def57b0256/src/season/simulator.py) and [`src/graph/universe.py`](https://github.com/Mike-Demo/football-universe-copilot/blob/96345437e59b07739bde2a08597161def57b0256/src/graph/universe.py).
  - **Exact missing fact:** No sandboxed local measurement of one season() and one leaderboard() request execution time and memory or GB-second cost exists, so the per-request cost is unquantified.
  - **Validation needed:** In an isolated local sandbox, measure one request to each handler, recording execution time and memory, environment/runtime, seed data, and cold/warm state. If estimating GB-seconds or cost, state the hosting/billing assumptions. Do not load-test the public deployment.

For each checkbox, attach the missing evidence and record a disposition: confirmed, rejected with rationale, or still needs validation. Absence of evidence is not confirmation or rejection. These checklist positions are not a risk ranking.

If any leads become confirmed, prioritize them by severity and lower-trust caller reachability, then by how small and safe the fix is. Group only demonstrated shared root causes. Create one remediation issue per confirmed finding/root-cause group titled `[security][<severity>] <short title>`, including evidence, root cause, smallest safe fix, and a link to the parent audit. No remediation issue or fix is warranted by this triage alone.
