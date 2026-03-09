---
owner: 'AI Paths Team'
last_reviewed: '2026-03-09'
status: 'active'
doc_type: 'reference'
scope: 'feature:ai-paths'
canonical: true
---

# Node Validator Core Patterns

```ai-paths-assertion
{
  "id": "core.graph.trigger_exists",
  "title": "Graph contains Trigger node",
  "module": "graph",
  "severity": "error",
  "description": "Runnable paths require at least one trigger node.",
  "recommendation": "Add Trigger and wire it to the workflow entry.",
  "version": "2.0.0",
  "tags": ["core", "graph", "entry"],
  "sequenceHint": 10,
  "weight": 60,
  "forceProbabilityIfFailed": 0,
  "conditionMode": "all",
  "conditions": [
    { "operator": "jsonpath_exists", "valuePath": "counts.byType.trigger" },
    { "operator": "jsonpath_equals", "valuePath": "counts.byType.trigger", "expected": 1 }
  ]
}
```

```ai-paths-assertion
{
  "id": "core.graph.has_edges",
  "title": "Graph has at least one edge",
  "module": "graph",
  "severity": "warning",
  "description": "Completely disconnected graphs are usually configuration mistakes.",
  "recommendation": "Connect nodes using compatible ports.",
  "version": "2.0.0",
  "tags": ["core", "graph"],
  "sequenceHint": 12,
  "weight": 10,
  "conditions": [
    { "operator": "jsonpath_exists", "valuePath": "counts.edges" },
    { "operator": "jsonpath_equals", "valuePath": "counts.edges", "expected": 1 }
  ]
}
```

```ai-paths-assertion
{
  "id": "core.trigger.event_configured",
  "title": "Trigger event configured",
  "module": "trigger",
  "severity": "error",
  "appliesToNodeTypes": ["trigger"],
  "description": "Trigger nodes must define event id.",
  "recommendation": "Set trigger.event to manual, scheduled_run, or custom trigger button id.",
  "version": "2.0.0",
  "tags": ["trigger"],
  "sequenceHint": 20,
  "weight": 40,
  "conditions": [
    { "operator": "non_empty", "field": "config.trigger.event" }
  ]
}
```

```ai-paths-assertion
{
  "id": "core.context.manual_entity_id",
  "title": "Context manual mode needs entity id",
  "module": "context",
  "severity": "warning",
  "appliesToNodeTypes": ["context"],
  "description": "When entityIdSource is manual, entityId should be present.",
  "recommendation": "Provide context.entityId or change entityIdSource.",
  "version": "2.0.0",
  "tags": ["context"],
  "sequenceHint": 30,
  "weight": 14,
  "conditionMode": "any",
  "conditions": [
    { "operator": "in", "field": "config.context.entityIdSource", "list": ["manual"], "negate": true },
    { "operator": "non_empty", "field": "config.context.entityId" }
  ]
}
```

```ai-paths-assertion
{
  "id": "core.parser.mappings_present",
  "title": "Parser mappings configured",
  "module": "parser",
  "severity": "error",
  "appliesToNodeTypes": ["parser"],
  "description": "Parser nodes require mappings to produce stable outputs.",
  "recommendation": "Set parser.mappings to explicit output paths.",
  "version": "2.0.0",
  "tags": ["parser"],
  "sequenceHint": 40,
  "weight": 30,
  "conditions": [
    { "operator": "non_empty", "field": "config.parser.mappings" }
  ]
}
```

```ai-paths-assertion
{
  "id": "core.regex.pattern_present",
  "title": "Regex pattern configured",
  "module": "parser",
  "severity": "warning",
  "appliesToNodeTypes": ["regex"],
  "description": "Regex nodes should define regex.pattern.",
  "recommendation": "Set regex.pattern or use regex template.",
  "version": "2.0.0",
  "tags": ["regex"],
  "sequenceHint": 42,
  "weight": 12,
  "conditions": [
    { "operator": "non_empty", "field": "config.regex.pattern" }
  ]
}
```

```ai-paths-assertion
{
  "id": "core.prompt.template_present",
  "title": "Prompt template configured",
  "module": "model",
  "severity": "error",
  "appliesToNodeTypes": ["prompt"],
  "description": "Prompt nodes require prompt.template.",
  "recommendation": "Set prompt.template before model execution.",
  "version": "2.0.0",
  "tags": ["prompt"],
  "sequenceHint": 50,
  "weight": 25,
  "conditions": [
    { "operator": "non_empty", "field": "config.prompt.template" }
  ]
}
```

```ai-paths-assertion
{
  "id": "core.router.has_outgoing",
  "title": "Router has outgoing branches",
  "module": "router",
  "severity": "warning",
  "appliesToNodeTypes": ["router"],
  "description": "Router nodes should route to downstream nodes.",
  "recommendation": "Connect router outputs to branch nodes.",
  "version": "2.0.0",
  "tags": ["router", "wiring"],
  "sequenceHint": 60,
  "weight": 10,
  "conditions": [
    { "operator": "has_outgoing_port" }
  ]
}
```

```ai-paths-assertion
{
  "id": "core.gate.has_outgoing",
  "title": "Gate has outgoing branch",
  "module": "gate",
  "severity": "warning",
  "appliesToNodeTypes": ["gate"],
  "description": "Gate nodes should continue to a downstream node.",
  "recommendation": "Connect gate output to next branch node.",
  "version": "2.0.0",
  "tags": ["gate", "wiring"],
  "sequenceHint": 62,
  "weight": 10,
  "conditions": [
    { "operator": "has_outgoing_port" }
  ]
}
```
