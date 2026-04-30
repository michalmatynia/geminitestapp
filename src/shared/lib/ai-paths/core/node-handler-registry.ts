/**
 * Authoritative node-type metadata for the AI-Paths runtime.
 *
 * Replaces ad-hoc `EFFECT_NODE_TYPES` sets that previously lived in
 * `services/path-run-executor/callbacks.ts` and `core/runtime/engine-modules/
 * engine-execution-node.ts` — both files diverged (callbacks.ts had
 * `advanced_api`, engine did not). One source of truth for both.
 */

export type NodeSideEffectPolicy = 'per_run' | 'per_activation';

export interface NodeHandlerMetadata {
  /** True if the node performs an external side effect (DB write, HTTP call, AI invocation). */
  isEffect: boolean;
  /** Default side-effect policy when path config does not override. */
  defaultSideEffectPolicy?: NodeSideEffectPolicy;
}

export const NODE_HANDLER_REGISTRY: Readonly<Record<string, NodeHandlerMetadata>> = Object.freeze({
  agent: { isEffect: true, defaultSideEffectPolicy: 'per_activation' },
  advanced_api: { isEffect: true, defaultSideEffectPolicy: 'per_activation' },
  api_advanced: { isEffect: true, defaultSideEffectPolicy: 'per_activation' },
  database: { isEffect: true, defaultSideEffectPolicy: 'per_activation' },
  http: { isEffect: true, defaultSideEffectPolicy: 'per_activation' },
  learner_agent: { isEffect: true, defaultSideEffectPolicy: 'per_activation' },
  model: { isEffect: true, defaultSideEffectPolicy: 'per_activation' },
  notification: { isEffect: true, defaultSideEffectPolicy: 'per_run' },
  playwright: { isEffect: true, defaultSideEffectPolicy: 'per_activation' },
});

export function isEffectNodeType(nodeType: string): boolean {
  return NODE_HANDLER_REGISTRY[nodeType]?.isEffect === true;
}

export function getDefaultSideEffectPolicy(nodeType: string): NodeSideEffectPolicy | undefined {
  return NODE_HANDLER_REGISTRY[nodeType]?.defaultSideEffectPolicy;
}
