# Node Validator Semantic Grammar Patterns

```ai-paths-assertion
{
  "id": "semantic.graph.has_nodes",
  "title": "Semantic graph has nodes",
  "module": "graph",
  "severity": "error",
  "description": "A semantic canvas document must include at least one node.",
  "recommendation": "Add at least one node before exporting or running the path.",
  "version": "2.0.0",
  "tags": ["semantic-grammar", "graph", "interop"],
  "sequenceHint": 14,
  "weight": 60,
  "forceProbabilityIfFailed": 0,
  "conditions": [
    { "operator": "jsonpath_exists", "valuePath": "counts.nodes" },
    { "operator": "jsonpath_equals", "valuePath": "counts.nodes", "expected": 1 }
  ]
}
```

```ai-paths-assertion
{
  "id": "semantic.graph.edge_endpoints_resolve",
  "title": "All edges resolve endpoint nodes",
  "module": "graph",
  "severity": "error",
  "description": "Every edge in the semantic graph should reference existing nodes.",
  "recommendation": "Remove dangling edges or reconnect them to valid nodes.",
  "version": "2.0.0",
  "tags": ["semantic-grammar", "graph", "edge-integrity"],
  "sequenceHint": 16,
  "weight": 55,
  "forceProbabilityIfFailed": 0,
  "conditions": [
    { "operator": "edge_endpoints_resolve" }
  ]
}
```

```ai-paths-assertion
{
  "id": "semantic.graph.edge_ports_declared",
  "title": "All edges use declared node ports",
  "module": "graph",
  "severity": "error",
  "description": "Edge ports should match source outputs and target inputs.",
  "recommendation": "Reconnect edges to valid declared ports.",
  "version": "2.0.0",
  "tags": ["semantic-grammar", "ports", "edge-integrity"],
  "sequenceHint": 17,
  "weight": 48,
  "forceProbabilityIfFailed": 0,
  "conditions": [
    { "operator": "edge_ports_declared" }
  ]
}
```

```ai-paths-assertion
{
  "id": "semantic.graph.has_runnable_entry",
  "title": "Graph has runnable entry branch",
  "module": "graph",
  "severity": "warning",
  "description": "Semantic graphs should include Trigger or Simulation entry points.",
  "recommendation": "Add Trigger and/or Simulation nodes for deterministic execution entry.",
  "version": "2.0.0",
  "tags": ["semantic-grammar", "entry"],
  "sequenceHint": 18,
  "weight": 20,
  "conditionMode": "any",
  "conditions": [
    { "operator": "jsonpath_exists", "valuePath": "counts.byType.trigger" },
    { "operator": "jsonpath_exists", "valuePath": "counts.byType.simulation" }
  ]
}
```

```ai-paths-assertion
{
  "id": "semantic.subgraph.bundle_output_consumed",
  "title": "Bundle output should be consumed",
  "module": "custom",
  "severity": "info",
  "appliesToNodeTypes": ["bundle"],
  "description": "For subgraph portability, Bundle outputs should flow to a downstream node.",
  "recommendation": "Connect Bundle.bundle to Template/Prompt/Model/Database as needed.",
  "version": "2.0.0",
  "tags": ["semantic-grammar", "subgraph", "bundle"],
  "sequenceHint": 220,
  "weight": 4,
  "conditions": [
    { "operator": "has_outgoing_port", "port": "bundle" }
  ]
}
```

```ai-paths-assertion
{
  "id": "semantic.subgraph.template_to_model",
  "title": "Template prompt reaches model",
  "module": "model",
  "severity": "info",
  "appliesToNodeTypes": ["template"],
  "description": "Portable generation subgraphs should wire Template.prompt into Model.prompt.",
  "recommendation": "Connect Template.prompt to Model.prompt.",
  "version": "2.0.0",
  "tags": ["semantic-grammar", "subgraph", "generation"],
  "sequenceHint": 222,
  "weight": 4,
  "conditions": [
    { "operator": "wired_to", "fromPort": "prompt", "toNodeType": "model", "toPort": "prompt" }
  ]
}
```
