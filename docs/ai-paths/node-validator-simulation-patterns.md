---
owner: 'AI Paths Team'
last_reviewed: '2026-03-26'
status: 'active'
doc_type: 'reference'
scope: 'feature:ai-paths'
canonical: true
---

# Node Validator Simulation Patterns

This is the maintained simulation-domain pattern pack for AI Paths node
validation. Use [`./node-validator-central-patterns.md`](./node-validator-central-patterns.md)
for the full validator pattern-pack index and [`./reference.md`](./reference.md)
for the broader runtime model these assertions support.

```ai-paths-assertion
{
  "id": "simulation.entity_collection_resolves",
  "title": "Simulation resolves entity and collection",
  "module": "simulation",
  "severity": "error",
  "appliesToNodeTypes": ["simulation"],
  "description": "Simulation requires entity identity and collection map resolution.",
  "recommendation": "Set simulation.entityType and entityId/productId and keep collection map valid.",
  "version": "2.0.0",
  "tags": ["simulation", "critical"],
  "sequenceHint": 70,
  "weight": 60,
  "forceProbabilityIfFailed": 0,
  "conditions": [
    { "operator": "entity_collection_resolves" }
  ]
}
```

```ai-paths-assertion
{
  "id": "simulation.entity_type_present",
  "title": "Simulation entityType configured",
  "module": "simulation",
  "severity": "warning",
  "appliesToNodeTypes": ["simulation"],
  "description": "Explicit entityType improves deterministic context loading.",
  "recommendation": "Set simulation.entityType (for example product or note).",
  "version": "2.0.0",
  "tags": ["simulation"],
  "sequenceHint": 72,
  "weight": 8,
  "conditions": [
    { "operator": "non_empty", "field": "config.simulation.entityType" }
  ]
}
```

```ai-paths-assertion
{
  "id": "simulation.identity_present",
  "title": "Simulation identity configured",
  "module": "simulation",
  "severity": "error",
  "appliesToNodeTypes": ["simulation"],
  "description": "Simulation should provide entityId or productId.",
  "recommendation": "Set simulation.entityId or simulation.productId.",
  "version": "2.0.0",
  "tags": ["simulation"],
  "sequenceHint": 74,
  "weight": 30,
  "conditionMode": "any",
  "conditions": [
    { "operator": "non_empty", "field": "config.simulation.entityId" },
    { "operator": "non_empty", "field": "config.simulation.productId" }
  ]
}
```

```ai-paths-assertion
{
  "id": "simulation.trigger_input_wired",
  "title": "Simulation trigger input wired",
  "module": "simulation",
  "severity": "warning",
  "appliesToNodeTypes": ["simulation"],
  "description": "Simulation node usually receives Trigger.trigger input in interactive flows.",
  "recommendation": "Wire Trigger.trigger to Simulation.trigger.",
  "version": "2.0.0",
  "tags": ["simulation", "wiring"],
  "sequenceHint": 76,
  "weight": 8,
  "conditions": [
    { "operator": "has_incoming_port", "port": "trigger" }
  ]
}
```

```ai-paths-assertion
{
  "id": "simulation.outputs_to_trigger_context",
  "title": "Simulation context feeds Trigger context",
  "module": "simulation",
  "severity": "info",
  "appliesToNodeTypes": ["simulation"],
  "description": "Recommended loop for simulation-driven tests.",
  "recommendation": "Wire Simulation.context to Trigger.context.",
  "version": "2.0.0",
  "tags": ["simulation", "wiring"],
  "sequenceHint": 78,
  "weight": 4,
  "conditions": [
    { "operator": "wired_to", "fromPort": "context", "toNodeType": "trigger", "toPort": "context" }
  ]
}
```

```ai-paths-assertion
{
  "id": "simulation.context_branch_exists",
  "title": "Simulation context reaches context node",
  "module": "simulation",
  "severity": "info",
  "appliesToNodeTypes": ["simulation"],
  "description": "Simulation context should feed context-processing branch.",
  "recommendation": "Connect Simulation.context to Context.context or Trigger.context branch.",
  "version": "2.0.0",
  "tags": ["simulation", "wiring"],
  "sequenceHint": 79,
  "weight": 4,
  "conditionMode": "any",
  "conditions": [
    { "operator": "wired_to", "fromPort": "context", "toNodeType": "context" },
    { "operator": "wired_to", "fromPort": "context", "toNodeType": "trigger" }
  ]
}
```
