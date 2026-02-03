import type { NodeType } from "@/shared/types/ai-paths";
import { palette as NODE_DEFINITIONS } from "../definitions";

export type NodeConfigDocField = {
  /** Dot-path under `node.config` */
  path: string;
  description: string;
  /** Optional typical default shown by UI */
  defaultValue?: string;
};

export type AiPathsNodeDoc = {
  type: NodeType;
  title: string;
  purpose: string;
  inputs: string[];
  outputs: string[];
  config: NodeConfigDocField[];
  notes?: string[];
};

const COMMON_RUNTIME_FIELDS: NodeConfigDocField[] = [
  {
    path: "runtime.cache.mode",
    description:
      "Node output caching. auto = reuse when safe, force = always reuse, disabled = recompute each run.",
    defaultValue: "auto",
  },
];

const dbQueryFields = (prefix: string): NodeConfigDocField[] => [
  { path: `${prefix}.provider`, description: "Database provider.", defaultValue: "mongodb" },
  { path: `${prefix}.collection`, description: "Collection to query (example: products).", defaultValue: '"products"' },
  { path: `${prefix}.mode`, description: "preset uses a predefined query; custom uses queryTemplate.", defaultValue: "preset" },
  { path: `${prefix}.preset`, description: "Preset query shape (by_id/by_productId/by_entityId/by_field).", defaultValue: "by_id" },
  { path: `${prefix}.field`, description: "Field used by preset queries (example: _id, productId).", defaultValue: '"_id"' },
  { path: `${prefix}.idType`, description: "How to treat IDs: string vs objectId.", defaultValue: "string" },
  { path: `${prefix}.queryTemplate`, description: "JSON query template (string) with {{placeholders}}.", defaultValue: '"{...}"' },
  { path: `${prefix}.limit`, description: "Limit for multi-result queries.", defaultValue: "20" },
  { path: `${prefix}.sort`, description: "Sort JSON (string).", defaultValue: '""' },
  { path: `${prefix}.projection`, description: "Projection JSON (string).", defaultValue: '""' },
  { path: `${prefix}.single`, description: "If true, treat result as a single document.", defaultValue: "false" },
];

const CONFIG_DOCS_BY_TYPE: Partial<Record<NodeType, NodeConfigDocField[]>> = {
  trigger: [
    {
      path: "trigger.event",
      description:
        "What event fires this Trigger node. Use manual for UI-driven runs; scheduled_run for server/cron runs.",
      defaultValue: "manual",
    },
    ...COMMON_RUNTIME_FIELDS,
  ],
  simulation: [
    {
      path: "simulation.entityType",
      description: "Entity type to load (product, note, ...).",
      defaultValue: "product",
    },
    {
      path: "simulation.entityId",
      description: "Entity ID to load (preferred).",
    },
    {
      path: "simulation.productId",
      description:
        "Legacy field for product ID. Kept for backward compatibility; prefer entityId + entityType.",
      defaultValue: '""',
    },
    ...COMMON_RUNTIME_FIELDS,
  ],
  context: [
    {
      path: "context.role",
      description:
        "Context role for downstream nodes (used as a hint for prompts and filtering).",
    },
    {
      path: "context.entityType",
      description:
        "Forced entity type (auto/product/note/etc). If auto, it uses incoming trigger context.",
      defaultValue: "auto",
    },
    {
      path: "context.entityIdSource",
      description:
        "Where to read entityId from when loading context. simulation/manual/context.",
      defaultValue: "simulation",
    },
    {
      path: "context.entityId",
      description:
        "Entity ID to fetch when entityIdSource is manual (or as a fallback when missing).",
      defaultValue: '""',
    },
    {
      path: "context.scopeMode",
      description:
        "How to scope the payload: full (no filter), include (only includePaths), exclude (drop excludePaths).",
      defaultValue: "full",
    },
    {
      path: "context.scopeTarget",
      description:
        "What is being scoped: entity (only entity object) or context (full context payload).",
      defaultValue: "entity",
    },
    {
      path: "context.includePaths",
      description:
        "List of JSON paths to keep when scopeMode is include (example: ['title','images']).",
      defaultValue: "[]",
    },
    {
      path: "context.excludePaths",
      description:
        "List of JSON paths to remove when scopeMode is exclude (example: ['internal.notes']).",
      defaultValue: "[]",
    },
    ...COMMON_RUNTIME_FIELDS,
  ],
  parser: [
    {
      path: "parser.outputMode",
      description:
        "individual emits one port per mapping; bundle emits a single bundle output.",
      defaultValue: "individual",
    },
    {
      path: "parser.mappings",
      description:
        "Map output port name -> JSON path (relative to entityJson/context).",
      defaultValue: "{}",
    },
    {
      path: "parser.presetId",
      description:
        "Optional preset that seeds mappings and output options (keeps your parser consistent).",
    },
    ...COMMON_RUNTIME_FIELDS,
  ],
  regex: [
    {
      path: "regex.pattern",
      description: "JavaScript/ECMAScript regex pattern (without / delimiters).",
      defaultValue: '""',
    },
    {
      path: "regex.flags",
      description: "Regex flags string (example: g, i, m).",
      defaultValue: '"g"',
    },
    {
      path: "regex.matchMode",
      description: "first = one match per input string; all = all matches per input string.",
      defaultValue: "first",
    },
    {
      path: "regex.groupBy",
      description:
        "Which capture becomes the grouping key: match/0 for full match, 1 for first capture, or a named group (/(?<name>...)/).",
      defaultValue: "match",
    },
    {
      path: "regex.outputMode",
      description: "grouped output mode: object (Record) or array (list of groups).",
      defaultValue: "object",
    },
    {
      path: "regex.includeUnmatched",
      description: "If true, inputs that do not match are emitted under unmatchedKey.",
      defaultValue: "true",
    },
    {
      path: "regex.unmatchedKey",
      description: "Group key label for unmatched values.",
      defaultValue: '"__unmatched__"',
    },
    {
      path: "regex.splitLines",
      description: "If true, string inputs are split by newline into multiple items.",
      defaultValue: "true",
    },
    {
      path: "regex.sampleText",
      description: "Optional sample text used for preview / AI prompt rendering.",
      defaultValue: '""',
    },
    {
      path: "regex.aiPrompt",
      description: "Optional AI prompt template used to propose a regex.",
      defaultValue: '""',
    },
    ...COMMON_RUNTIME_FIELDS,
  ],
  iterator: [
    {
      path: "iterator.autoContinue",
      description:
        "If true, the runtime will automatically attempt to advance to the next item after a callback is received.",
      defaultValue: "true",
    },
    {
      path: "iterator.maxSteps",
      description:
        "Safety cap for automatic continuation steps per run/tick (prevents infinite loops).",
      defaultValue: "50",
    },
    ...COMMON_RUNTIME_FIELDS,
  ],
  mapper: [
    {
      path: "mapper.outputs",
      description:
        "Which output ports the mapper should expose (the ports must exist on the node).",
      defaultValue: '["value"]',
    },
    {
      path: "mapper.mappings",
      description:
        "Map output port name -> JSON path (relative to context).",
      defaultValue: "{}",
    },
    ...COMMON_RUNTIME_FIELDS,
  ],
  mutator: [
    {
      path: "mutator.path",
      description:
        "JSON path to write to (example: 'meta.flags.needsReview').",
    },
    {
      path: "mutator.valueTemplate",
      description:
        "Template used to compute the value written at `path` (supports {{placeholders}}).",
    },
    ...COMMON_RUNTIME_FIELDS,
  ],
  validator: [
    {
      path: "validator.requiredPaths",
      description:
        "List of JSON paths that must exist (and be non-empty) for valid=true.",
      defaultValue: "[]",
    },
    {
      path: "validator.mode",
      description:
        "all = require all requiredPaths; any = require at least one.",
      defaultValue: "all",
    },
    ...COMMON_RUNTIME_FIELDS,
  ],
  constant: [
    {
      path: "constant.valueType",
      description:
        "How to interpret the stored value: string/number/boolean/json.",
      defaultValue: "string",
    },
    {
      path: "constant.value",
      description:
        "The literal value to emit (for json, this should be JSON text).",
      defaultValue: '""',
    },
    ...COMMON_RUNTIME_FIELDS,
  ],
  math: [
    {
      path: "math.operation",
      description:
        "Numeric operation to apply: add/subtract/multiply/divide/round/ceil/floor.",
      defaultValue: "add",
    },
    {
      path: "math.operand",
      description:
        "Number used by the operation (ignored for round/ceil/floor).",
      defaultValue: "0",
    },
    ...COMMON_RUNTIME_FIELDS,
  ],
  template: [
    {
      path: "template.template",
      description:
        "Template used to generate a prompt string from incoming ports ({{bundle}}, {{context}}, etc).",
      defaultValue: '""',
    },
    ...COMMON_RUNTIME_FIELDS,
  ],
  bundle: [
    {
      path: "bundle.includePorts",
      description:
        "Optional allowlist: only these input port names are included in the emitted bundle.",
      defaultValue: "undefined (all inputs)",
    },
    ...COMMON_RUNTIME_FIELDS,
  ],
  gate: [
    {
      path: "gate.mode",
      description:
        "block = stop downstream when valid is false; pass = always pass but preserve valid/errors.",
      defaultValue: "block",
    },
    {
      path: "gate.failMessage",
      description:
        "Optional message to display/log when blocking.",
    },
    ...COMMON_RUNTIME_FIELDS,
  ],
  compare: [
    {
      path: "compare.operator",
      description:
        "Comparison operator (eq/neq/gt/gte/lt/lte/contains/startsWith/endsWith/isEmpty/notEmpty).",
      defaultValue: "eq",
    },
    {
      path: "compare.compareTo",
      description:
        "String to compare against (converted based on operator and input value).",
      defaultValue: '""',
    },
    {
      path: "compare.caseSensitive",
      description:
        "When comparing strings, whether case matters.",
      defaultValue: "false",
    },
    {
      path: "compare.message",
      description:
        "Optional error message to emit when valid is false.",
    },
    ...COMMON_RUNTIME_FIELDS,
  ],
  router: [
    {
      path: "router.mode",
      description:
        "valid routes on valid/errors; value routes on a value input.",
      defaultValue: "value",
    },
    {
      path: "router.matchMode",
      description:
        "truthy/falsy/equals/contains",
      defaultValue: "truthy",
    },
    {
      path: "router.compareTo",
      description:
        "Used by equals/contains modes.",
      defaultValue: '""',
    },
    ...COMMON_RUNTIME_FIELDS,
  ],
  delay: [
    {
      path: "delay.ms",
      description: "Delay duration in milliseconds.",
      defaultValue: "500",
    },
    ...COMMON_RUNTIME_FIELDS,
  ],
  poll: [
    {
      path: "poll.mode",
      description: "job = poll AI job status; database = poll database query.",
      defaultValue: "job",
    },
    {
      path: "poll.intervalMs",
      description: "Wait time between polling attempts (ms).",
      defaultValue: "1000",
    },
    {
      path: "poll.maxAttempts",
      description: "Maximum polling attempts before failing.",
      defaultValue: "40",
    },
    {
      path: "poll.dbQuery",
      description:
        "Database query definition used when mode is database (provider/collection/preset/queryTemplate/etc).",
    },
    ...dbQueryFields("poll.dbQuery"),
    {
      path: "poll.successPath",
      description:
        "Optional JSON path evaluated against the polled result to determine completion.",
    },
    {
      path: "poll.successOperator",
      description:
        "truthy/equals/contains/notEquals used with successPath.",
      defaultValue: "truthy",
    },
    {
      path: "poll.successValue",
      description:
        "String value used by equals/contains/notEquals.",
    },
    {
      path: "poll.resultPath",
      description:
        "Optional JSON path to extract the final result payload to emit.",
    },
    ...COMMON_RUNTIME_FIELDS,
  ],
  http: [
    { path: "http.url", description: "Request URL.", defaultValue: '""' },
    {
      path: "http.method",
      description: "HTTP method.",
      defaultValue: "GET",
    },
    {
      path: "http.headers",
      description:
        "JSON string of request headers. Must be valid JSON.",
      defaultValue: "{...}",
    },
    {
      path: "http.bodyTemplate",
      description:
        "Template for request body (JSON/text) using {{placeholders}} from incoming ports.",
      defaultValue: '""',
    },
    {
      path: "http.responseMode",
      description: "How to interpret the response: json/text/status.",
      defaultValue: "json",
    },
    {
      path: "http.responsePath",
      description:
        "Optional JSON path to extract from the response when responseMode is json.",
      defaultValue: '""',
    },
    ...COMMON_RUNTIME_FIELDS,
  ],
  prompt: [
    {
      path: "prompt.template",
      description:
        "Template to produce final prompt text. Uses {{title}}, {{content_en}}, {{bundle}}, etc.",
      defaultValue: '""',
    },
    ...COMMON_RUNTIME_FIELDS,
  ],
  model: [
    {
      path: "model.modelId",
      description: "Model identifier to run.",
      defaultValue: "gpt-4o",
    },
    {
      path: "model.temperature",
      description: "Sampling temperature (0-2).",
      defaultValue: "0.2",
    },
    {
      path: "model.maxTokens",
      description: "Maximum output tokens.",
      defaultValue: "2048",
    },
    {
      path: "model.vision",
      description:
        "When true, image URLs are included as vision inputs if connected.",
      defaultValue: "false",
    },
    {
      path: "model.waitForResult",
      description:
        "When true, node waits and emits result. When false, emits jobId/status immediately.",
      defaultValue: "true",
    },
    ...COMMON_RUNTIME_FIELDS,
  ],
  agent: [
    {
      path: "agent.personaId",
      description:
        "Persona to use from Agent Creator. Empty means runtime defaults.",
      defaultValue: '""',
    },
    {
      path: "agent.promptTemplate",
      description:
        "Optional template to build the agent prompt from incoming ports.",
      defaultValue: '""',
    },
    {
      path: "agent.waitForResult",
      description:
        "When true, waits for completion and emits result. When false, emits jobId/status.",
      defaultValue: "true",
    },
    ...COMMON_RUNTIME_FIELDS,
  ],
  database: [
    {
      path: "database.operation",
      description:
        "Operation category: query/update/insert/delete.",
    },
    {
      path: "database.entityType",
      description:
        "Collection/entity type to operate on (product/note/custom).",
    },
    {
      path: "database.idField",
      description:
        "Primary key field when using preset queries (example: _id or id).",
      defaultValue: "_id",
    },
    {
      path: "database.query",
      description:
        "Query definition (provider/collection/preset/queryTemplate/sort/projection/etc).",
    },
    ...dbQueryFields("database.query"),
    {
      path: "database.mappings",
      description:
        "Updater mappings for write operations: targetPath <- (sourcePort + optional sourcePath).",
    },
    {
      path: "database.updateTemplate",
      description:
        "Template JSON for updates (when using custom update templates).",
    },
    {
      path: "database.mode",
      description:
        "Write mode: replace overwrites, append merges/extends (behavior depends on operation).",
    },
    {
      path: "database.updateStrategy",
      description:
        "When updating: one vs many (for multi-match updates).",
    },
    {
      path: "database.useMongoActions",
      description:
        "When true, uses MongoDB native actions (actionCategory/action) instead of simplified operation.",
    },
    {
      path: "database.actionCategory",
      description:
        "Mongo action category: create/read/update/delete/aggregate.",
    },
    {
      path: "database.action",
      description:
        "Mongo action name: find/findOne/updateOne/aggregate/etc.",
    },
    {
      path: "database.distinctField",
      description:
        "Field for distinct action.",
    },
    {
      path: "database.writeSource",
      description:
        "Which incoming port to write from (example: result/bundle/context).",
    },
    {
      path: "database.writeSourcePath",
      description:
        "Optional JSON path within writeSource to write (example: 'result.items[0]').",
    },
    {
      path: "database.dryRun",
      description:
        "When true, does not persist changes; returns computed payload only.",
      defaultValue: "false",
    },
    {
      path: "database.skipEmpty",
      description:
        "When true, empty strings/nulls are skipped when building updates.",
      defaultValue: "false",
    },
    {
      path: "database.trimStrings",
      description:
        "When true, trims string values before writing.",
      defaultValue: "false",
    },
    {
      path: "database.aiPrompt",
      description:
        "Optional AI prompt string used by some presets/helpers (does not call a model by itself).",
    },
    ...COMMON_RUNTIME_FIELDS,
  ],
  db_schema: [
    {
      path: "db_schema.mode",
      description: "all = include all collections; selected = include only `collections`.",
      defaultValue: "all",
    },
    {
      path: "db_schema.collections",
      description: "Collection names to include when mode is selected.",
      defaultValue: "[]",
    },
    {
      path: "db_schema.includeFields",
      description: "Include field lists for each collection.",
      defaultValue: "true",
    },
    {
      path: "db_schema.includeRelations",
      description: "Include inferred relations/foreign key hints when available.",
      defaultValue: "false",
    },
    {
      path: "db_schema.formatAs",
      description: "json emits a JSON object; text emits a compact schema text for prompting.",
      defaultValue: "json",
    },
    ...COMMON_RUNTIME_FIELDS,
  ],
  viewer: [
    {
      path: "viewer.outputs",
      description:
        "Map of input port -> label/path. Used to display structured output inside the node config panel.",
      defaultValue: "{}",
    },
    {
      path: "viewer.showImagesAsJson",
      description:
        "When true, image lists render as JSON instead of thumbnails.",
      defaultValue: "false",
    },
    ...COMMON_RUNTIME_FIELDS,
  ],
  notification: [
    ...COMMON_RUNTIME_FIELDS,
  ],
  ai_description: [
    {
      path: "description.visionOutputEnabled",
      description:
        "When enabled, include image-based analysis output.",
      defaultValue: "true",
    },
    {
      path: "description.generationOutputEnabled",
      description:
        "When enabled, include generated text output.",
      defaultValue: "true",
    },
    ...COMMON_RUNTIME_FIELDS,
  ],
  description_updater: [
    ...COMMON_RUNTIME_FIELDS,
  ],
};

const ALL_NODE_TYPES: NodeType[] = [
  "trigger",
  "simulation",
  "context",
  "parser",
  "regex",
  "iterator",
  "mapper",
  "mutator",
  "validator",
  "constant",
  "math",
  "template",
  "bundle",
  "gate",
  "compare",
  "router",
  "delay",
  "poll",
  "http",
  "prompt",
  "model",
  "agent",
  "database",
  "db_schema",
  "viewer",
  "notification",
  "ai_description",
  "description_updater",
];

const definitionByType = new Map(NODE_DEFINITIONS.map((def: (typeof NODE_DEFINITIONS)[number]) => [def.type, def]));

export const AI_PATHS_NODE_DOCS: AiPathsNodeDoc[] = ALL_NODE_TYPES.map((type: NodeType) => {
  const fallbackDefinition =
    type === "description_updater"
      ? {
          type: "description_updater" as const,
          title: "Description Updater (Legacy)",
          description: "Writes description_en back to the product (legacy helper node).",
          inputs: ["productId", "description_en"],
          outputs: ["description_en"],
        }
      : null;
  const def = definitionByType.get(type) ?? fallbackDefinition;
  const notes =
    type === "description_updater"
      ? [
          "Legacy node. This node type may be hidden from the palette; prefer Database node write operations for updates.",
        ]
      : type === "notification"
        ? ["Configuration UI is not available yet; it runs with defaults."]
        : undefined;
  return {
    type,
    title: def?.title ?? type,
    purpose: def?.description ?? "—",
    inputs: def?.inputs ?? [],
    outputs: def?.outputs ?? [],
    config: CONFIG_DOCS_BY_TYPE[type] ?? COMMON_RUNTIME_FIELDS,
    ...(notes ? { notes } : {}),
  };
});
