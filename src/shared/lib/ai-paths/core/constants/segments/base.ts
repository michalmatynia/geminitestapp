import { type RuntimeState } from '@/shared/contracts/ai-paths';
import { type NodeType, type DbQueryConfig } from '@/shared/contracts/ai-paths-core';

export const EMPTY_RUNTIME_STATE: RuntimeState = {
  status: 'idle',
  nodeStatuses: {},
  nodeOutputs: {},
  variables: {},
  events: [],
  inputs: {},
  outputs: {},
};

export const NODE_WIDTH = 260;
export const NODE_MIN_HEIGHT = 184;
export const CANVAS_WIDTH = 8800;
export const CANVAS_HEIGHT = 5600;
export const MIN_SCALE = 0.1;
export const MAX_SCALE = 1.6;
export const VIEW_MARGIN = 40;
export const PORT_GAP = 20;
export const PORT_SIZE = 12;
export const PORT_STACK_TOP = Math.round(NODE_MIN_HEIGHT * 0.3);
export const DB_PROVIDER_PLACEHOLDERS = ['MongoDB', 'PostgreSQL', 'Prisma', 'Redis'];
export const DEFAULT_CONTEXT_ROLE = 'entity';

export const CACHEABLE_NODE_TYPES: NodeType[] = [
  'fetcher',
  'parser',
  'regex',
  'mapper',
  'mutator',
  'string_mutator',
  'validator',
  'constant',
  'math',
  'template',
  'bundle',
  'gate',
  'compare',
  'logical_condition',
  'router',
  'http',
  'api_advanced',
  'model',
  'agent',
  'database',
  'ai_description',
  'description_updater',
];

export const CACHEABLE_NODE_TYPE_SET = new Set<NodeType>(CACHEABLE_NODE_TYPES);

export const DEFAULT_DB_QUERY: DbQueryConfig = {
  provider: 'auto',
  collection: 'products',
  mode: 'custom',
  preset: 'by_id',
  field: '_id',
  idType: 'string',
  queryTemplate: '',
  limit: 20,
  sort: '',
  sortPresetId: 'custom',
  projection: '',
  projectionPresetId: 'custom',
  single: false,
};
