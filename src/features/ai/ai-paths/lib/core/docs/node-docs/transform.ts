import type { NodeConfigDocField } from '../node-docs.types';
import { COMMON_RUNTIME_FIELDS } from '../node-docs.constants';

export const contextDocs: NodeConfigDocField[] = [
  {
    path: 'context.role',
    description:
      'Context role for downstream nodes (used as a hint for prompts and filtering).',
  },
  {
    path: 'context.entityType',
    description:
      'Forced entity type (auto/product/note/etc). If auto, it uses incoming trigger context.',
    defaultValue: 'auto',
  },
  {
    path: 'context.entityIdSource',
    description:
      'Where to read entityId from when loading context. simulation/manual/context.',
    defaultValue: 'simulation',
  },
  {
    path: 'context.entityId',
    description:
      'Entity ID to fetch when entityIdSource is manual (or as a fallback when missing).',
    defaultValue: '""',
  },
  {
    path: 'context.scopeMode',
    description:
      'How to scope the payload: full (no filter), include (only includePaths), exclude (drop excludePaths).',
    defaultValue: 'full',
  },
  {
    path: 'context.scopeTarget',
    description:
      'What is being scoped: entity (only entity object) or context (full context payload).',
    defaultValue: 'entity',
  },
  {
    path: 'context.includePaths',
    description:
      'List of JSON paths to keep when scopeMode is include (example: [\'title\',\'images\']).',
    defaultValue: '[]',
  },
  {
    path: 'context.excludePaths',
    description:
      'List of JSON paths to remove when scopeMode is exclude (example: [\'internal.notes\']).',
    defaultValue: '[]',
  },
  ...COMMON_RUNTIME_FIELDS,
];

export const parserDocs: NodeConfigDocField[] = [
  {
    path: 'parser.outputMode',
    description:
      'individual emits one port per mapping; bundle emits a single bundle output.',
    defaultValue: 'individual',
  },
  {
    path: 'parser.mappings',
    description:
      'Map output port name -> JSON path (relative to entityJson/context).',
    defaultValue: '{}',
  },
  {
    path: 'parser.presetId',
    description:
      'Optional preset that seeds mappings and output options (keeps your parser consistent).',
  },
  ...COMMON_RUNTIME_FIELDS,
];

export const regexDocs: NodeConfigDocField[] = [
  {
    path: 'regex.pattern',
    description: 'JavaScript/ECMAScript regex pattern (without / delimiters).',
    defaultValue: '""',
  },
  {
    path: 'regex.flags',
    description: 'Regex flags string (example: g, i, m).',
    defaultValue: '"g"',
  },
  {
    path: 'regex.mode',
    description:
      'group = emit grouped matches; extract = emit selected capture on value output; extract_json = extract and parse JSON when possible.',
    defaultValue: 'group',
  },
  {
    path: 'regex.matchMode',
    description:
      'first = one match per input string; first_overall = stop after the first match across all inputs; all = all matches per input string.',
    defaultValue: 'first',
  },
  {
    path: 'regex.groupBy',
    description:
      'Selector used for grouping (group mode) or extraction (extract mode): match/0, capture index (1...), named group, groups, or captures.',
    defaultValue: 'match',
  },
  {
    path: 'regex.outputMode',
    description: 'Grouped output mode: object (Record) or array (list of groups).',
    defaultValue: 'object',
  },
  {
    path: 'regex.includeUnmatched',
    description: 'If true, inputs that do not match are emitted under unmatchedKey.',
    defaultValue: 'true',
  },
  {
    path: 'regex.unmatchedKey',
    description: 'Group key label for unmatched values.',
    defaultValue: '"__unmatched__"',
  },
  {
    path: 'regex.splitLines',
    description: 'If true, string inputs are split by newline into multiple items.',
    defaultValue: 'true',
  },
  {
    path: 'regex.sampleText',
    description: 'Optional sample text used for preview / AI prompt rendering.',
    defaultValue: '""',
  },
  {
    path: 'regex.aiPrompt',
    description: 'Optional AI prompt template used to propose a regex.',
    defaultValue: '""',
  },
  {
    path: 'regex.jsonIntegrityPolicy',
    description:
      'How extract_json handles malformed JSON-like strings. strict performs no repair. repair applies staged normalization (code-fence stripping, malformed boundary repair, truncation closure, trailing-comma cleanup) before parsing.',
    defaultValue: 'repair',
  },
  ...COMMON_RUNTIME_FIELDS,
];

export const iteratorDocs: NodeConfigDocField[] = [
  {
    path: 'iterator.autoContinue',
    description:
      'If true, the runtime will automatically attempt to advance to the next item after a callback is received.',
    defaultValue: 'true',
  },
  {
    path: 'iterator.maxSteps',
    description:
      'Safety cap for automatic continuation steps per run/tick (prevents infinite loops).',
    defaultValue: '50',
  },
  ...COMMON_RUNTIME_FIELDS,
];

export const mapperDocs: NodeConfigDocField[] = [
  {
    path: 'mapper.outputs',
    description:
      'Which output ports the mapper should expose (the ports must exist on the node).',
    defaultValue: '["value"]',
  },
  {
    path: 'mapper.mappings',
    description:
      'Map output port name -> JSON path (relative to context).',
    defaultValue: '{}',
  },
  {
    path: 'mapper.jsonIntegrityPolicy',
    description:
      'How mapper normalizes JSON-like string inputs before resolving mapping paths. strict performs no repair. repair uses the shared staged JSON normalization pipeline before path resolution.',
    defaultValue: 'repair',
  },
  ...COMMON_RUNTIME_FIELDS,
];

export const mutatorDocs: NodeConfigDocField[] = [
  {
    path: 'mutator.path',
    description:
      'JSON path to write to (example: \'meta.flags.needsReview\').',
  },
  {
    path: 'mutator.valueTemplate',
    description:
      'Template used to compute the value written at `path` (supports {{placeholders}}).',
  },
  ...COMMON_RUNTIME_FIELDS,
];

export const stringMutatorDocs: NodeConfigDocField[] = [
  {
    path: 'stringMutator.operations',
    description:
      'Ordered list of string operations to apply to the incoming value.',
    defaultValue: '[]',
  },
  {
    path: 'stringMutator.operations[].type',
    description:
      'Operation type: trim, replace, remove, case, append, slice.',
  },
  {
    path: 'stringMutator.operations[].search',
    description:
      'Text or regex pattern to replace/remove (replace/remove only).',
  },
  {
    path: 'stringMutator.operations[].replace',
    description:
      'Replacement text for replace operations.',
  },
  {
    path: 'stringMutator.operations[].matchMode',
    description:
      'Match mode for replace/remove (first or all).',
    defaultValue: 'all',
  },
  {
    path: 'stringMutator.operations[].useRegex',
    description:
      'If true, treat search as a regex pattern.',
    defaultValue: 'false',
  },
  {
    path: 'stringMutator.operations[].flags',
    description:
      'Regex flags when useRegex is enabled (e.g., gim).',
  },
  ...COMMON_RUNTIME_FIELDS,
];

export const validatorDocs: NodeConfigDocField[] = [
  {
    path: 'validator.requiredPaths',
    description:
      'List of JSON paths that must exist (and be non-empty) for valid=true.',
    defaultValue: '[]',
  },
  {
    path: 'validator.mode',
    description:
      'all = require all requiredPaths; any = require at least one.',
    defaultValue: 'all',
  },
  ...COMMON_RUNTIME_FIELDS,
];

export const validationPatternDocs: NodeConfigDocField[] = [
  {
    path: 'validationPattern.source',
    description:
      'Rule source: global_stack uses synced validator-stack rules, path_local uses node-local rules.',
    defaultValue: 'global_stack',
  },
  {
    path: 'validationPattern.stackId',
    description:
      'Selected global validation stack/list ID used when source=global_stack.',
  },
  {
    path: 'validationPattern.scope',
    description:
      'Prompt validation scope used while evaluating rules (for scope-gated rules).',
    defaultValue: 'global',
  },
  {
    path: 'validationPattern.runtimeMode',
    description:
      'validate_only runs checks; validate_and_autofix also applies rule autofix operations.',
    defaultValue: 'validate_only',
  },
  {
    path: 'validationPattern.failPolicy',
    description:
      'block_on_error sets valid=false when error issues exist; report_only always emits valid=true.',
    defaultValue: 'block_on_error',
  },
  {
    path: 'validationPattern.inputPort',
    description:
      'Preferred input source (auto/value/prompt/result/context).',
    defaultValue: 'auto',
  },
  {
    path: 'validationPattern.outputPort',
    description:
      'Primary output target for normalized text.',
    defaultValue: 'value',
  },
  {
    path: 'validationPattern.maxAutofixPasses',
    description:
      'Maximum autofix refinement passes when runtimeMode is validate_and_autofix.',
    defaultValue: '1',
  },
  {
    path: 'validationPattern.includeRuleIds',
    description:
      'Optional allowlist of rule IDs to execute.',
    defaultValue: '[]',
  },
  {
    path: 'validationPattern.rules',
    description:
      'Active rule set used during runtime (global snapshot or path-local list).',
    defaultValue: '[]',
  },
  {
    path: 'validationPattern.learnedRules',
    description:
      'Optional learned-rule list merged into runtime validation.',
    defaultValue: '[]',
  },
  ...COMMON_RUNTIME_FIELDS,
];
