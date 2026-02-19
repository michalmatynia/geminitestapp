# Node Validator Advanced Patterns

```ai-paths-assertion
{
  "id": "advanced.learner_agent.agent_id_present",
  "title": "Learner Agent has agentId",
  "module": "model",
  "severity": "error",
  "appliesToNodeTypes": ["learner_agent"],
  "description": "Learner Agent node requires an agent identifier.",
  "recommendation": "Set learnerAgent.agentId to a valid agent.",
  "version": "2.0.0",
  "tags": ["advanced", "learner-agent", "rag"],
  "sequenceHint": 120,
  "weight": 30,
  "conditions": [
    { "operator": "non_empty", "field": "config.learnerAgent.agentId" }
  ]
}
```

```ai-paths-assertion
{
  "id": "advanced.iterator.max_steps_configured",
  "title": "Iterator maxSteps configured",
  "module": "custom",
  "severity": "warning",
  "appliesToNodeTypes": ["iterator"],
  "description": "Iterator should set maxSteps for loop safety.",
  "recommendation": "Set iterator.maxSteps to prevent runaway loops.",
  "version": "2.0.0",
  "tags": ["advanced", "iterator", "runtime-safety"],
  "sequenceHint": 122,
  "weight": 12,
  "conditions": [
    { "operator": "non_empty", "field": "config.iterator.maxSteps" }
  ]
}
```

```ai-paths-assertion
{
  "id": "advanced.mapper.mappings_present",
  "title": "Mapper has mappings",
  "module": "parser",
  "severity": "warning",
  "appliesToNodeTypes": ["mapper"],
  "description": "Mapper outputs should be explicitly mapped.",
  "recommendation": "Set mapper.mappings for all intended output ports.",
  "version": "2.0.0",
  "tags": ["advanced", "mapper"],
  "sequenceHint": 124,
  "weight": 10,
  "conditions": [
    { "operator": "non_empty", "field": "config.mapper.mappings" }
  ]
}
```

```ai-paths-assertion
{
  "id": "advanced.mutator.path_present",
  "title": "Mutator path configured",
  "module": "custom",
  "severity": "warning",
  "appliesToNodeTypes": ["mutator"],
  "description": "Mutator requires a target JSON path.",
  "recommendation": "Set mutator.path to a valid JSON path.",
  "version": "2.0.0",
  "tags": ["advanced", "mutator"],
  "sequenceHint": 126,
  "weight": 10,
  "conditions": [
    { "operator": "non_empty", "field": "config.mutator.path" }
  ]
}
```

```ai-paths-assertion
{
  "id": "advanced.string_mutator.operations_present",
  "title": "String Mutator operations configured",
  "module": "custom",
  "severity": "warning",
  "appliesToNodeTypes": ["string_mutator"],
  "description": "String Mutator should include at least one operation.",
  "recommendation": "Add stringMutator.operations entries.",
  "version": "2.0.0",
  "tags": ["advanced", "string-mutator"],
  "sequenceHint": 128,
  "weight": 10,
  "conditions": [
    { "operator": "non_empty", "field": "config.stringMutator.operations" }
  ]
}
```

```ai-paths-assertion
{
  "id": "advanced.constant.value_present",
  "title": "Constant value configured",
  "module": "custom",
  "severity": "warning",
  "appliesToNodeTypes": ["constant"],
  "description": "Constant node should define a value.",
  "recommendation": "Set constant.value and valueType.",
  "version": "2.0.0",
  "tags": ["advanced", "constant"],
  "sequenceHint": 130,
  "weight": 8,
  "conditions": [
    { "operator": "non_empty", "field": "config.constant.value" }
  ]
}
```

```ai-paths-assertion
{
  "id": "advanced.math.operation_present",
  "title": "Math operation configured",
  "module": "custom",
  "severity": "warning",
  "appliesToNodeTypes": ["math"],
  "description": "Math nodes require an operation selection.",
  "recommendation": "Set math.operation and math.operand.",
  "version": "2.0.0",
  "tags": ["advanced", "math"],
  "sequenceHint": 132,
  "weight": 8,
  "conditions": [
    { "operator": "non_empty", "field": "config.math.operation" }
  ]
}
```

```ai-paths-assertion
{
  "id": "advanced.template.template_present",
  "title": "Template node has template text",
  "module": "model",
  "severity": "warning",
  "appliesToNodeTypes": ["template"],
  "description": "Template node needs template text to produce prompt output.",
  "recommendation": "Set template.template with placeholders.",
  "version": "2.0.0",
  "tags": ["advanced", "template"],
  "sequenceHint": 134,
  "weight": 10,
  "conditions": [
    { "operator": "non_empty", "field": "config.template.template" }
  ]
}
```

```ai-paths-assertion
{
  "id": "advanced.bundle.include_ports_or_wiring",
  "title": "Bundle has includePorts or downstream wiring",
  "module": "custom",
  "severity": "info",
  "appliesToNodeTypes": ["bundle"],
  "description": "Bundle nodes should either define includePorts or feed a downstream consumer.",
  "recommendation": "Set bundle.includePorts and/or connect bundle output to downstream node.",
  "version": "2.0.0",
  "tags": ["advanced", "bundle", "wiring"],
  "sequenceHint": 136,
  "weight": 4,
  "conditionMode": "any",
  "conditions": [
    { "operator": "non_empty", "field": "config.bundle.includePorts" },
    { "operator": "has_outgoing_port", "port": "bundle" }
  ]
}
```

```ai-paths-assertion
{
  "id": "advanced.compare.operator_present",
  "title": "Compare operator configured",
  "module": "gate",
  "severity": "warning",
  "appliesToNodeTypes": ["compare"],
  "description": "Compare node requires an operator.",
  "recommendation": "Set compare.operator and compare.compareTo.",
  "version": "2.0.0",
  "tags": ["advanced", "compare"],
  "sequenceHint": 138,
  "weight": 8,
  "conditions": [
    { "operator": "non_empty", "field": "config.compare.operator" }
  ]
}
```

```ai-paths-assertion
{
  "id": "advanced.delay.ms_present",
  "title": "Delay duration configured",
  "module": "custom",
  "severity": "warning",
  "appliesToNodeTypes": ["delay"],
  "description": "Delay node should set wait duration in ms.",
  "recommendation": "Set delay.ms to a finite value.",
  "version": "2.0.0",
  "tags": ["advanced", "delay"],
  "sequenceHint": 140,
  "weight": 8,
  "conditions": [
    { "operator": "non_empty", "field": "config.delay.ms" }
  ]
}
```

```ai-paths-assertion
{
  "id": "advanced.audio_oscillator.frequency_present",
  "title": "Audio Oscillator frequency configured",
  "module": "custom",
  "severity": "warning",
  "appliesToNodeTypes": ["audio_oscillator"],
  "description": "Audio oscillator should define frequency.",
  "recommendation": "Set audioOscillator.frequencyHz and durationMs.",
  "version": "2.0.0",
  "tags": ["advanced", "audio"],
  "sequenceHint": 142,
  "weight": 8,
  "conditions": [
    { "operator": "non_empty", "field": "config.audioOscillator.frequencyHz" }
  ]
}
```

```ai-paths-assertion
{
  "id": "advanced.audio_speaker.enabled_present",
  "title": "Audio Speaker enabled flag present",
  "module": "custom",
  "severity": "info",
  "appliesToNodeTypes": ["audio_speaker"],
  "description": "Audio speaker should explicitly set enabled state.",
  "recommendation": "Set audioSpeaker.enabled and autoPlay flags.",
  "version": "2.0.0",
  "tags": ["advanced", "audio"],
  "sequenceHint": 144,
  "weight": 4,
  "conditions": [
    { "operator": "non_empty", "field": "config.audioSpeaker.enabled" }
  ]
}
```

```ai-paths-assertion
{
  "id": "advanced.notification.has_incoming_data",
  "title": "Notification receives input data",
  "module": "custom",
  "severity": "info",
  "appliesToNodeTypes": ["notification"],
  "description": "Notification nodes are useful only when data flows into them.",
  "recommendation": "Connect context/result/payload input into notification node.",
  "version": "2.0.0",
  "tags": ["advanced", "notification", "wiring"],
  "sequenceHint": 146,
  "weight": 4,
  "conditions": [
    { "operator": "has_incoming_port" }
  ]
}
```
