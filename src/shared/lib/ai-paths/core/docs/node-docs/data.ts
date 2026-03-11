import { COMMON_RUNTIME_FIELDS, dbQueryFields } from '../node-docs.constants';

import type { NodeConfigDocField } from '../node-docs.types';

export const databaseDocs: NodeConfigDocField[] = [
  {
    path: 'database.operation',
    description: 'Operation category: query/update/insert/delete.',
  },
  {
    path: 'database.entityType',
    description: 'Collection/entity type to operate on (product/note/custom).',
  },
  {
    path: 'database.idField',
    description: 'Primary key field when using preset queries (example: _id or id).',
    defaultValue: '_id',
  },
  {
    path: 'database.query',
    description: 'Query definition (provider/collection/preset/queryTemplate/sort/projection/etc).',
  },
  ...dbQueryFields('database.query'),
  {
    path: 'database.mappings',
    description:
      'Updater mappings for write operations: targetPath <- (sourcePort + optional sourcePath).',
  },
  {
    path: 'database.updateTemplate',
    description: 'Template JSON for updates (when using custom update templates).',
  },
  {
    path: 'database.mode',
    description:
      'Write mode: replace overwrites, append merges/extends (behavior depends on operation).',
  },
  {
    path: 'database.updateStrategy',
    description: 'When updating: one vs many (for multi-match updates).',
  },
  {
    path: 'database.useMongoActions',
    description:
      'When true, uses provider action mode (actionCategory/action) instead of simplified operation.',
  },
  {
    path: 'database.actionCategory',
    description: 'Provider action category: create/read/update/delete/(aggregate for MongoDB).',
  },
  {
    path: 'database.action',
    description: 'Provider action command (MongoDB action labels).',
  },
  {
    path: 'database.distinctField',
    description: 'Field for distinct action.',
  },
  {
    path: 'database.writeSource',
    description: 'Which incoming port to write from (example: result/bundle/context).',
  },
  {
    path: 'database.writeSourcePath',
    description: 'Optional JSON path within writeSource to write (example: \'result.items[0]\').',
  },
  {
    path: 'database.writeOutcomePolicy.onZeroAffected',
    description:
      'Write outcome policy when execution affects 0 records: `fail` throws terminal node error, `warn` completes with warning metadata.',
    defaultValue: 'fail',
  },
  {
    path: 'database.writeTemplateGuardrails',
    description:
      'Runtime-enforced for writes: all query/update/insert template placeholders must resolve to connected, non-empty values (missing/empty blocks execution).',
    defaultValue: 'enabled',
  },
  {
    path: 'database.dryRun',
    description: 'When true, does not persist changes; returns computed payload only.',
    defaultValue: 'false',
  },
  {
    path: 'database.skipEmpty',
    description: 'When true, empty strings/nulls are skipped when building updates.',
    defaultValue: 'false',
  },
  {
    path: 'database.trimStrings',
    description: 'When true, trim all string values before writing.',
    defaultValue: 'false',
  },
  {
    path: 'database.aiPrompt',
    description: 'Optional AI prompt template used by Database AI assistants.',
    defaultValue: '""',
  },
  {
    path: 'database.validationRuleIds',
    description: 'Optional list of validation rule IDs to apply before writing.',
    defaultValue: '[]',
  },
  {
    path: 'database.parameterInferenceGuard.enabled',
    description: 'When enabled, validate/sanitize updated payload against parameter definitions.',
    defaultValue: 'false',
  },
  {
    path: 'database.parameterInferenceGuard.targetPath',
    description: 'Update field to sanitize (default: parameters).',
    defaultValue: 'parameters',
  },
  {
    path: 'database.parameterInferenceGuard.definitionsPort',
    description: 'Input port carrying parameter definitions used for validation (default: result).',
    defaultValue: 'result',
  },
  {
    path: 'database.parameterInferenceGuard.definitionsPath',
    description: 'Optional JSON path inside definitionsPort payload to locate definition rows.',
    defaultValue: '""',
  },
  {
    path: 'database.parameterInferenceGuard.languageCode',
    description: 'Language code mirrored into valuesByLanguage for inferred parameter writes.',
    defaultValue: 'en',
  },
  {
    path: 'database.parameterInferenceGuard.enforceOptionLabels',
    description:
      'When true, radio/select/dropdown values must match optionLabels from definitions.',
    defaultValue: 'true',
  },
  {
    path: 'database.parameterInferenceGuard.allowUnknownParameterIds',
    description: 'When true, keeps inferred parameterIds missing from definitions.',
    defaultValue: 'false',
  },
  ...COMMON_RUNTIME_FIELDS,
];

export const dbSchemaDocs: NodeConfigDocField[] = [
  {
    path: 'db_schema.provider',
    description: 'Which provider to load: auto (primary) or mongodb.',
    defaultValue: 'auto',
  },
  {
    path: 'db_schema.mode',
    description: 'all = include all collections; selected = include only `collections`.',
    defaultValue: 'all',
  },
  {
    path: 'db_schema.collections',
    description: 'Collection names to include when mode is selected.',
    defaultValue: '[]',
  },
  {
    path: 'db_schema.includeFields',
    description: 'Include field lists for each collection.',
    defaultValue: 'true',
  },
  {
    path: 'db_schema.includeRelations',
    description: 'Include inferred relations/foreign key hints when available.',
    defaultValue: 'false',
  },
  {
    path: 'db_schema.formatAs',
    description: 'json emits a JSON object; text emits a compact schema text for prompting.',
    defaultValue: 'json',
  },
  ...COMMON_RUNTIME_FIELDS,
];

export const viewerDocs: NodeConfigDocField[] = [
  {
    path: 'viewer.outputs',
    description:
      'Map of input port -> label/path. Used to display structured output inside the node config panel.',
    defaultValue: '{}',
  },
  {
    path: 'viewer.showImagesAsJson',
    description: 'When true, image lists render as JSON instead of thumbnails.',
    defaultValue: 'false',
  },
  ...COMMON_RUNTIME_FIELDS,
];

export const notificationDocs: NodeConfigDocField[] = [...COMMON_RUNTIME_FIELDS];
