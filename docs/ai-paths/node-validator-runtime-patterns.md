---
owner: 'AI Paths Team'
last_reviewed: '2026-03-09'
status: 'active'
doc_type: 'reference'
scope: 'feature:ai-paths'
canonical: true
---

# Node Validator Runtime Patterns

```ai-paths-assertion
{
  "id": "runtime.model.has_model_id",
  "title": "Model node has model id",
  "module": "model",
  "severity": "error",
  "appliesToNodeTypes": ["model"],
  "description": "Model runs require model.modelId.",
  "recommendation": "Select model ID in model node config.",
  "version": "2.0.0",
  "tags": ["model", "runtime"],
  "sequenceHint": 100,
  "weight": 35,
  "conditions": [
    { "operator": "non_empty", "field": "config.model.modelId" }
  ]
}
```

```ai-paths-assertion
{
  "id": "runtime.model.async_has_poll",
  "title": "Async model jobs wired to poll",
  "module": "model",
  "severity": "warning",
  "appliesToNodeTypes": ["model"],
  "description": "When waitForResult=false, model.jobId should reach a poll node.",
  "recommendation": "Wire model.jobId to poll.jobId for async completion.",
  "version": "2.0.0",
  "tags": ["model", "async"],
  "sequenceHint": 102,
  "weight": 18,
  "conditionMode": "any",
  "conditions": [
    { "operator": "in", "field": "config.model.waitForResult", "list": ["true"] },
    { "operator": "wired_to", "fromPort": "jobId", "toNodeType": "poll", "toPort": "jobId" }
  ]
}
```

```ai-paths-assertion
{
  "id": "runtime.poll.interval_present",
  "title": "Poll interval configured",
  "module": "poll",
  "severity": "warning",
  "appliesToNodeTypes": ["poll"],
  "description": "Poll interval should be defined.",
  "recommendation": "Set poll.intervalMs in node config.",
  "version": "2.0.0",
  "tags": ["poll"],
  "sequenceHint": 104,
  "weight": 10,
  "conditions": [
    { "operator": "non_empty", "field": "config.poll.intervalMs" }
  ]
}
```

```ai-paths-assertion
{
  "id": "runtime.poll.max_attempts_present",
  "title": "Poll maxAttempts configured",
  "module": "poll",
  "severity": "warning",
  "appliesToNodeTypes": ["poll"],
  "description": "Poll max attempts should be bounded.",
  "recommendation": "Set poll.maxAttempts to a finite value.",
  "version": "2.0.0",
  "tags": ["poll"],
  "sequenceHint": 106,
  "weight": 10,
  "conditions": [
    { "operator": "non_empty", "field": "config.poll.maxAttempts" }
  ]
}
```

```ai-paths-assertion
{
  "id": "runtime.http.url_present",
  "title": "HTTP node URL configured",
  "module": "custom",
  "severity": "warning",
  "appliesToNodeTypes": ["http"],
  "description": "HTTP nodes should define endpoint URL.",
  "recommendation": "Set http.url before execution.",
  "version": "2.0.0",
  "tags": ["http"],
  "sequenceHint": 108,
  "weight": 10,
  "conditions": [
    { "operator": "non_empty", "field": "config.http.url" }
  ]
}
```

```ai-paths-assertion
{
  "id": "runtime.validation_pattern_has_stack_or_rules",
  "title": "Validation Pattern has stack or local rules",
  "module": "validation_pattern",
  "severity": "warning",
  "appliesToNodeTypes": ["validation_pattern"],
  "description": "Validation Pattern node should use stackId or path-local rules.",
  "recommendation": "Set validationPattern.stackId or validationPattern.rules.",
  "version": "2.0.0",
  "tags": ["validation-pattern"],
  "sequenceHint": 110,
  "weight": 8,
  "conditionMode": "any",
  "conditions": [
    { "operator": "non_empty", "field": "config.validationPattern.stackId" },
    { "operator": "non_empty", "field": "config.validationPattern.rules" }
  ]
}
```

```ai-paths-assertion
{
  "id": "runtime.db_schema.collection_selection",
  "title": "DB Schema node has selected collections",
  "module": "custom",
  "severity": "info",
  "appliesToNodeTypes": ["db_schema"],
  "description": "DB Schema nodes in selected mode should define collections.",
  "recommendation": "Set db_schema.collections or switch mode to all.",
  "version": "2.0.0",
  "tags": ["db-schema"],
  "sequenceHint": 112,
  "weight": 5,
  "conditionMode": "any",
  "conditions": [
    { "operator": "in", "field": "config.db_schema.mode", "list": ["all"] },
    { "operator": "non_empty", "field": "config.db_schema.collections" }
  ]
}
```

```ai-paths-assertion
{
  "id": "runtime.viewer_has_inputs",
  "title": "Viewer node has incoming data",
  "module": "custom",
  "severity": "info",
  "appliesToNodeTypes": ["viewer"],
  "description": "Viewer nodes should have at least one incoming connection to display runtime data.",
  "recommendation": "Connect result/context/meta ports into viewer.",
  "version": "2.0.0",
  "tags": ["viewer", "wiring"],
  "sequenceHint": 114,
  "weight": 5,
  "conditions": [
    { "operator": "has_incoming_port" }
  ]
}
```
