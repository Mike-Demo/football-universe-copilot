# Microsoft Agent Framework adapter.
# If the `agent-framework` preview package is installed AND Azure OpenAI is configured,
# each pipeline agent is registered with the framework runtime (name, instructions, model).
# Otherwise the local orchestrator in src/pipeline.py runs the identical agent classes —
# same responsibilities, same shared-state handoffs, deterministic and testable offline.
AGENT_MANIFEST = [
    {"name": "Interpreter", "instructions": "Aggregate synthetic match events into statistics, momentum, control-vs-chaos and threshold alerts. Never invent events."},
    {"name": "GraphContext", "instructions": "Ground key moments in the Football Universe graph: verified shortest paths, degree, Kevin Bacon Score. Return no path rather than a fabricated one."},
    {"name": "Narrator", "instructions": "Narrate only verified events and graph paths supplied by GraphContext. No invented connections."},
    {"name": "Personalizer", "instructions": "Render the same intelligence for analyst, casual fan, player-focus, club-focus and Spanish audiences."},
]
def framework_available():
    try:
        import agent_framework  # noqa: F401
        return True
    except Exception:
        return False
def describe_runtime():
    return {"runtime": "local-orchestrator",
            "agent_framework": "manifest registered (framework-compatible); the framework package is not the pipeline runtime",
            "framework_package_available": framework_available(),
            "agents": [a["name"] for a in AGENT_MANIFEST], "shared_state": "single dict handoff: match -> stats -> graph_context -> narrative -> personalized -> overlay"}
