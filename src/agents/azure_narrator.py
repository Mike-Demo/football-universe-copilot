# Azure OpenAI narration via stdlib REST — no SDK dependency.
# Active ONLY when AZURE_OPENAI_ENDPOINT + AZURE_OPENAI_API_KEY are set (in Azure these
# come from Function App settings / Key Vault references). Any failure -> caller falls back
# to the deterministic template narrator. The model never invents graph facts: the prompt
# carries only verified events + graph paths, and instructs narration-only.
import json, os, urllib.request, urllib.error
API_VERSION = "2024-10-21"
def azure_narrate(match, stats, ctx):
    endpoint = os.environ.get("AZURE_OPENAI_ENDPOINT", "").rstrip("/")
    key = os.environ.get("AZURE_OPENAI_API_KEY", "")
    deployment = os.environ.get("AZURE_OPENAI_DEPLOYMENT", "Phi-4-mini-instruct")
    if not endpoint or not key:
        return None
    facts = {
        "fixture": match["fixture"], "final_score": match["final_score"],
        "shots": stats["shots"], "chaos_index": stats["chaos_index"],
        "momentum": stats["momentum"],
        "verified_paths": [{"player": c["player"], "path_to_haaland": c["path_to_haaland"]} for c in ctx["key_moment_context"][:4]],
    }
    prompt = ("Narrate this synthetic football match in 120-180 words for a casual fan. "
              "Use ONLY the facts in this JSON; never invent a player, club, score or connection:\n" + json.dumps(facts))
    body = {"messages": [{"role": "system", "content": "You are a football narrator. Narration only, no invented facts."},
                          {"role": "user", "content": prompt}], "temperature": 0.6, "max_tokens": 350}
    req = urllib.request.Request(f"{endpoint}/openai/deployments/{deployment}/chat/completions?api-version={API_VERSION}",
                                 data=json.dumps(body).encode(), method="POST",
                                 headers={"Content-Type": "application/json", "api-key": key})
    provider = "microsoft-foundry" if "phi" in deployment.lower() else "azure-openai"
    # Serverless Phi cold start measured at ~61s (Oct 2026). A 120s timeout WITH a retry could
    # stack to 240s+ and the platform front-end cut the request off (HTTP 504, observed
    # 2026-10-20). Single attempt instead: default 90s, overridable via NARRATOR_TIMEOUT_S.
    # On timeout/failure the caller falls back to the labelled deterministic template.
    timeout_s = int(os.environ.get("NARRATOR_TIMEOUT_S", "90"))
    try:
        with urllib.request.urlopen(req, timeout=timeout_s) as r:
            data = json.loads(r.read())
        return {"recap": data["choices"][0]["message"]["content"], "source": f"{provider}:{deployment}"}
    except Exception:
        return None
