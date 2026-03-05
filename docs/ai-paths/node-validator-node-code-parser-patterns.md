# Node Validator Node-Code Parser Patterns

Pattern list id: `kernel-node-code-parser-v1`

Sequences:

- `node_code_preflight` (`310-320`)
- `node_code_ports` (`330-340`)
- `node_code_validation_pattern_runtime` (`350-360`)

Primary docs bindings:

- `docs/ai-paths/node-code-objects-v2/index.json`
- `docs/ai-paths/node-code-objects-v3/migration-index.json`

```ai-paths-assertion
{
  "id": "kernel.node_code.node_id_present",
  "title": "Node code has stable node id",
  "module": "custom",
  "severity": "error",
  "description": "Every node code payload must include a non-empty node id.",
  "recommendation": "Set a deterministic non-empty id for each node object before runtime parsing.",
  "version": "2.1.0",
  "tags": [
    "kernel-parser",
    "node-code",
    "pattern-list:kernel-node-code-parser-v1",
    "sequence:node_code_preflight"
  ],
  "docsBindings": [
    "docs/ai-paths/node-code-objects-v2/index.json",
    "docs/ai-paths/node-code-objects-v3/migration-index.json"
  ],
  "sequenceHint": 310,
  "weight": 24,
  "conditions": [
    { "operator": "non_empty", "field": "id" }
  ]
}
```

```ai-paths-assertion
{
  "id": "kernel.node_code.node_type_known_from_code_objects",
  "title": "Node code type is known in node-code object index",
  "module": "graph",
  "severity": "error",
  "description": "All node types in the path should be present in node-code-objects-v2 index.",
  "recommendation": "Replace unknown node types with documented node-code object types.",
  "version": "2.1.0",
  "tags": [
    "kernel-parser",
    "node-code",
    "pattern-list:kernel-node-code-parser-v1",
    "sequence:node_code_preflight"
  ],
  "docsBindings": [
    "docs/ai-paths/node-code-objects-v2/index.json"
  ],
  "sequenceHint": 312,
  "weight": 24,
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
  "id": "kernel.node_code.node_title_present",
  "title": "Node code title is present",
  "module": "custom",
  "severity": "warning",
  "description": "Node titles should be non-empty to keep path-code review and debugging readable.",
  "recommendation": "Set a non-empty node title in each node code object.",
  "version": "2.1.0",
  "tags": [
    "kernel-parser",
    "node-code",
    "pattern-list:kernel-node-code-parser-v1",
    "sequence:node_code_preflight"
  ],
  "docsBindings": [
    "docs/ai-paths/node-code-objects-v2/index.json"
  ],
  "sequenceHint": 314,
  "weight": 8,
  "conditions": [
    { "operator": "non_empty", "field": "title" }
  ]
}
```

```ai-paths-assertion
{
  "id": "kernel.node_code.node_config_present",
  "title": "Node code config object is present",
  "module": "custom",
  "severity": "warning",
  "description": "Portable node code contracts define config fields for every node type.",
  "recommendation": "Ensure node.config exists and carries documented configuration keys.",
  "version": "2.1.0",
  "tags": [
    "kernel-parser",
    "node-code",
    "pattern-list:kernel-node-code-parser-v1",
    "sequence:node_code_preflight"
  ],
  "docsBindings": [
    "docs/ai-paths/node-code-objects-v2/index.json"
  ],
  "sequenceHint": 316,
  "weight": 8,
  "conditions": [
    { "operator": "non_empty", "field": "config" }
  ]
}
```

```ai-paths-assertion
{
  "id": "kernel.node_code.inputs_declared_when_required_by_code_object",
  "title": "Node code declares input ports when contract expects inputs",
  "module": "custom",
  "severity": "warning",
  "description": "Node types with input ports in the node-code object index should expose non-empty node.inputs.",
  "recommendation": "Declare input ports from the node-code object contract on each matching node.",
  "version": "2.1.0",
  "tags": [
    "kernel-parser",
    "node-code",
    "pattern-list:kernel-node-code-parser-v1",
    "sequence:node_code_ports"
  ],
  "docsBindings": [
    "docs/ai-paths/node-code-objects-v2/index.json"
  ],
  "sequenceHint": 330,
  "weight": 7,
  "conditionMode": "any",
  "conditions": [
    {
      "operator": "in",
      "field": "type",
      "list": [
        "agent",
        "ai_description",
        "api_advanced",
        "audio_oscillator",
        "audio_speaker",
        "bundle",
        "compare",
        "context",
        "database",
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
        "validation_pattern",
        "validator",
        "viewer"
      ],
      "negate": true
    },
    { "operator": "non_empty", "field": "inputs" }
  ]
}
```

```ai-paths-assertion
{
  "id": "kernel.node_code.outputs_declared_when_required_by_code_object",
  "title": "Node code declares output ports when contract expects outputs",
  "module": "custom",
  "severity": "warning",
  "description": "Node types with output ports in the node-code object index should expose non-empty node.outputs.",
  "recommendation": "Declare output ports from the node-code object contract on each matching node.",
  "version": "2.1.0",
  "tags": [
    "kernel-parser",
    "node-code",
    "pattern-list:kernel-node-code-parser-v1",
    "sequence:node_code_ports"
  ],
  "docsBindings": [
    "docs/ai-paths/node-code-objects-v2/index.json"
  ],
  "sequenceHint": 332,
  "weight": 7,
  "conditionMode": "any",
  "conditions": [
    {
      "operator": "in",
      "field": "type",
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
        "validator"
      ],
      "negate": true
    },
    { "operator": "non_empty", "field": "outputs" }
  ]
}
```

```ai-paths-assertion
{
  "id": "kernel.node_code.validation_pattern_source_declared",
  "title": "Validation Pattern node declares source mode",
  "module": "validation_pattern",
  "severity": "error",
  "appliesToNodeTypes": ["validation_pattern"],
  "description": "Validation Pattern node code should explicitly declare validationPattern.source.",
  "recommendation": "Set validationPattern.source to global_stack or path_local.",
  "version": "2.1.0",
  "tags": [
    "kernel-parser",
    "node-code",
    "validation-pattern",
    "pattern-list:kernel-node-code-parser-v1",
    "sequence:node_code_validation_pattern_runtime"
  ],
  "docsBindings": [
    "docs/ai-paths/node-code-objects-v2/validation_pattern.json"
  ],
  "sequenceHint": 350,
  "weight": 20,
  "conditions": [
    { "operator": "non_empty", "field": "config.validationPattern.source" }
  ]
}
```

```ai-paths-assertion
{
  "id": "kernel.node_code.validation_pattern_global_stack_selected_when_source_global",
  "title": "Validation Pattern global source has stack id",
  "module": "validation_pattern",
  "severity": "error",
  "appliesToNodeTypes": ["validation_pattern"],
  "description": "When validationPattern.source is global_stack, stackId should be set.",
  "recommendation": "Set validationPattern.stackId when using global_stack source mode.",
  "version": "2.1.0",
  "tags": [
    "kernel-parser",
    "node-code",
    "validation-pattern",
    "pattern-list:kernel-node-code-parser-v1",
    "sequence:node_code_validation_pattern_runtime"
  ],
  "docsBindings": [
    "docs/ai-paths/node-code-objects-v2/validation_pattern.json"
  ],
  "sequenceHint": 352,
  "weight": 20,
  "conditionMode": "any",
  "conditions": [
    {
      "operator": "in",
      "field": "config.validationPattern.source",
      "list": ["global_stack"],
      "negate": true
    },
    { "operator": "non_empty", "field": "config.validationPattern.stackId" }
  ]
}
```

```ai-paths-assertion
{
  "id": "kernel.node_code.validation_pattern_path_local_rules_present",
  "title": "Validation Pattern path-local source has rules",
  "module": "validation_pattern",
  "severity": "warning",
  "appliesToNodeTypes": ["validation_pattern"],
  "description": "When validationPattern.source is path_local, at least one local rules collection should be non-empty.",
  "recommendation": "Provide validationPattern.rules or validationPattern.learnedRules for path_local source mode.",
  "version": "2.1.0",
  "tags": [
    "kernel-parser",
    "node-code",
    "validation-pattern",
    "pattern-list:kernel-node-code-parser-v1",
    "sequence:node_code_validation_pattern_runtime"
  ],
  "docsBindings": [
    "docs/ai-paths/node-code-objects-v2/validation_pattern.json"
  ],
  "sequenceHint": 354,
  "weight": 10,
  "conditionMode": "any",
  "conditions": [
    {
      "operator": "in",
      "field": "config.validationPattern.source",
      "list": ["path_local"],
      "negate": true
    },
    { "operator": "non_empty", "field": "config.validationPattern.rules" },
    { "operator": "non_empty", "field": "config.validationPattern.learnedRules" }
  ]
}
```

```ai-paths-assertion
{
  "id": "kernel.node_code.validation_pattern_io_ports_declared",
  "title": "Validation Pattern runtime IO ports are explicit",
  "module": "validation_pattern",
  "severity": "warning",
  "appliesToNodeTypes": ["validation_pattern"],
  "description": "Validation Pattern runtime parsing should define inputPort and outputPort for deterministic behavior.",
  "recommendation": "Set validationPattern.inputPort and validationPattern.outputPort explicitly.",
  "version": "2.1.0",
  "tags": [
    "kernel-parser",
    "node-code",
    "validation-pattern",
    "pattern-list:kernel-node-code-parser-v1",
    "sequence:node_code_validation_pattern_runtime"
  ],
  "docsBindings": [
    "docs/ai-paths/node-code-objects-v2/validation_pattern.json"
  ],
  "sequenceHint": 356,
  "weight": 8,
  "conditions": [
    { "operator": "non_empty", "field": "config.validationPattern.inputPort" },
    { "operator": "non_empty", "field": "config.validationPattern.outputPort" }
  ]
}
```
