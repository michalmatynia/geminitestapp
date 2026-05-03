import { type NodeHandlerContext } from '@/shared/contracts/ai-paths-runtime';

export const EXECUTED_STATE_KEY = '__executed_state__';

export const createExecutedState = (): NodeHandlerContext['executed'] => ({
  notification: new Set<string>(),
  updater: new Set<string>(),
  http: new Set<string>(),
  delay: new Set<string>(),
  poll: new Set<string>(),
  ai: new Set<string>(),
  schema: new Set<string>(),
  mapper: new Set<string>(),
});

export const EFFECT_EXECUTED_BUCKET_BY_NODE_TYPE = new Map<string, keyof NodeHandlerContext['executed']>([
  ['agent', 'ai'],
  ['api_advanced', 'http'],
  ['database', 'updater'],
  ['http', 'http'],
  ['learner_agent', 'ai'],
  ['model', 'ai'],
]);
