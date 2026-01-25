export type NodeType =
  | "trigger"
  | "simulation"
  | "context"
  | "parser"
  | "mapper"
  | "mutator"
  | "validator"
  | "constant"
  | "math"
  | "template"
  | "bundle"
  | "gate"
  | "compare"
  | "router"
  | "delay"
  | "poll"
  | "http"
  | "prompt"
  | "model"
  | "database"
  | "viewer"
  | "notification"
  | "ai_description"
  | "description_updater";

export type ParserConfig = {
  mappings: Record<string, string>;
  outputMode?: "individual" | "bundle";
  presetId?: string;
};

export type ParserSampleState = {
  entityType: string;
  entityId: string;
  simulationId?: string;
  json: string;
  mappingMode: "top" | "flatten";
  depth: number;
  keyStyle: "path" | "leaf";
  includeContainers: boolean;
};

export type PromptConfig = {
  template: string;
};

export type ModelConfig = {
  modelId: string;
  temperature: number;
  maxTokens: number;
  vision: boolean;
  waitForResult?: boolean;
};

export type UpdaterMapping = {
  targetPath: string;
  sourcePort: string;
  sourcePath?: string;
};

export type DatabaseOperation = "query" | "update" | "insert" | "delete";

export type DatabaseConfig = {
  operation: DatabaseOperation;
  entityType?: string;
  idField?: string;
  mode?: "replace" | "append";
  mappings?: UpdaterMapping[];
  query?: DbQueryConfig;
  writeSource?: string;
  writeSourcePath?: string;
  dryRun?: boolean;
  presetId?: string;
  skipEmpty?: boolean;
  trimStrings?: boolean;
};

export type UpdaterSampleState = {
  entityType: string;
  entityId: string;
  json: string;
  depth: number;
  includeContainers: boolean;
};

export type TriggerConfig = {
  event: string;
};

export type SimulationConfig = {
  productId: string;
  entityType?: string;
  entityId?: string;
};

export type ViewerConfig = {
  outputs: Record<string, string>;
  showImagesAsJson?: boolean;
};

export type ContextConfig = {
  role: string;
  entityType?: string;
  entityIdSource?: "simulation" | "manual" | "context";
  entityId?: string;
  scopeMode?: "full" | "include" | "exclude";
  scopeTarget?: "entity" | "context";
  includePaths?: string[];
  excludePaths?: string[];
};

export type DescriptionConfig = {
  visionOutputEnabled?: boolean;
  generationOutputEnabled?: boolean;
};

export type MapperConfig = {
  outputs: string[];
  mappings: Record<string, string>;
};

export type MutatorConfig = {
  path: string;
  valueTemplate: string;
};

export type ValidatorConfig = {
  requiredPaths: string[];
  mode: "all" | "any";
};

export type ConstantConfig = {
  valueType: "string" | "number" | "boolean" | "json";
  value: string;
};

export type MathConfig = {
  operation: "add" | "subtract" | "multiply" | "divide" | "round" | "ceil" | "floor";
  operand: number;
};

export type TemplateConfig = {
  template: string;
};

export type BundleConfig = {
  includePorts?: string[];
};

export type GateConfig = {
  mode: "block" | "pass";
  failMessage?: string;
};

export type CompareConfig = {
  operator:
    | "eq"
    | "neq"
    | "gt"
    | "gte"
    | "lt"
    | "lte"
    | "contains"
    | "startsWith"
    | "endsWith"
    | "isEmpty"
    | "notEmpty";
  compareTo: string;
  caseSensitive?: boolean;
  message?: string;
};

export type RouterConfig = {
  mode: "valid" | "value";
  matchMode: "truthy" | "falsy" | "equals" | "contains";
  compareTo: string;
};

export type DelayConfig = {
  ms: number;
};

export type HttpConfig = {
  url: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers: string;
  bodyTemplate: string;
  responseMode: "json" | "text" | "status";
  responsePath: string;
};

export type DbQueryConfig = {
  provider: "auto" | "mongodb";
  collection: string;
  mode: "preset" | "custom";
  preset: "by_id" | "by_productId" | "by_entityId" | "by_field";
  field: string;
  idType: "string" | "objectId";
  queryTemplate: string;
  limit: number;
  sort: string;
  sortPresetId?: string;
  projection: string;
  projectionPresetId?: string;
  single: boolean;
};

export type PollConfig = {
  intervalMs: number;
  maxAttempts: number;
  mode?: "job" | "database";
  dbQuery?: DbQueryConfig;
  successPath?: string;
  successOperator?: "truthy" | "equals" | "contains" | "notEquals";
  successValue?: string;
  resultPath?: string;
};

export type NodeConfig = {
  trigger?: TriggerConfig;
  simulation?: SimulationConfig;
  viewer?: ViewerConfig;
  context?: ContextConfig;
  mapper?: MapperConfig;
  mutator?: MutatorConfig;
  validator?: ValidatorConfig;
  constant?: ConstantConfig;
  math?: MathConfig;
  template?: TemplateConfig;
  bundle?: BundleConfig;
  gate?: GateConfig;
  compare?: CompareConfig;
  router?: RouterConfig;
  delay?: DelayConfig;
  poll?: PollConfig;
  http?: HttpConfig;
  dbQuery?: DbQueryConfig;
  description?: DescriptionConfig;
  parser?: ParserConfig;
  prompt?: PromptConfig;
  model?: ModelConfig;
  database?: DatabaseConfig;
};

export type NodeDefinition = {
  type: NodeType;
  title: string;
  description: string;
  inputs: string[];
  outputs: string[];
};

export type AiNode = NodeDefinition & {
  id: string;
  position: { x: number; y: number };
  config?: NodeConfig;
};

export type Edge = {
  id: string;
  from: string;
  to: string;
  label?: string;
  fromPort?: string;
  toPort?: string;
};

export type RuntimePortValues = Record<string, unknown>;
export type RuntimeState = {
  inputs: Record<string, RuntimePortValues>;
  outputs: Record<string, RuntimePortValues>;
};

export type PathMeta = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type PathConfig = {
  id: string;
  version: number;
  name: string;
  description: string;
  trigger: string;
  nodes: AiNode[];
  edges: Edge[];
  updatedAt: string;
  parserSamples?: Record<string, ParserSampleState>;
  updaterSamples?: Record<string, UpdaterSampleState>;
  runtimeState?: RuntimeState | string | null;
  lastRunAt?: string | null;
};

export type ClusterPreset = {
  id: string;
  name: string;
  description: string;
  bundlePorts: string[];
  template: string;
  createdAt: string;
  updatedAt: string;
};

export type JsonPathEntry = {
  path: string;
  type: "object" | "array" | "value";
};

export type ConnectionValidation = {
  valid: boolean;
  message?: string;
};
