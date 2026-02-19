# Node Validator Database Patterns

```ai-paths-assertion
{
  "id": "database.query.collection_declared",
  "title": "Database collection declared",
  "module": "database",
  "severity": "error",
  "appliesToNodeTypes": ["database"],
  "description": "Database nodes must target a valid collection.",
  "recommendation": "Set database.query.collection to a known collection.",
  "version": "2.0.0",
  "tags": ["database", "critical"],
  "sequenceHint": 80,
  "weight": 35,
  "conditions": [
    { "operator": "collection_exists", "field": "config.database.query.collection" }
  ]
}
```

```ai-paths-assertion
{
  "id": "database.operation_configured",
  "title": "Database operation configured",
  "module": "database",
  "severity": "error",
  "appliesToNodeTypes": ["database"],
  "description": "Database.operation is required.",
  "recommendation": "Set operation to query/update/insert/delete.",
  "version": "2.0.0",
  "tags": ["database"],
  "sequenceHint": 82,
  "weight": 25,
  "conditions": [
    { "operator": "non_empty", "field": "config.database.operation" }
  ]
}
```

```ai-paths-assertion
{
  "id": "database.query_template_present_in_custom",
  "title": "Custom query has queryTemplate",
  "module": "database",
  "severity": "warning",
  "appliesToNodeTypes": ["database"],
  "description": "When query.mode is custom, queryTemplate should be set.",
  "recommendation": "Define query.queryTemplate JSON for custom mode.",
  "version": "2.0.0",
  "tags": ["database", "query"],
  "sequenceHint": 84,
  "weight": 12,
  "conditionMode": "any",
  "conditions": [
    { "operator": "in", "field": "config.database.query.mode", "list": ["custom"], "negate": true },
    { "operator": "non_empty", "field": "config.database.query.queryTemplate" }
  ]
}
```

```ai-paths-assertion
{
  "id": "database.update_identity_input",
  "title": "Update/delete have identity input",
  "module": "database",
  "severity": "error",
  "appliesToNodeTypes": ["database"],
  "description": "Write operations should receive deterministic identity input.",
  "recommendation": "Wire entityId or productId input for updates/deletes.",
  "version": "2.0.0",
  "tags": ["database", "safety"],
  "sequenceHint": 86,
  "weight": 40,
  "conditionMode": "any",
  "conditions": [
    { "operator": "in", "field": "config.database.operation", "list": ["update", "delete"], "negate": true },
    { "operator": "has_incoming_port", "port": "entityId" },
    { "operator": "has_incoming_port", "port": "productId" }
  ]
}
```

```ai-paths-assertion
{
  "id": "database.update_payload_present",
  "title": "Custom update has template",
  "module": "database",
  "severity": "warning",
  "appliesToNodeTypes": ["database"],
  "description": "Custom update mode should define updateTemplate.",
  "recommendation": "Set database.updateTemplate for custom payload updates.",
  "version": "2.0.0",
  "tags": ["database", "update"],
  "sequenceHint": 88,
  "weight": 12,
  "conditionMode": "any",
  "conditions": [
    { "operator": "in", "field": "config.database.updatePayloadMode", "list": ["custom"], "negate": true },
    { "operator": "non_empty", "field": "config.database.updateTemplate" }
  ]
}
```

```ai-paths-assertion
{
  "id": "database.insert_write_source",
  "title": "Insert operations define write source",
  "module": "database",
  "severity": "warning",
  "appliesToNodeTypes": ["database"],
  "description": "Insert operations should define writeSource or input mapping.",
  "recommendation": "Set writeSource/writeSourcePath or provide mapped payload.",
  "version": "2.0.0",
  "tags": ["database", "insert"],
  "sequenceHint": 90,
  "weight": 10,
  "conditionMode": "any",
  "conditions": [
    { "operator": "in", "field": "config.database.operation", "list": ["insert"], "negate": true },
    { "operator": "non_empty", "field": "config.database.writeSource" },
    { "operator": "non_empty", "field": "config.database.writeSourcePath" }
  ]
}
```

```ai-paths-assertion
{
  "id": "database.query_provider_configured",
  "title": "Database provider configured",
  "module": "database",
  "severity": "info",
  "appliesToNodeTypes": ["database"],
  "description": "Explicit provider selection improves predictability.",
  "recommendation": "Set query.provider to mongodb/prisma/auto as intended.",
  "version": "2.0.0",
  "tags": ["database", "provider"],
  "sequenceHint": 92,
  "weight": 4,
  "conditions": [
    { "operator": "non_empty", "field": "config.database.query.provider" }
  ]
}
```

```ai-paths-assertion
{
  "id": "database.query_limit_present_for_multi",
  "title": "Multi-result queries set limit",
  "module": "database",
  "severity": "info",
  "appliesToNodeTypes": ["database"],
  "description": "Non-single query reads should set limit to bound runtime.",
  "recommendation": "Set query.limit for multi-result reads.",
  "version": "2.0.0",
  "tags": ["database", "query"],
  "sequenceHint": 94,
  "weight": 4,
  "conditionMode": "any",
  "conditions": [
    { "operator": "in", "field": "config.database.query.single", "list": ["true"], "negate": true },
    { "operator": "non_empty", "field": "config.database.query.limit" }
  ]
}
```

```ai-paths-assertion
{
  "id": "database.parameter_inference_guard_consistent",
  "title": "Parameter inference guard has target path",
  "module": "database",
  "severity": "warning",
  "appliesToNodeTypes": ["database"],
  "description": "When parameterInferenceGuard.enabled is true, targetPath should be configured.",
  "recommendation": "Set parameterInferenceGuard.targetPath for deterministic updates.",
  "version": "2.0.0",
  "tags": ["database", "parameter-inference"],
  "sequenceHint": 96,
  "weight": 8,
  "conditionMode": "any",
  "conditions": [
    { "operator": "in", "field": "config.database.parameterInferenceGuard.enabled", "list": ["true"], "negate": true },
    { "operator": "non_empty", "field": "config.database.parameterInferenceGuard.targetPath" }
  ]
}
```
