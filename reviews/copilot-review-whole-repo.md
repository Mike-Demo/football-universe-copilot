# Report-only review: whole repository

Reviewed 2026-10-21 against `main` at `279c4f743771ee3b3488e634934e1ff916b2b9f4`. This is an audit only; no product, documentation, or infrastructure changes are proposed here. File references are absolute paths in the supplied checkout.

## Findings

### Major — The graph seed is factual historical data, while some site-wide labels say all data is synthetic

**References:** `/home/runner/work/football-universe-copilot/football-universe-copilot/data/seed/players.json:34-57`, `/home/runner/work/football-universe-copilot/football-universe-copilot/data/seed/managers.json:3-20`, `/home/runner/work/football-universe-copilot/football-universe-copilot/SUBMISSION.md:7,49-50`, `/home/runner/work/football-universe-copilot/football-universe-copilot/docs/tech.html:11,62`, `/home/runner/work/football-universe-copilot/football-universe-copilot/docs/api.html:11,39`, `/home/runner/work/football-universe-copilot/football-universe-copilot/docs/index.html:159`

The match and season generators are synthetic, but the graph seed uses real player, club, and manager identities with historical club-season relationships (for example, Anelka's Arsenal, Liverpool, Manchester City, and Chelsea spells). `/home/runner/work/football-universe-copilot/football-universe-copilot/SUBMISSION.md` and `/home/runner/work/football-universe-copilot/football-universe-copilot/docs/tech.html` disclose a hand-authored seed of historical connections; this is materially more candid than the site's repeated unqualified “all data synthetic” footers and `/home/runner/work/football-universe-copilot/football-universe-copilot/docs/api.html`'s “All data is synthetic” claim. The submission checklist separately says “Synthetic data only” and “no Premier League footage/data without rights.” Whether the curated graph is an acceptable exception is the owner's policy decision; this review does not determine its rights or provenance.

**Fix before submission:** Decide whether “synthetic data only” applies to the graph. If historical graph facts are allowed, consistently label the graph as a small, manually curated factual exception and document its source/provenance and rights basis. Otherwise replace those facts with fabricated records. Do not use a blanket “all data synthetic” label while retaining factual graph records.

### Major — Browser-generated fixtures do not have the featured match's event schema, breaking pitch and arcade playback

**References:** `/home/runner/work/football-universe-copilot/football-universe-copilot/docs/app.js:182-214,244-271,295-302,373-374`, `/home/runner/work/football-universe-copilot/football-universe-copilot/docs/index.html:26,74-82,109-113`

The featured fixture is loaded from `/home/runner/work/football-universe-copilot/football-universe-copilot/docs/data.json` and has `clock`, coordinates, and key-moment `positions`. Other selected fixtures go through `genMatchData()`: its events have `minute` but no `clock`, coordinates, xT, or positions, and only shots, passes, and pressure events. The primary pitch and `chaosBall()` search using `e.clock`; the pitch's snapshots and arcade cameras also require `positions`. Consequently, generated fixtures can replay their score/feed but do not animate the ball or show the claimed player/Voronoi snapshots; Chaos/Pride's ball falls back to the centre. The generated timeline is deterministic and its browser narrator source is labelled, but the page still says “Four agents narrate every synthetic fixture” and the picker initially describes the featured match as the full pipeline.

**Fix:** Either run the same event/position pipeline for every fixture or clearly label the generated-match experience as a lighter scoreline-derived replay and make its renderers use that event schema. Test both the featured match and a picked fixture, including pitch, Voronoi, Chaos, and Pride.

### Major — Azure narration success is not demonstrated and a broken model call is hidden by fallback

**References:** `/home/runner/work/football-universe-copilot/football-universe-copilot/src/agents/azure_narrator.py:7-13,20-38`, `/home/runner/work/football-universe-copilot/football-universe-copilot/src/agents/agents.py:33-45`, `/home/runner/work/football-universe-copilot/football-universe-copilot/infra/main.bicep:40-69,151-158`, `/home/runner/work/football-universe-copilot/football-universe-copilot/docs/index.html:138-141`

Bicep deploys a Microsoft Foundry `AIServices` account and a `Phi-4-mini-instruct` `GlobalStandard` deployment; the function app sets that deployment name. The narrator nevertheless constructs an Azure OpenAI deployment-style URL using API version `2024-10-21`, catches every exception, and returns `None`, which the caller turns into a successful-looking `template-fallback`. There is no test of the exact request URL, authentication, response parsing, retry/timeout behavior, or a smoke check that distinguishes model success from fallback. Foundry endpoint contracts vary by deployment type; the repository does not prove that this request form works for the declared deployment.

The source now uses one 90-second attempt by default, which is a meaningful improvement over the two 120-second attempts reported in PR #2. A configured `NARRATOR_TIMEOUT_S` can still override that value. The docs and source note a roughly 60–90-second cold start, but a cold start or successful model response was not observed in this audit.

**Fix:** Verify and test the deployment-specific Foundry inference contract, and add a deployment smoke check that requires `narration_source` to identify actual Phi success. Keep fallback as an explicit, visible outcome rather than evidence that Foundry is working.

### Major — Public, anonymous model-triggering API has no code-defined rate limit or spending cap

**References:** `/home/runner/work/football-universe-copilot/football-universe-copilot/azure/function_app.py:7,10-13`, `/home/runner/work/football-universe-copilot/football-universe-copilot/infra/deploy.sh:8-15`, `/home/runner/work/football-universe-copilot/football-universe-copilot/infra/COSTS.md:13-15`, `/home/runner/work/football-universe-copilot/football-universe-copilot/docs/api.html:11,35`

The Function App uses anonymous authorization, and each intelligence request runs the pipeline and may call the hosted model. No rate limit or request quota is defined in the Functions code or Bicep. The budget is an alert, not a hard Azure spending cap; the script creates one 90% threshold despite its 50/90/100% comment, and suppresses budget-creation failure with `|| true`. `/home/runner/work/football-universe-copilot/football-universe-copilot/infra/COSTS.md` calls ~$10 a “Hard worst case,” which this configuration cannot guarantee. CORS is not an access-control boundary for non-browser clients.

**Fix:** Apply a gateway/service-side rate limit or equivalent quota and monitor model usage. Describe budgets as alerts, not caps; make budget setup failures visible and remove the “hard worst case” claim unless a real spending limit exists.

### Major — Provisioned Cosmos Gremlin is not the graph used by the application

**References:** `/home/runner/work/football-universe-copilot/football-universe-copilot/infra/main.bicep:72-122,151-167`, `/home/runner/work/football-universe-copilot/football-universe-copilot/src/graph/universe.py:4-20`, `/home/runner/work/football-universe-copilot/football-universe-copilot/azure/function_app.py:5-6,14-18,25-26`, `/home/runner/work/football-universe-copilot/football-universe-copilot/README.md:8,31,37`

Bicep provisions a Gremlin database and graph and outputs a Cosmos endpoint, but does not pass Cosmos settings to the Function App. `Universe` loads local JSON into an in-memory adjacency map; no Gremlin client or seed-loading path is present. The API's graph routes instantiate that local `Universe`. Thus the source does not support describing Cosmos as serving graph queries. The static demo and local graph are understandable judge-friendly alternatives, but the live stack claim and `/home/runner/work/football-universe-copilot/football-universe-copilot/infra/README.md:3` “load” instruction imply an integration not present in this repository.

**Fix:** Either implement and smoke-test Cosmos loading/querying, or call it a provisioned, unused target and ensure the deployment and submission copy do not imply it backs the API.

### Major — A six-item overlay can contain two blank explanations

**References:** `/home/runner/work/football-universe-copilot/football-universe-copilot/src/agents/agents.py:23-32,38-45`, `/home/runner/work/football-universe-copilot/football-universe-copilot/src/overlay/render.py:2-8`, `/home/runner/work/football-universe-copilot/football-universe-copilot/tests/test_pipeline.py:10-12`

GraphContext emits up to six key-moment contexts, while Narrator builds `why_it_matters` for only four. The renderer still emits a feed item for every context and substitutes an empty string when it runs out of explanations. A current default pipeline run produced six overlay items, the last two with empty `body` values. The existing test checks only that the feed is truthy.

**Fix:** Align the context and explanation limits or provide one explanation per emitted item. Assert every rendered feed body is non-empty.

### Major — The documented deployment is not reproducible from the checked-in region and CORS settings

**References:** `/home/runner/work/football-universe-copilot/football-universe-copilot/README.md:8`, `/home/runner/work/football-universe-copilot/football-universe-copilot/infra/deploy.sh:5-7`, `/home/runner/work/football-universe-copilot/football-universe-copilot/infra/main.bicep:4,124-160`, `/home/runner/work/football-universe-copilot/football-universe-copilot/docs/api.html:11`, `/home/runner/work/football-universe-copilot/football-universe-copilot/infra/README.md:7-11`

The README identifies the API as `westus2`; the deployment script defaults `LOC` to `eastus`, uses it only for the resource group, and does not pass it to the Bicep `location` parameter (also defaulted to `eastus`). The API page says CORS allows the demo origin, but neither Bicep nor `/home/runner/work/football-universe-copilot/football-universe-copilot/infra/deploy.sh` configures a CORS allow-list. A portal-side setting may exist, but the repository cannot reproduce or verify it. `/home/runner/work/football-universe-copilot/football-universe-copilot/infra/README.md` also says deployment is pending sign-in while other materials present a live deployment; the live topology could not be checked here.

**Fix:** Pass the intended location to Bicep, configure CORS in the repeatable deployment path if required, and distinguish checked-in deployment capability from any manually configured live resources.

### Minor — The standard-normalized Brandes values appear to be doubled

**References:** `/home/runner/work/football-universe-copilot/football-universe-copilot/src/graph/universe.py:34-50`, `/home/runner/work/football-universe-copilot/football-universe-copilot/tests/test_pipeline.py:19-20`, `/home/runner/work/football-universe-copilot/football-universe-copilot/README.md:16,37`, `/home/runner/work/football-universe-copilot/football-universe-copilot/docs/api.html:20`

The graph is undirected (`_add()` creates both directions), and Brandes accumulation visits every source. The final denominator is `((n-1)*(n-2)/2)`, the unordered-pair count, without halving the accumulated ordered-source totals. Under the conventional normalized undirected betweenness definition, this makes the displayed `/10` values twice the normalized score; the rank order is unchanged. Current tests only assert that this particular seed's values fall in `[0,10]`, so they do not catch the normalization error. For example, the current graph reports Anelka as 3.09/10 and Manchester City as 6.85/10.

**Fix:** Normalize the undirected raw totals consistently (or explicitly define and document a nonstandard custom score) and test against a small graph with a known normalized value.

### Major — The Agent Framework is a manifest, not the pipeline runtime

**References:** `/home/runner/work/football-universe-copilot/football-universe-copilot/src/agents/framework_adapter.py:1-20`, `/home/runner/work/football-universe-copilot/football-universe-copilot/src/pipeline.py:6-14`, `/home/runner/work/football-universe-copilot/football-universe-copilot/azure/requirements.txt`, `/home/runner/work/football-universe-copilot/football-universe-copilot/infra/README.md:5,10`

The actual pipeline instantiates the four local Python classes directly. `/home/runner/work/football-universe-copilot/football-universe-copilot/src/agents/framework_adapter.py` contains a manifest and tests whether `agent_framework` imports; no registration or execution path is called by `run()`. If the package happens to be installed, `describe_runtime()` reports `microsoft-agent-framework` even though the pipeline remains the local orchestrator. The current tech page is more careful and calls this a manifest/mapping, but the adapter comment and older infra copy overstate the runtime.

**Fix:** Keep describing the framework as a manifest/design mapping unless actual framework registration and execution are implemented and tested; make the runtime descriptor report what `run()` actually uses.

### Minor — Narration text returned by the external model is inserted as HTML

**References:** `/home/runner/work/football-universe-copilot/football-universe-copilot/docs/app.js:344-361`

The Azure response's `narrative.recap` and `narration_source` are concatenated into `out.innerHTML`. The page currently sends a fixed request and this review did not demonstrate an exploit, but model/provider output is not HTML-safe by contract. Render it with text nodes/`textContent` rather than treating it as markup.

### Minor — Infrastructure and marketing copy still disagree about the model and endpoint surface

**References:** `/home/runner/work/football-universe-copilot/football-universe-copilot/infra/README.md:2,7-12`, `/home/runner/work/football-universe-copilot/football-universe-copilot/infra/main.bicep:53-69,151-158`, `/home/runner/work/football-universe-copilot/football-universe-copilot/src/agents/azure_narrator.py:7-12`, `/home/runner/work/football-universe-copilot/football-universe-copilot/azure/function_app.py:19-26`

Bicep deploys Phi-4-mini-instruct and the cost page says `gpt-4o-mini` is reference-only, but `/home/runner/work/football-universe-copilot/football-universe-copilot/infra/README.md` still describes GPT-4o narration and `text-embedding-3-large`, and later calls `gpt-4o-mini` the default. The narrator's code default is GPT-4o-mini, although Bicep overrides it with Phi. Separately, the Azure Function implements `/season`, while the local FastAPI app does not; `/home/runner/work/football-universe-copilot/football-universe-copilot/docs/api.html` accurately discloses this difference, but the infra overview's Azure route list omits `/season`.

**Fix:** Update the infra overview and endpoint list to describe the Bicep deployment, code default, and implemented route set separately.

### Minor — “Live” and “every fixture” copy can overstate the replay and agent behavior

**References:** `/home/runner/work/football-universe-copilot/football-universe-copilot/docs/demo-script-2min.md:2-3`, `/home/runner/work/football-universe-copilot/football-universe-copilot/docs/index.html:26,46,76,91,138-140`, `/home/runner/work/football-universe-copilot/football-universe-copilot/docs/app.js:182-215,295-302,344-361`

Most of the UI correctly labels the featured experience as a synthetic replay and the browser narrator as deterministic. However, the demo hook says “live” without immediately qualifying it, the event-feed heading says “Live event feed,” and the page says four agents narrate every fixture even though picked fixtures use a separate browser generator. The Azure button is a live API call, but that does not make match ingestion live. Label “live” as playback/API availability and distinguish the featured pipeline from generated fixture timelines.

### Minor — Test counts are stale and the highest-risk integration remains untested

**References:** `/home/runner/work/football-universe-copilot/football-universe-copilot/README.md:22-26`, `/home/runner/work/football-universe-copilot/football-universe-copilot/docs/tech.html:58-59`, `/home/runner/work/football-universe-copilot/football-universe-copilot/tests/test_pipeline.py`, `/home/runner/work/football-universe-copilot/football-universe-copilot/tests/test_fds.py`, `/home/runner/work/football-universe-copilot/football-universe-copilot/tests/test_season.py`, `/home/runner/work/football-universe-copilot/football-universe-copilot/SUBMISSION.md:3`

`python3 -m unittest discover -s tests -v` runs **11 tests**, all passing: 6 pipeline, 2 FCD, and 3 season tests. `/home/runner/work/football-universe-copilot/football-universe-copilot/README.md` says 4; the tech page says 9. The suite does not test Azure Functions/FastAPI handlers, the Foundry request and fallback path, browser JavaScript or the picker/pitch/arcade behavior, CORS, or a deployed smoke path. No `.github/workflows/` is present in this checkout; `/home/runner/work/football-universe-copilot/football-universe-copilot/SUBMISSION.md` itself says the CI workflow remains local only. The highest-risk untested behavior is whether the deployed Phi request succeeds within the synchronous request window and is correctly distinguished from template fallback.

**Fix:** Correct both counts and add mocked request-contract/fallback tests plus an explicitly gated deployment smoke test. Add browser/fixture coverage for the generated-match path and ensure CI runs the suite.

### Minor — FCD schema-validation claims are not independently reproducible from this checkout

**References:** `/home/runner/work/football-universe-copilot/football-universe-copilot/src/fds/README.md:37-42`, `/home/runner/work/football-universe-copilot/football-universe-copilot/tools/validate_fds.py`, `/home/runner/work/football-universe-copilot/football-universe-copilot/tests/test_fds.py:4-16`, `/home/runner/work/football-universe-copilot/football-universe-copilot/docs/tech.html:45-47`

The mapping is unusually explicit: only goals are emitted as `MatchEvent`, season matches carry a single cumulative 2H score, lineups and unsupported telemetry are omitted, IDs use `SYN`, and the exports are described as aligned rather than FIFA-certified. All three checked-in XML files exactly match the current exporter, and the tests parse them and check featured details/counts. The stronger claim that all exports validate against genuine XSDs cannot be rerun from this repository alone: the schemas are intentionally not redistributed and the validator expects an external schema directory.

**Fix:** Keep the licensing caveat; make the validation invocation and expected external XSD source/version explicit so an authorized reviewer can reproduce the claim.

### Minor — One Functions route is absent from the local API, by design, but the topology list is incomplete

**References:** `/home/runner/work/football-universe-copilot/football-universe-copilot/azure/function_app.py:19-26`, `/home/runner/work/football-universe-copilot/football-universe-copilot/src/api/app.py:7-16`, `/home/runner/work/football-universe-copilot/football-universe-copilot/docs/api.html:11,21`, `/home/runner/work/football-universe-copilot/football-universe-copilot/infra/README.md:8`

Azure Functions exposes `/season`; FastAPI does not. The API page correctly says local FastAPI has the same routes except `/season`, but the infra overview's Azure route list omits the implemented season route. There is no test for either API surface.

**Fix:** Keep the documented local exception, list all five Azure routes, and add route-level tests.

## PR #2 reconciliation

The table covers all 11 findings in `/home/runner/work/football-universe-copilot/football-universe-copilot/reviews/copilot-review.md`, added by draft PR #2. I retrieved it from that PR's diff because it is not present on current `main`. No PR #2 review threads or general comments were returned by GitHub.

| PR #2 finding | Status on current `main` | Current evidence |
|---|---|---|
| Graph seed not identified as synthetic | **Partially addressed** | `/home/runner/work/football-universe-copilot/football-universe-copilot/SUBMISSION.md:50` and `/home/runner/work/football-universe-copilot/football-universe-copilot/docs/tech.html:11` now call the graph a hand-authored seed of historical connections. But `/home/runner/work/football-universe-copilot/football-universe-copilot/docs/api.html:11` and page footers still say “all data synthetic”; the graph contains real identities and historical club spells. |
| Foundry call unverified; fallback can conceal failure | **Still open** | `/home/runner/work/football-universe-copilot/football-universe-copilot/src/agents/azure_narrator.py:24-38` still uses the deployment-style request and catches all errors to `None`; no request-contract or deployed-model test exists. |
| Two 120-second attempts exceed synchronous window | **Resolved for the default path** | `/home/runner/work/football-universe-copilot/football-universe-copilot/src/agents/azure_narrator.py:28-34` now makes one attempt with a 90-second default. `NARRATOR_TIMEOUT_S` remains operator-overridable, so this is not a bound if configured above the platform window. |
| Cosmos Gremlin provisioned but not used by API | **Still open** | Bicep provisions it, but `Universe` reads local seed JSON and no Cosmos setting/client/loader is present. |
| Agent Framework manifest/check is not pipeline runtime | **Partially addressed** | Current tech copy calls it a manifest/mapping, but `describe_runtime()` can report the framework based only on import availability and `run()` remains local. |
| Two overlay entries have empty bodies | **Still open** | Current `run()` returns six contexts and the overlay has two blank bodies; renderer still uses `""` for missing explanations. |
| Deploy script region differs from documented westus2 | **Still open** | `LOC` defaults to eastus and is not passed as Bicep's `location`; README still says westus2. |
| Infra/model documentation contradicts deployment | **Partially addressed** | Bicep, README, and COSTS identify Phi, but `/home/runner/work/football-universe-copilot/football-universe-copilot/infra/README.md` still claims GPT-4o/embeddings and gpt-4o-mini default; code default remains gpt-4o-mini. |
| “Live” wording can imply real-time ingestion | **Partially addressed** | Synthetic replay and browser narrator are labelled in the UI, but the demo hook says “live” and the page says agents narrate every fixture. |
| Budget alert described as hard cap | **Still open** | `COSTS.md:13-14` says “Hard worst case”; script only attempts a 90% alert and ignores failure. An alert does not cap spend. |
| Tests miss integration behavior and README count is stale | **Partially addressed** | Test suite grew to 11 with FCD tests, but documentation still says 4/9 and no Azure/model/browser integration tests or CI workflow are present. |

## Verified live

**Verified against the running deployment:** None; no HTTP response was received.

**What was attempted:** Direct `curl` requests to `/api/health`, `/api/match/intelligence`, `/api/graph/path`, `/api/graph/leaderboard`, `/api/season`, and the static GitHub Pages demo. Each hostname lookup failed locally with `Could not resolve host` / “No address associated with hostname.” The browser tool was also unavailable (transport closed).

**What this does and does not mean:** No response body, status code, CORS behavior, current route, live model source, or static-page content was obtained. This is a DNS/network access limitation in this audit environment, not evidence that the services are down. In particular, `/match/intelligence` was not reached or timed; the documented 60–90-second narrator cold start was not observed, and no conclusion about that endpoint's availability is drawn. The live topology, deployed region, current CORS configuration, billing, and Foundry success remain unverified.

**Read only from the repository, not checked live:** Azure route declarations, `westus2`/`eastus` claims, the anonymous authorization setting, CORS documentation, Foundry model configuration, and the stated cold-start interval.

## Code-only checks

- `python3 -m unittest discover -s tests -v`: 11 tests passed.
- The current `/home/runner/work/football-universe-copilot/football-universe-copilot/docs/data.json` match/pipeline fields, `/home/runner/work/football-universe-copilot/football-universe-copilot/docs/season.json` fixtures and standings, and all three FCD XML exports match their current generators when evaluated locally.
- The synthetic featured event generator marks its events synthetic. The xT formula in Python and JavaScript agrees; shot xG is `min(0.95, 2.2*xT)`; season λ values use the documented attack/defence formula; the fixture counts are 380 PL + 132 WSL.
- The graph BFS returns `Nicolas Anelka → Manchester City → Erling Haaland` (2 edges). The graph is undirected and its Brandes score normalization is called out above.
- Chaos Arcade and Pride numbers are derived from events, score, momentum, or user-trigger counts. Captions give formulas for the theatrical tears, giggles, high-fives, and decibel values and label them arcade math; no evidence was found that these are presented as measured stadium telemetry. The shared `xG` abbreviation for “expected giggles” remains easy to confuse with expected goals.
- The carbon disclosure explicitly says hosting sustainability is unverified, no energy/emissions measurement was made, and no green-hosting or carbon-neutral claim is made (`/home/runner/work/football-universe-copilot/football-universe-copilot/docs/carbon.txt:2-7`).
- The core dependency surface is small: the Python core uses the standard library; `/home/runner/work/football-universe-copilot/football-universe-copilot/requirements.txt` only comments optional FastAPI/Uvicorn, and `/home/runner/work/football-universe-copilot/football-universe-copilot/azure/requirements.txt` declares Azure Functions. There is no dependency lockfile. The Microsoft/FIFA/CO2 asset and license notices are present; FIFA schemas are not redistributed.
- A local pattern scan of the current tracked tree found no obvious API key/private-key material and no secret-like filenames. The Bicep comment says the model key is supplied outside source. This is not a complete history scan: the checkout is shallow, and GitHub Secret Scanning and Code Scanning alert APIs returned 403 to this integration. No claim that all repository history is clear is made. `/home/runner/work/football-universe-copilot/football-universe-copilot/infra/deploy.sh:11` does include a personal contact address as a budget-notification default; use a team alias if that should not be public.

## Verdict: DO NOT SHIP

The deterministic synthetic pipeline and static exports are reproducible, and several important labels/formulas are honest. Do not ship the current submission claims unchanged: the factual graph exception is not consistently labelled, picked fixtures do not support their advertised pitch/arcade telemetry, overlay output can be blank, and the Foundry/Cosmos/anonymous-cost topology is not demonstrated or bounded. Prioritize:

1. Resolve and consistently label the graph-data policy and provenance.
2. Fix generated-fixture rendering and guarantee a non-empty overlay body for every feed item.
3. Prove the Foundry deployment contract with a smoke test that distinguishes model success from fallback.
4. Add service-side limits for the anonymous paid endpoint; correct alert/cap language and make budget failures visible.
5. Make the Bicep deployment reproducible for region/CORS and either wire Cosmos/Agent Framework or accurately describe them as unintegrated.
6. Correct stale model, route, test-count, and “live” claims; add the missing integration/browser tests and CI.
