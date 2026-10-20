# Report-only review: Azure layer, season simulator, claim accuracy

Reviewed 2026-10-20 for the Oct 27, 2026 hackathon submission. This review makes no product-code changes. Paths below are absolute paths in the supplied repository.

## Findings

### Blocker — The graph dataset is not identified as synthetic

**References:** `/home/runner/work/football-universe-copilot/football-universe-copilot/data/seed/players.json:34-46`, `/home/runner/work/football-universe-copilot/football-universe-copilot/data/seed/managers.json:3-10`, `/home/runner/work/football-universe-copilot/football-universe-copilot/README.md:14,31,37`, `/home/runner/work/football-universe-copilot/football-universe-copilot/docs/index.html:8`

The event and season simulators clearly mark their generated data synthetic. The graph seed is different: it contains real player and manager names and specific club-season histories, without a synthetic marker or provenance. The README limits its “no real data” claim to match data, and the demo says graph data is “the seed universe”; neither makes the non-synthetic status of those graph facts clear. This does not satisfy a requirement that **all** data be clearly synthetic.

**Fix:** For a synthetic-only submission, replace real identities and histories with fabricated graph data and mark/document that dataset as synthetic. If factual graph data is intentionally retained, obtain permission as needed and explicitly document that exception; a label alone does not make factual records synthetic.

### Major — The Foundry narration call is unverified and fallback can conceal failure

**References:** `/home/runner/work/football-universe-copilot/football-universe-copilot/infra/main.bicep:40-50,56-69,151-158`, `/home/runner/work/football-universe-copilot/football-universe-copilot/src/agents/azure_narrator.py:7-13,24-37`, `/home/runner/work/football-universe-copilot/football-universe-copilot/src/agents/agents.py:36-45`

The template creates a `Microsoft.CognitiveServices/accounts` resource of kind `AIServices`, deploys Phi-4-mini-instruct as `GlobalStandard` with `format: 'Microsoft'`, and supplies that account endpoint to the Function App. The narrator builds an Azure OpenAI-style `/openai/deployments/{deployment}/chat/completions` request with API version `2024-10-21`. The repository does not establish that this route and version are supported for this exact deployment. A request error is caught and converted to `None`, so a route/authentication failure silently appears as a successful template-fallback response. This review could not verify the exact model endpoint contract against Microsoft documentation; incompatibility is therefore a risk, not a proven failure.

**Fix:** Verify the documented inference URI and API version for this Bicep deployment. Add a test for the constructed request and a deployment smoke test that fails unless narration succeeds with source `microsoft-foundry:Phi-4-mini-instruct`; keep the fallback test separate so it cannot mask model-call failure.

### Major — Two 120-second attempts can outlast the synchronous HTTP response window

**References:** `/home/runner/work/football-universe-copilot/football-universe-copilot/src/agents/azure_narrator.py:28-37`, `/home/runner/work/football-universe-copilot/football-universe-copilot/azure/function_app.py:10-13`, `/home/runner/work/football-universe-copilot/football-universe-copilot/azure/host.json:1`

Each of two attempts has a 120-second socket timeout, so sequential timeouts alone can consume 240 seconds before returning the template fallback (excluding other work). This is already beyond Azure Functions’ approximately 230-second HTTP front-end response limit; the socket timeout is not an overall request deadline. The host configuration does not set a shorter function timeout. On a slow first response plus retry, callers can time out before they receive the fallback that is meant to make this path resilient.

**Fix:** Enforce a total request deadline below the HTTP front-end limit and allocate the remaining time across attempts; alternatively, use one bounded model attempt or move narration to an asynchronous workflow. Test the elapsed-time/fallback path.

### Major — Cosmos Gremlin is provisioned but is not the graph used by the API

**References:** `/home/runner/work/football-universe-copilot/football-universe-copilot/infra/main.bicep:72-122`, `/home/runner/work/football-universe-copilot/football-universe-copilot/src/graph/universe.py:2-20`, `/home/runner/work/football-universe-copilot/football-universe-copilot/azure/function_app.py:5-6,14-18`, `/home/runner/work/football-universe-copilot/football-universe-copilot/README.md:8,31,37`

Bicep creates a serverless Gremlin database and graph with `/pk`, but the application graph reads local JSON seed files and uses an in-memory adjacency map. There is no Gremlin client, Cosmos connection setting, or seed-loading step in the deployment path. The API can therefore use the local graph, but the repository does not demonstrate that it loads or queries the deployed Cosmos graph. The README’s live API stack description can lead readers to infer that Cosmos is serving graph queries.

**Fix:** Implement and smoke-test loading/querying the deployed graph, including partition-key handling, or describe Cosmos strictly as a provisioned but unused target and remove claims that it is part of the running API.

### Major — The Agent Framework is a manifest/check, not the pipeline runtime

**References:** `/home/runner/work/football-universe-copilot/football-universe-copilot/src/agents/framework_adapter.py:1-5,12-20`, `/home/runner/work/football-universe-copilot/football-universe-copilot/src/pipeline.py:6-14`, `/home/runner/work/football-universe-copilot/football-universe-copilot/foundry/agents.json:23-28`

The adapter checks whether `agent_framework` can be imported and returns a manifest-shaped description; it does not register or execute agents. `src/pipeline.py` directly instantiates and runs the local Python classes regardless of whether the package is installed. In particular, `describe_runtime()` can report `microsoft-agent-framework` based only on import availability, even though the pipeline still uses the local orchestrator. The manifest and manual Foundry registration steps are useful scaffolding, but they do not demonstrate a running Agent Framework orchestration.

**Fix:** Integrate and test actual framework registration/execution, or call this a framework-inspired manifest/local orchestration and make `describe_runtime()` report the runtime actually used.

### Major — Two overlay feed entries have empty bodies

**References:** `/home/runner/work/football-universe-copilot/football-universe-copilot/src/graph/universe.py:24-30`, `/home/runner/work/football-universe-copilot/football-universe-copilot/src/agents/agents.py:38-40`, `/home/runner/work/football-universe-copilot/football-universe-copilot/src/overlay/render.py:4-8`

Graph context collects up to six key moments, while the narrator creates `why_it_matters` text for only the first four. The overlay renderer iterates over all contexts and substitutes `""` for missing explanations. A direct run confirmed six feed items with empty `body` values in items five and six; the existing overlay test checks only that the feed is truthy.

**Fix:** Use the same limit for context and narration, or generate one explanation for every emitted overlay item. Add an assertion that every feed item's body is non-empty.

### Major — The checked-in deployment script does not reproduce the documented region

**References:** `/home/runner/work/football-universe-copilot/football-universe-copilot/README.md:8`, `/home/runner/work/football-universe-copilot/football-universe-copilot/infra/main.bicep:4`, `/home/runner/work/football-universe-copilot/football-universe-copilot/infra/deploy.sh:5-7`

The README identifies the live API as `westus2`. The Bicep parameter defaults to `eastus`, and `deploy.sh` uses `LOC` only when creating the resource group; it does not pass `LOC` to the Bicep deployment. Running the checked-in script as written therefore deploys resources to `eastus`, not the documented `westus2`.

**Fix:** Pass the selected location as a Bicep parameter and set it to the actual deployed region in the documented command, or correct the live deployment description.

### Minor — Infrastructure/model documentation disagrees about what is deployed

**References:** `/home/runner/work/football-universe-copilot/football-universe-copilot/infra/README.md:2,7-11`, `/home/runner/work/football-universe-copilot/football-universe-copilot/infra/main.bicep:53-69,151-158`, `/home/runner/work/football-universe-copilot/football-universe-copilot/src/agents/azure_narrator.py:9-12`, `/home/runner/work/football-universe-copilot/football-universe-copilot/infra/COSTS.md:6-8`

The older infra overview describes GPT-4o narration and `text-embedding-3-large`; its Azure-layer entry calls `gpt-4o-mini` the default. The Bicep instead deploys Phi-4-mini-instruct and sets it as the Function App deployment name, while the narrator's code default is `gpt-4o-mini`. No embedding deployment or embedding use appears in the reviewed implementation. The README more accurately calls Phi the target and marks Fabric as a roadmap item, but the infra overview remains contradictory.

**Fix:** Update the infra overview to distinguish the Bicep-configured Phi deployment, the narrator's fallback code default, the local template fallback, and any future/unimplemented GPT or embedding paths.

### Minor — “Live” wording can imply real-time match ingestion

**References:** `/home/runner/work/football-universe-copilot/football-universe-copilot/docs/demo-script-2min.md:2-3`, `/home/runner/work/football-universe-copilot/football-universe-copilot/src/pipeline.py:6-12`, `/home/runner/work/football-universe-copilot/football-universe-copilot/docs/index.html:8,29-30`

The user interface clearly labels match data synthetic and calls the controls a replay, but the demo-script hook says the system explains a match “live,” and the page labels the replay feed “Live event feed.” The pipeline generates the complete synthetic match before processing it; it does not ingest live or streamed match events. “Live Azure API” in the README refers to endpoint availability, not a live match-data source.

**Fix:** Describe the experience as a timed synthetic replay and reserve “live” for the deployed API or UI playback behavior, with that meaning stated explicitly.

### Minor — The budget alert is not a hard spending cap

**References:** `/home/runner/work/football-universe-copilot/football-universe-copilot/infra/COSTS.md:13-15`, `/home/runner/work/football-universe-copilot/football-universe-copilot/infra/deploy.sh:8-11`

The cost document calls ~$10 a “Hard worst case” and describes the deployment budget as a guardrail. The script creates a budget with a 90% email alert and suppresses any command failure with `|| true`; an alert does not stop Azure consumption or guarantee a maximum bill.

**Fix:** Present the totals as usage-based estimates, say explicitly that the budget only alerts and does not cap spend, and do not call the amount a hard maximum.

### Minor — Tests miss the highest-risk integration behavior and the README count is stale

**References:** `/home/runner/work/football-universe-copilot/football-universe-copilot/tests/test_pipeline.py:5-20`, `/home/runner/work/football-universe-copilot/football-universe-copilot/tests/test_season.py:4-19`, `/home/runner/work/football-universe-copilot/football-universe-copilot/README.md:22-28`

The repository has nine test methods and all nine pass, but README says `# 4 tests`. The highest-risk untested behavior is the deployed Azure narration request contract and its timeout/retry/fallback path: the test only accepts a source string with an expected prefix and does not verify request URL, API version, response parsing, retry, or that a configured Phi deployment actually succeeds. Cosmos integration has no tests because it is not wired into the implementation. Season tests verify match counts and table invariants but do not directly assert one home and one away fixture per pair or test narrative contents.

**Fix:** Correct the test count. Add isolated tests for fixture pair/home-away uniqueness and narrative outputs, and mocked request/retry tests plus a live deployment smoke test for the model call. Make the smoke test distinguish actual model success from template fallback.

## Verified behavior and review limits

- `python3 -m unittest discover -s tests -v`: all 9 tests passed.
- Independently checked the configured leagues: 380 Premier League fixtures and 132 WSL fixtures; each unordered club pair appears twice, once at each venue. Each club has 38/22 matches respectively, and relegation zones contain 3/1 clubs.
- The Poisson sampler is Knuth's algorithm and is used with positive expected-goal rates in the configured leagues. Points, goal totals, seeded repeatability, and position-based zone counts were consistent in the generated season.
- The graph BFS returns shortest paths on the loaded unweighted graph, and the tested Anelka–Manchester City–Haaland path is two edges. Betweenness is computed with Brandes' algorithm; graph size/seed scope should be stated when presenting its scores.
- Bicep does define a Y1 Consumption plan, one AIServices account with a Phi-4-mini-instruct deployment, and a serverless Gremlin graph with `/pk` and `customSubDomainName`. Those declarations do not establish that the app uses Cosmos or that the checked-in deployment script reproduces the documented region.
- A default local pipeline run reported `template-fallback`; its overlay contained six context entries, of which two had empty bodies.
- The Azure route assessment above is explicitly unverified. This review did not query the deployed health URL, verify Azure billing, or establish whether any external model endpoint currently succeeds.

## Verdict: DO NOT SHIP

Do not submit as “all data synthetic” until the factual graph seed is replaced with synthetic data. Before claiming a working Foundry-backed, Cosmos-backed multi-agent deployment, verify the Phi inference request end to end, wire or accurately disclaim Cosmos and Agent Framework runtime use, and fix the overlay gaps and request deadline. The local synthetic match/season path and its existing tests pass, but those checks do not establish the disputed cloud claims.
