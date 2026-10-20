# What the Azure layer costs (verified from Azure's own pricing pages, Oct 20, 2026)
Design rule: every service is pay-per-use with a $0 floor. Nothing provisioned, no Premium, no AI Search.
| Service | Rate | Our usage through judging (Nov 10) | Expected |
|---|---|---|---|
| Azure Functions Consumption | First 1M executions + 400,000 GB-s free monthly; then $0.20/1M + $0.000016/GB-s | Judge/demo traffic = thousands of calls | **$0** (inside free grant) |
| **Microsoft Phi-4-mini-instruct (PRIMARY, Foundry)** | ~$0.07 in / ~$0.23 out per 1M tokens (serverless/GlobalStandard, third-party trackers — verify in portal at deploy) | Same narration volume | **< $0.25** |
| Azure OpenAI gpt-4o-mini (reference only — not deployed; the pinned version is deprecated for new deployments, template is the fallback) | $0.15 in / $0.60 out per 1M tokens | ~1,850 tokens per narrated match; even 1,000 narrations ≈ 1.85M tokens | **< $1** |
| Azure OpenAI GPT-4o (if you switch) | $2.50 in / $10.00 out per 1M tokens | Same 1,000 narrations | ~$8 worst case — mini is the default for a reason |
| Cosmos DB Gremlin, serverless | $0.25 per 1M RU + $0.25/GB/mo storage | Seed graph < 1MB; path queries are small | **< $0.25** |
| Storage account (Functions plumbing) | Standard LRS, pennies at this size | — | < $0.10 |
| Application Insights | First 5 GB/month free on the workspace model | Tiny logs | $0 |
| Microsoft Foundry project itself | No separate platform fee in this design — you pay for the model + services above | — | $0 |
**Realistic total Oct 20 → Nov 10: $0–2. Hard worst case (GPT-4o + heavy judge traffic): ~$10.**
Guardrails in deploy.sh: $10 budget with a 90% alert. Teardown after judging: `az group delete -n football-universe-rg` returns you to $0 — everything lives in one resource group.
Not included / not assumed: an Azure subscription itself. A pay-as-you-go subscription needs your sign-in + payment method; a new Azure free account ($200/30 days + 12-month free services) would cover this entirely if you qualify and haven't used one.
