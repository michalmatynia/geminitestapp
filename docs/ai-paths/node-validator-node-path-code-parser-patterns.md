# Node Validator Node-Path-Code Parser Patterns

Pattern list id: `kernel-node-path-code-parser-v1`

Sequences:

- `node_path_graph` (`410-430`)
- `node_path_execution_shape` (`440-450`)

Primary docs bindings:

- `docs/ai-paths/node-code-objects-v2/index.json`
- `docs/ai-paths/node-code-objects-v3/migration-index.json`

```ai-paths-assertion
{
  "id": "kernel.node_path_code.graph_has_nodes",
  "title": "Node path code contains nodes",
  "module": "graph",
  "severity": "error",
  "description": "A path-code payload must include at least one node for kernel parsing.",
  "recommendation": "Add at least one node object before running the path parser.",
  "version": "2.1.0",
  "tags": [
    "kernel-parser",
    "node-path-code",
    "pattern-list:kernel-node-path-code-parser-v1",
    "sequence:node_path_graph"
  ],
  "docsBindings": [
    "docs/ai-paths/node-code-objects-v2/index.json"
  ],
  "sequenceHint": 410,
  "weight": 30,
  "conditions": [
    { "operator": "jsonpath_exists", "valuePath": "counts.nodes" },
    { "operator": "jsonpath_equals", "valuePath": "counts.nodes", "expected": 1 }
  ]
}
```

```ai-paths-assertion
{
  "id": "kernel.node_path_code.graph_has_entry_node",
  "title": "Node path code has an entry node",
  "module": "graph",
  "severity": "error",
  "description": "Path-code payload should include at least one supported entry node (trigger/simulation).",
  "recommendation": "Add a Trigger or Simulation node as the execution entry for the path.",
  "version": "2.1.0",
  "tags": [
    "kernel-parser",
    "node-path-code",
    "pattern-list:kernel-node-path-code-parser-v1",
    "sequence:node_path_graph"
  ],
  "docsBindings": [
    "docs/ai-paths/node-code-objects-v2/index.json"
  ],
  "sequenceHint": 412,
  "weight": 24,
  "conditionMode": "any",
  "conditions": [
    { "operator": "jsonpath_exists", "valuePath": "counts.byType.trigger" },
    { "operator": "jsonpath_exists", "valuePath": "counts.byType.simulation" }
  ]
}
```

```ai-paths-assertion
{
  "id": "kernel.node_path_code.node_types_known_from_code_objects",
  "title": "Node path code uses known node types",
  "module": "graph",
  "severity": "error",
  "description": "Node path parser accepts only node types documented by node-code object contracts.",
  "recommendation": "Replace unknown node types with supported entries from node-code object docs.",
  "version": "2.1.0",
  "tags": [
    "kernel-parser",
    "node-path-code",
    "pattern-list:kernel-node-path-code-parser-v1",
    "sequence:node_path_graph"
  ],
  "docsBindings": [
    "docs/ai-paths/node-code-objects-v2/index.json"
  ],
  "sequenceHint": 414,
  "weight": 26,
  "conditions": [
    {
      "operator": "node_types_known",
      "list": [
        "agent",
        "ai_description",
        "api_advanced",
        "audio_oscillator",
        "audio_speaker",
        "bundle",
        "compare",
        "constant",
        "context",
        "database",
        "db_schema",
        "delay",
        "description_updater",
        "fetcher",
        "gate",
        "http",
        "iterator",
        "learner_agent",
        "mapper",
        "math",
        "model",
        "mutator",
        "notification",
        "parser",
        "playwright",
        "poll",
        "prompt",
        "regex",
        "router",
        "simulation",
        "string_mutator",
        "template",
        "trigger",
        "validation_pattern",
        "validator",
        "viewer"
      ]
    }
  ]
}
```

```ai-paths-assertion
{
  "id": "kernel.node_path_code.node_ids_unique",
  "title": "Node path code node ids are unique",
  "module": "graph",
  "severity": "error",
  "description": "Duplicate node IDs break deterministic parsing and edge resolution.",
  "recommendation": "Regenerate or rename duplicate node IDs before execution.",
  "version": "2.1.0",
  "tags": [
    "kernel-parser",
    "node-path-code",
    "pattern-list:kernel-node-path-code-parser-v1",
    "sequence:node_path_graph"
  ],
  "docsBindings": [
    "docs/ai-paths/node-code-objects-v2/index.json"
  ],
  "sequenceHint": 416,
  "weight": 20,
  "conditions": [
    { "operator": "node_ids_unique" }
  ]
}
```

```ai-paths-assertion
{
  "id": "kernel.node_path_code.edge_ids_unique",
  "title": "Node path code edge ids are unique",
  "module": "graph",
  "severity": "error",
  "description": "Duplicate edge IDs produce unstable edge updates and parser ambiguity.",
  "recommendation": "Regenerate duplicate edge IDs before runtime parsing.",
  "version": "2.1.0",
  "tags": [
    "kernel-parser",
    "node-path-code",
    "pattern-list:kernel-node-path-code-parser-v1",
    "sequence:node_path_graph"
  ],
  "docsBindings": [
    "docs/ai-paths/node-code-objects-v2/index.json"
  ],
  "sequenceHint": 418,
  "weight": 18,
  "conditions": [
    { "operator": "edge_ids_unique" }
  ]
}
```

```ai-paths-assertion
{
  "id": "kernel.node_path_code.edge_endpoints_resolve",
  "title": "Node path code edge endpoints resolve",
  "module": "graph",
  "severity": "error",
  "description": "Every edge in node path code should reference existing node IDs.",
  "recommendation": "Reconnect or remove dangling edges before running the parser.",
  "version": "2.1.0",
  "tags": [
    "kernel-parser",
    "node-path-code",
    "pattern-list:kernel-node-path-code-parser-v1",
    "sequence:node_path_graph"
  ],
  "docsBindings": [
    "docs/ai-paths/node-code-objects-v2/index.json"
  ],
  "sequenceHint": 420,
  "weight": 24,
  "conditions": [
    { "operator": "edge_endpoints_resolve" }
  ]
}
```

```ai-paths-assertion
{
  "id": "kernel.node_path_code.edge_ports_declared",
  "title": "Node path code edge ports are declared",
  "module": "graph",
  "severity": "error",
  "description": "Edge fromPort/toPort values must exist in source/target node contracts.",
  "recommendation": "Reconnect edges to ports declared by node-code object port contracts.",
  "version": "2.1.0",
  "tags": [
    "kernel-parser",
    "node-path-code",
    "pattern-list:kernel-node-path-code-parser-v1",
    "sequence:node_path_graph"
  ],
  "docsBindings": [
    "docs/ai-paths/node-code-objects-v2/index.json"
  ],
  "sequenceHint": 422,
  "weight": 20,
  "conditions": [
    { "operator": "edge_ports_declared" }
  ]
}
```

```ai-paths-assertion
{
  "id": "kernel.node_path_code.node_positions_finite",
  "title": "Node path code uses finite node positions",
  "module": "graph",
  "severity": "warning",
  "description": "Node positions should be finite numbers for stable canvas parsing and export.",
  "recommendation": "Reset NaN/Infinity node positions before persisting path code.",
  "version": "2.1.0",
  "tags": [
    "kernel-parser",
    "node-path-code",
    "pattern-list:kernel-node-path-code-parser-v1",
    "sequence:node_path_graph"
  ],
  "docsBindings": [
    "docs/ai-paths/node-code-objects-v2/index.json"
  ],
  "sequenceHint": 424,
  "weight": 8,
  "conditions": [
    { "operator": "node_positions_finite" }
  ]
}
```

```ai-paths-assertion
{
  "id": "kernel.node_path_code.graph_has_edges",
  "title": "Node path code has at least one edge",
  "module": "graph",
  "severity": "warning",
  "description": "Disconnected path-code payloads are usually incomplete migration/copy artifacts.",
  "recommendation": "Connect nodes with at least one valid edge or remove unused nodes.",
  "version": "2.1.0",
  "tags": [
    "kernel-parser",
    "node-path-code",
    "pattern-list:kernel-node-path-code-parser-v1",
    "sequence:node_path_execution_shape"
  ],
  "docsBindings": [
    "docs/ai-paths/node-code-objects-v2/index.json"
  ],
  "sequenceHint": 440,
  "weight": 6,
  "conditions": [
    { "operator": "jsonpath_exists", "valuePath": "counts.edges" },
    { "operator": "jsonpath_equals", "valuePath": "counts.edges", "expected": 1 }
  ]
}
```

```ai-paths-assertion
{
  "id": "kernel.node_path_code.graph_has_terminal_sink",
  "title": "Node path code has a terminal sink node",
  "module": "graph",
  "severity": "info",
  "description": "Paths are easier to debug and observe when outputs reach Viewer/Database/Notification sinks.",
  "recommendation": "Connect branches to viewer, database, or notification sink nodes.",
  "version": "2.1.0",
  "tags": [
    "kernel-parser",
    "node-path-code",
    "pattern-list:kernel-node-path-code-parser-v1",
    "sequence:node_path_execution_shape"
  ],
  "docsBindings": [
    "docs/ai-paths/node-code-objects-v2/index.json",
    "docs/ai-paths/node-code-objects-v3/migration-index.json"
  ],
  "sequenceHint": 442,
  "weight": 3,
  "conditionMode": "any",
  "conditions": [
    { "operator": "jsonpath_exists", "valuePath": "counts.byType.viewer" },
    { "operator": "jsonpath_exists", "valuePath": "counts.byType.database" },
    { "operator": "jsonpath_exists", "valuePath": "counts.byType.notification" }
  ]
}
```
