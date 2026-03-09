---
owner: 'AI Paths Team'
last_reviewed: '2026-03-09'
status: 'active'
doc_type: 'reference'
scope: 'feature:ai-paths'
canonical: true
---

# Node Validator Wiring Patterns

```ai-paths-assertion
{
  "id": "wiring.trigger_to_simulation",
  "title": "Trigger feeds Simulation trigger",
  "module": "trigger",
  "severity": "info",
  "appliesToNodeTypes": ["trigger"],
  "description": "Standard simulation loop wires Trigger.trigger to Simulation.trigger.",
  "recommendation": "Connect Trigger.trigger -> Simulation.trigger.",
  "version": "2.0.0",
  "tags": ["wiring", "simulation"],
  "sequenceHint": 200,
  "weight": 3,
  "conditions": [
    { "operator": "wired_to", "fromPort": "trigger", "toNodeType": "simulation", "toPort": "trigger" }
  ]
}
```

```ai-paths-assertion
{
  "id": "wiring.simulation_to_trigger_context",
  "title": "Simulation feeds Trigger context",
  "module": "simulation",
  "severity": "info",
  "appliesToNodeTypes": ["simulation"],
  "description": "Recommended simulation loop wiring.",
  "recommendation": "Connect Simulation.context -> Trigger.context.",
  "version": "2.0.0",
  "tags": ["wiring", "simulation"],
  "sequenceHint": 202,
  "weight": 3,
  "conditions": [
    { "operator": "wired_to", "fromPort": "context", "toNodeType": "trigger", "toPort": "context" }
  ]
}
```

```ai-paths-assertion
{
  "id": "wiring.context_to_parser",
  "title": "Context to Parser wiring",
  "module": "context",
  "severity": "info",
  "appliesToNodeTypes": ["context"],
  "description": "Context branch should pass entityJson into parser.",
  "recommendation": "Connect Context.entityJson -> Parser.entityJson.",
  "version": "2.0.0",
  "tags": ["wiring", "parser"],
  "sequenceHint": 204,
  "weight": 3,
  "conditions": [
    { "operator": "wired_to", "fromPort": "entityJson", "toNodeType": "parser", "toPort": "entityJson" }
  ]
}
```

```ai-paths-assertion
{
  "id": "wiring.prompt_to_model",
  "title": "Prompt output reaches model",
  "module": "model",
  "severity": "warning",
  "appliesToNodeTypes": ["prompt"],
  "description": "Prompt.prompt should reach a model input for generation paths.",
  "recommendation": "Connect Prompt.prompt -> Model.prompt.",
  "version": "2.0.0",
  "tags": ["wiring", "model"],
  "sequenceHint": 206,
  "weight": 8,
  "conditions": [
    { "operator": "wired_to", "fromPort": "prompt", "toNodeType": "model", "toPort": "prompt" }
  ]
}
```

```ai-paths-assertion
{
  "id": "wiring.model_result_to_viewer",
  "title": "Model result reaches viewer",
  "module": "model",
  "severity": "info",
  "appliesToNodeTypes": ["model"],
  "description": "Recommended observability path for model outputs.",
  "recommendation": "Connect Model.result -> Viewer.result.",
  "version": "2.0.0",
  "tags": ["wiring", "viewer"],
  "sequenceHint": 208,
  "weight": 4,
  "conditionMode": "any",
  "conditions": [
    { "operator": "wired_to", "fromPort": "result", "toNodeType": "viewer", "toPort": "result" },
    { "operator": "wired_to", "fromPort": "result", "toNodeType": "database" }
  ]
}
```

```ai-paths-assertion
{
  "id": "wiring.database_result_to_viewer",
  "title": "Database result reaches viewer",
  "module": "database",
  "severity": "info",
  "appliesToNodeTypes": ["database"],
  "description": "Database operations should expose result for troubleshooting.",
  "recommendation": "Connect Database.result -> Viewer.result.",
  "version": "2.0.0",
  "tags": ["wiring", "database", "viewer"],
  "sequenceHint": 210,
  "weight": 4,
  "conditions": [
    { "operator": "wired_to", "fromPort": "result", "toNodeType": "viewer", "toPort": "result" }
  ]
}
```

```ai-paths-assertion
{
  "id": "wiring.model_jobid_to_poll",
  "title": "Model jobId reaches poll",
  "module": "model",
  "severity": "warning",
  "appliesToNodeTypes": ["model"],
  "description": "Async model patterns should wire jobId to poll.",
  "recommendation": "Connect Model.jobId -> Poll.jobId.",
  "version": "2.0.0",
  "tags": ["wiring", "async"],
  "sequenceHint": 212,
  "weight": 10,
  "conditionMode": "any",
  "conditions": [
    { "operator": "in", "field": "config.model.waitForResult", "list": ["true"] },
    { "operator": "wired_to", "fromPort": "jobId", "toNodeType": "poll", "toPort": "jobId" }
  ]
}
```

```ai-paths-assertion
{
  "id": "wiring.poll_result_to_database_or_viewer",
  "title": "Poll result consumed downstream",
  "module": "poll",
  "severity": "info",
  "appliesToNodeTypes": ["poll"],
  "description": "Poll results should be consumed by persistence or viewer nodes.",
  "recommendation": "Connect Poll.result to Database or Viewer.",
  "version": "2.0.0",
  "tags": ["wiring", "poll"],
  "sequenceHint": 214,
  "weight": 4,
  "conditionMode": "any",
  "conditions": [
    { "operator": "wired_to", "fromPort": "result", "toNodeType": "database" },
    { "operator": "wired_to", "fromPort": "result", "toNodeType": "viewer", "toPort": "result" }
  ]
}
```
