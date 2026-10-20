#!/usr/bin/env bash
# Deploy Football Universe Copilot to Azure — READ infra/COSTS.md FIRST.
# Requires: az CLI signed in to a subscription YOU control. Nothing here runs without you.
set -euo pipefail
RG="${RG:-football-universe-rg}"; LOC="${LOC:-eastus}"
az group create -n "$RG" -l "$LOC"
az deployment group create -g "$RG" -f infra/main.bicep
# Cost guardrail: $10 budget with alerts at 50/90/100% (adjust email)
az consumption budget create --amount 10 --budget-name fuc-hackathon-cap --category Cost \
  --start-date "$(date -d 'first day of this month' +%F)" --end-date 2026-11-30 \
  --resource-group "$RG" --notification email1=hey.demo@mikedemo.email --notification-operator EqualTo --threshold 90 --contact-emails hey.demo@mikedemo.email || true
# Package the Function: copy pipeline code beside function_app.py at deploy time only
cp -r src data azure/
(cd azure && func azure functionapp publish "$(az deployment group show -g "$RG" -n main --query properties.outputs.functionAppName.value -o tsv)" --build remote)
echo "Set AZURE_OPENAI_API_KEY in the Function App settings (portal or Key Vault reference), then smoke-test /api/health."
