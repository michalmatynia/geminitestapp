export const AI_PATHS_TOOLTIP_CATALOG_CHUNK_07 = [
  {
    "id": "node_config_field_mapper_mapper_jsonintegritypolicy",
    "title": "JSON Mapper: mapper.jsonIntegrityPolicy",
    "summary": "How mapper normalizes JSON-like string inputs before resolving mapping paths. strict performs no repair. repair uses the shared staged JSON normalization pipeline before path resolution.",
    "section": "Node Config - JSON Mapper",
    "aliases": [
      "mapper",
      "mapper.jsonIntegrityPolicy",
      "mapper.mapper.jsonIntegrityPolicy"
    ],
    "docPath": "/docs/ai-paths/semantic-grammar/nodes/mapper.json",
    "tags": [
      "ai-paths",
      "nodes",
      "palette",
      "config",
      "node",
      "config-field"
    ],
    "uiTargets": [
      "node-config.mapper.mapper.jsonIntegrityPolicy"
    ]
  },
  {
    "id": "node_config_field_mapper_mapper_mappings",
    "title": "JSON Mapper: mapper.mappings",
    "summary": "Map output port name -> JSON path (relative to context).",
    "section": "Node Config - JSON Mapper",
    "aliases": [
      "mapper",
      "mapper.mappings",
      "mapper.mapper.mappings"
    ],
    "docPath": "/docs/ai-paths/semantic-grammar/nodes/mapper.json",
    "tags": [
      "ai-paths",
      "nodes",
      "palette",
      "config",
      "node",
      "config-field"
    ],
    "uiTargets": [
      "node-config.mapper.mapper.mappings"
    ]
  },
  {
    "id": "node_config_field_mapper_mapper_outputs",
    "title": "JSON Mapper: mapper.outputs",
    "summary": "Which output ports the mapper should expose (the ports must exist on the node).",
    "section": "Node Config - JSON Mapper",
    "aliases": [
      "mapper",
      "mapper.outputs",
      "mapper.mapper.outputs"
    ],
    "docPath": "/docs/ai-paths/semantic-grammar/nodes/mapper.json",
    "tags": [
      "ai-paths",
      "nodes",
      "palette",
      "config",
      "node",
      "config-field"
    ],
    "uiTargets": [
      "node-config.mapper.mapper.outputs"
    ]
  },
  {
    "id": "node_config_field_mapper_runtime_cache_mode",
    "title": "JSON Mapper: runtime.cache.mode",
    "summary": "Node output caching. auto = reuse when safe, force = always reuse, disabled = recompute each run.",
    "section": "Node Config - JSON Mapper",
    "aliases": [
      "mapper",
      "runtime.cache.mode",
      "mapper.runtime.cache.mode"
    ],
    "docPath": "/docs/ai-paths/semantic-grammar/nodes/mapper.json",
    "tags": [
      "ai-paths",
      "nodes",
      "palette",
      "config",
      "node",
      "config-field"
    ],
    "uiTargets": [
      "node-config.mapper.runtime.cache.mode"
    ]
  },
  {
    "id": "node_config_field_mapper_runtime_cache_scope",
    "title": "JSON Mapper: runtime.cache.scope",
    "summary": "Cache key scope. run = isolate each run, activation = isolate by trigger/entity context, session = reuse across session.",
    "section": "Node Config - JSON Mapper",
    "aliases": [
      "mapper",
      "runtime.cache.scope",
      "mapper.runtime.cache.scope"
    ],
    "docPath": "/docs/ai-paths/semantic-grammar/nodes/mapper.json",
    "tags": [
      "ai-paths",
      "nodes",
      "palette",
      "config",
      "node",
      "config-field"
    ],
    "uiTargets": [
      "node-config.mapper.runtime.cache.scope"
    ]
  },
  {
    "id": "node_config_field_mapper_runtime_waitforinputs",
    "title": "JSON Mapper: runtime.waitForInputs",
    "summary": "If true, wait until all connected input ports have values before executing the node.",
    "section": "Node Config - JSON Mapper",
    "aliases": [
      "mapper",
      "runtime.waitForInputs",
      "mapper.runtime.waitForInputs"
    ],
    "docPath": "/docs/ai-paths/semantic-grammar/nodes/mapper.json",
    "tags": [
      "ai-paths",
      "nodes",
      "palette",
      "config",
      "node",
      "config-field"
    ],
    "uiTargets": [
      "node-config.mapper.runtime.waitForInputs"
    ]
  },
  {
    "id": "node_config_field_math_math_operand",
    "title": "Math: math.operand",
    "summary": "Number used by the operation (ignored for round/ceil/floor).",
    "section": "Node Config - Math",
    "aliases": [
      "math",
      "math.operand",
      "math.math.operand"
    ],
    "docPath": "/docs/ai-paths/semantic-grammar/nodes/math.json",
    "tags": [
      "ai-paths",
      "nodes",
      "palette",
      "config",
      "node",
      "config-field"
    ],
    "uiTargets": [
      "node-config.math.math.operand"
    ]
  },
  {
    "id": "node_config_field_math_math_operation",
    "title": "Math: math.operation",
    "summary": "Numeric operation to apply: add/subtract/multiply/divide/round/ceil/floor.",
    "section": "Node Config - Math",
    "aliases": [
      "math",
      "math.operation",
      "math.math.operation"
    ],
    "docPath": "/docs/ai-paths/semantic-grammar/nodes/math.json",
    "tags": [
      "ai-paths",
      "nodes",
      "palette",
      "config",
      "node",
      "config-field"
    ],
    "uiTargets": [
      "node-config.math.math.operation"
    ]
  },
  {
    "id": "node_config_field_math_runtime_cache_mode",
    "title": "Math: runtime.cache.mode",
    "summary": "Node output caching. auto = reuse when safe, force = always reuse, disabled = recompute each run.",
    "section": "Node Config - Math",
    "aliases": [
      "math",
      "runtime.cache.mode",
      "math.runtime.cache.mode"
    ],
    "docPath": "/docs/ai-paths/semantic-grammar/nodes/math.json",
    "tags": [
      "ai-paths",
      "nodes",
      "palette",
      "config",
      "node",
      "config-field"
    ],
    "uiTargets": [
      "node-config.math.runtime.cache.mode"
    ]
  },
  {
    "id": "node_config_field_math_runtime_cache_scope",
    "title": "Math: runtime.cache.scope",
    "summary": "Cache key scope. run = isolate each run, activation = isolate by trigger/entity context, session = reuse across session.",
    "section": "Node Config - Math",
    "aliases": [
      "math",
      "runtime.cache.scope",
      "math.runtime.cache.scope"
    ],
    "docPath": "/docs/ai-paths/semantic-grammar/nodes/math.json",
    "tags": [
      "ai-paths",
      "nodes",
      "palette",
      "config",
      "node",
      "config-field"
    ],
    "uiTargets": [
      "node-config.math.runtime.cache.scope"
    ]
  },
  {
    "id": "node_config_field_math_runtime_waitforinputs",
    "title": "Math: runtime.waitForInputs",
    "summary": "If true, wait until all connected input ports have values before executing the node.",
    "section": "Node Config - Math",
    "aliases": [
      "math",
      "runtime.waitForInputs",
      "math.runtime.waitForInputs"
    ],
    "docPath": "/docs/ai-paths/semantic-grammar/nodes/math.json",
    "tags": [
      "ai-paths",
      "nodes",
      "palette",
      "config",
      "node",
      "config-field"
    ],
    "uiTargets": [
      "node-config.math.runtime.waitForInputs"
    ]
  },
  {
    "id": "node_config_field_model_model_maxtokens",
    "title": "Model: model.maxTokens",
    "summary": "Node-level maximum output tokens. When set, it overrides the AI Brain default for this node.",
    "section": "Node Config - Model",
    "aliases": [
      "model",
      "model.maxTokens",
      "model.model.maxTokens"
    ],
    "docPath": "/docs/ai-paths/semantic-grammar/nodes/model.json",
    "tags": [
      "ai-paths",
      "nodes",
      "palette",
      "config",
      "node",
      "config-field"
    ],
    "uiTargets": [
      "node-config.model.model.maxTokens"
    ]
  },
  {
    "id": "node_config_field_model_model_modelid",
    "title": "Model: model.modelId",
    "summary": "Optional node-selected model ID. Empty means inherit the AI Brain default model for AI Paths. The picker uses the Brain model catalog.",
    "section": "Node Config - Model",
    "aliases": [
      "model",
      "model.modelId",
      "model.model.modelId"
    ],
    "docPath": "/docs/ai-paths/semantic-grammar/nodes/model.json",
    "tags": [
      "ai-paths",
      "nodes",
      "palette",
      "config",
      "node",
      "config-field"
    ],
    "uiTargets": [
      "node-config.model.model.modelId"
    ]
  },
  {
    "id": "node_config_field_model_model_systemprompt",
    "title": "Model: model.systemPrompt",
    "summary": "Optional node-level system prompt. A non-empty value overrides the AI Brain default; empty inherits the AI Brain prompt.",
    "section": "Node Config - Model",
    "aliases": [
      "model",
      "model.systemPrompt",
      "model.model.systemPrompt"
    ],
    "docPath": "/docs/ai-paths/semantic-grammar/nodes/model.json",
    "tags": [
      "ai-paths",
      "nodes",
      "palette",
      "config",
      "node",
      "config-field"
    ],
    "uiTargets": [
      "node-config.model.model.systemPrompt"
    ]
  },
  {
    "id": "node_config_field_model_model_temperature",
    "title": "Model: model.temperature",
    "summary": "Node-level sampling temperature (0-2). When set, it overrides the AI Brain default for this node.",
    "section": "Node Config - Model",
    "aliases": [
      "model",
      "model.temperature",
      "model.model.temperature"
    ],
    "docPath": "/docs/ai-paths/semantic-grammar/nodes/model.json",
    "tags": [
      "ai-paths",
      "nodes",
      "palette",
      "config",
      "node",
      "config-field"
    ],
    "uiTargets": [
      "node-config.model.model.temperature"
    ]
  },
  {
    "id": "node_config_field_model_model_vision",
    "title": "Model: model.vision",
    "summary": "When true, image URLs are included as vision inputs if connected. Provider execution still routes through AI Brain.",
    "section": "Node Config - Model",
    "aliases": [
      "model",
      "model.vision",
      "model.model.vision"
    ],
    "docPath": "/docs/ai-paths/semantic-grammar/nodes/model.json",
    "tags": [
      "ai-paths",
      "nodes",
      "palette",
      "config",
      "node",
      "config-field"
    ],
    "uiTargets": [
      "node-config.model.model.vision"
    ]
  },
  {
    "id": "node_config_field_model_model_waitforresult",
    "title": "Model: model.waitForResult",
    "summary": "When true, node waits and emits result. When false, emits jobId/status immediately.",
    "section": "Node Config - Model",
    "aliases": [
      "model",
      "model.waitForResult",
      "model.model.waitForResult"
    ],
    "docPath": "/docs/ai-paths/semantic-grammar/nodes/model.json",
    "tags": [
      "ai-paths",
      "nodes",
      "palette",
      "config",
      "node",
      "config-field"
    ],
    "uiTargets": [
      "node-config.model.model.waitForResult"
    ]
  },
  {
    "id": "node_config_field_model_runtime_cache_mode",
    "title": "Model: runtime.cache.mode",
    "summary": "Node output caching. auto = reuse when safe, force = always reuse, disabled = recompute each run.",
    "section": "Node Config - Model",
    "aliases": [
      "model",
      "runtime.cache.mode",
      "model.runtime.cache.mode"
    ],
    "docPath": "/docs/ai-paths/semantic-grammar/nodes/model.json",
    "tags": [
      "ai-paths",
      "nodes",
      "palette",
      "config",
      "node",
      "config-field"
    ],
    "uiTargets": [
      "node-config.model.runtime.cache.mode"
    ]
  },
  {
    "id": "node_config_field_model_runtime_cache_scope",
    "title": "Model: runtime.cache.scope",
    "summary": "Cache key scope. run = isolate each run, activation = isolate by trigger/entity context, session = reuse across session.",
    "section": "Node Config - Model",
    "aliases": [
      "model",
      "runtime.cache.scope",
      "model.runtime.cache.scope"
    ],
    "docPath": "/docs/ai-paths/semantic-grammar/nodes/model.json",
    "tags": [
      "ai-paths",
      "nodes",
      "palette",
      "config",
      "node",
      "config-field"
    ],
    "uiTargets": [
      "node-config.model.runtime.cache.scope"
    ]
  },
  {
    "id": "node_config_field_model_runtime_waitforinputs",
    "title": "Model: runtime.waitForInputs",
    "summary": "If true, wait until all connected input ports have values before executing the node.",
    "section": "Node Config - Model",
    "aliases": [
      "model",
      "runtime.waitForInputs",
      "model.runtime.waitForInputs"
    ],
    "docPath": "/docs/ai-paths/semantic-grammar/nodes/model.json",
    "tags": [
      "ai-paths",
      "nodes",
      "palette",
      "config",
      "node",
      "config-field"
    ],
    "uiTargets": [
      "node-config.model.runtime.waitForInputs"
    ]
  },
  {
    "id": "node_config_field_mutator_mutator_path",
    "title": "Mutator: mutator.path",
    "summary": "JSON path to write to (example: 'meta.flags.needsReview').",
    "section": "Node Config - Mutator",
    "aliases": [
      "mutator",
      "mutator.path",
      "mutator.mutator.path"
    ],
    "docPath": "/docs/ai-paths/semantic-grammar/nodes/mutator.json",
    "tags": [
      "ai-paths",
      "nodes",
      "palette",
      "config",
      "node",
      "config-field"
    ],
    "uiTargets": [
      "node-config.mutator.mutator.path"
    ]
  },
  {
    "id": "node_config_field_mutator_mutator_valuetemplate",
    "title": "Mutator: mutator.valueTemplate",
    "summary": "Template used to compute the value written at `path` (supports {{placeholders}}).",
    "section": "Node Config - Mutator",
    "aliases": [
      "mutator",
      "mutator.valueTemplate",
      "mutator.mutator.valueTemplate"
    ],
    "docPath": "/docs/ai-paths/semantic-grammar/nodes/mutator.json",
    "tags": [
      "ai-paths",
      "nodes",
      "palette",
      "config",
      "node",
      "config-field"
    ],
    "uiTargets": [
      "node-config.mutator.mutator.valueTemplate"
    ]
  },
  {
    "id": "node_config_field_mutator_runtime_cache_mode",
    "title": "Mutator: runtime.cache.mode",
    "summary": "Node output caching. auto = reuse when safe, force = always reuse, disabled = recompute each run.",
    "section": "Node Config - Mutator",
    "aliases": [
      "mutator",
      "runtime.cache.mode",
      "mutator.runtime.cache.mode"
    ],
    "docPath": "/docs/ai-paths/semantic-grammar/nodes/mutator.json",
    "tags": [
      "ai-paths",
      "nodes",
      "palette",
      "config",
      "node",
      "config-field"
    ],
    "uiTargets": [
      "node-config.mutator.runtime.cache.mode"
    ]
  },
  {
    "id": "node_config_field_mutator_runtime_cache_scope",
    "title": "Mutator: runtime.cache.scope",
    "summary": "Cache key scope. run = isolate each run, activation = isolate by trigger/entity context, session = reuse across session.",
    "section": "Node Config - Mutator",
    "aliases": [
      "mutator",
      "runtime.cache.scope",
      "mutator.runtime.cache.scope"
    ],
    "docPath": "/docs/ai-paths/semantic-grammar/nodes/mutator.json",
    "tags": [
      "ai-paths",
      "nodes",
      "palette",
      "config",
      "node",
      "config-field"
    ],
    "uiTargets": [
      "node-config.mutator.runtime.cache.scope"
    ]
  },
  {
    "id": "node_config_field_mutator_runtime_waitforinputs",
    "title": "Mutator: runtime.waitForInputs",
    "summary": "If true, wait until all connected input ports have values before executing the node.",
    "section": "Node Config - Mutator",
    "aliases": [
      "mutator",
      "runtime.waitForInputs",
      "mutator.runtime.waitForInputs"
    ],
    "docPath": "/docs/ai-paths/semantic-grammar/nodes/mutator.json",
    "tags": [
      "ai-paths",
      "nodes",
      "palette",
      "config",
      "node",
      "config-field"
    ],
    "uiTargets": [
      "node-config.mutator.runtime.waitForInputs"
    ]
  },
  {
    "id": "node_config_field_notification_runtime_cache_mode",
    "title": "Toast Notification: runtime.cache.mode",
    "summary": "Node output caching. auto = reuse when safe, force = always reuse, disabled = recompute each run.",
    "section": "Node Config - Toast Notification",
    "aliases": [
      "notification",
      "runtime.cache.mode",
      "notification.runtime.cache.mode"
    ],
    "docPath": "/docs/ai-paths/semantic-grammar/nodes/notification.json",
    "tags": [
      "ai-paths",
      "nodes",
      "palette",
      "config",
      "node",
      "config-field"
    ],
    "uiTargets": [
      "node-config.notification.runtime.cache.mode"
    ]
  },
  {
    "id": "node_config_field_notification_runtime_cache_scope",
    "title": "Toast Notification: runtime.cache.scope",
    "summary": "Cache key scope. run = isolate each run, activation = isolate by trigger/entity context, session = reuse across session.",
    "section": "Node Config - Toast Notification",
    "aliases": [
      "notification",
      "runtime.cache.scope",
      "notification.runtime.cache.scope"
    ],
    "docPath": "/docs/ai-paths/semantic-grammar/nodes/notification.json",
    "tags": [
      "ai-paths",
      "nodes",
      "palette",
      "config",
      "node",
      "config-field"
    ],
    "uiTargets": [
      "node-config.notification.runtime.cache.scope"
    ]
  },
  {
    "id": "node_config_field_notification_runtime_waitforinputs",
    "title": "Toast Notification: runtime.waitForInputs",
    "summary": "If true, wait until all connected input ports have values before executing the node.",
    "section": "Node Config - Toast Notification",
    "aliases": [
      "notification",
      "runtime.waitForInputs",
      "notification.runtime.waitForInputs"
    ],
    "docPath": "/docs/ai-paths/semantic-grammar/nodes/notification.json",
    "tags": [
      "ai-paths",
      "nodes",
      "palette",
      "config",
      "node",
      "config-field"
    ],
    "uiTargets": [
      "node-config.notification.runtime.waitForInputs"
    ]
  },
  {
    "id": "node_config_field_parser_parser_mappings",
    "title": "JSON Parser: parser.mappings",
    "summary": "Map output port name -> JSON path (relative to entityJson/context).",
    "section": "Node Config - JSON Parser",
    "aliases": [
      "parser",
      "parser.mappings",
      "parser.parser.mappings"
    ],
    "docPath": "/docs/ai-paths/semantic-grammar/nodes/parser.json",
    "tags": [
      "ai-paths",
      "nodes",
      "palette",
      "config",
      "node",
      "config-field"
    ],
    "uiTargets": [
      "node-config.parser.parser.mappings"
    ]
  },
  {
    "id": "node_config_field_parser_parser_outputmode",
    "title": "JSON Parser: parser.outputMode",
    "summary": "individual emits one port per mapping; bundle emits a single bundle output.",
    "section": "Node Config - JSON Parser",
    "aliases": [
      "parser",
      "parser.outputMode",
      "parser.parser.outputMode"
    ],
    "docPath": "/docs/ai-paths/semantic-grammar/nodes/parser.json",
    "tags": [
      "ai-paths",
      "nodes",
      "palette",
      "config",
      "node",
      "config-field"
    ],
    "uiTargets": [
      "node-config.parser.parser.outputMode"
    ]
  },
  {
    "id": "node_config_field_parser_parser_presetid",
    "title": "JSON Parser: parser.presetId",
    "summary": "Optional preset that seeds mappings and output options (keeps your parser consistent).",
    "section": "Node Config - JSON Parser",
    "aliases": [
      "parser",
      "parser.presetId",
      "parser.parser.presetId"
    ],
    "docPath": "/docs/ai-paths/semantic-grammar/nodes/parser.json",
    "tags": [
      "ai-paths",
      "nodes",
      "palette",
      "config",
      "node",
      "config-field"
    ],
    "uiTargets": [
      "node-config.parser.parser.presetId"
    ]
  }
];

