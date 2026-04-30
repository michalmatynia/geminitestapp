import { describe, expect, it } from 'vitest';

import {
  NODE_HANDLER_REGISTRY,
  getDefaultSideEffectPolicy,
  isEffectNodeType,
} from '../node-handler-registry';

describe('node-handler-registry', () => {
  it('flags every effect node type as isEffect=true', () => {
    for (const [nodeType, meta] of Object.entries(NODE_HANDLER_REGISTRY)) {
      expect(isEffectNodeType(nodeType)).toBe(meta.isEffect);
    }
  });

  it('returns false for unknown node types', () => {
    expect(isEffectNodeType('template')).toBe(false);
    expect(isEffectNodeType('context')).toBe(false);
    expect(isEffectNodeType('switch')).toBe(false);
    expect(isEffectNodeType('made-up-type')).toBe(false);
  });

  it('exposes per-activation as the default side-effect policy for handler-driven node types', () => {
    expect(getDefaultSideEffectPolicy('agent')).toBe('per_activation');
    expect(getDefaultSideEffectPolicy('database')).toBe('per_activation');
    expect(getDefaultSideEffectPolicy('http')).toBe('per_activation');
    expect(getDefaultSideEffectPolicy('playwright')).toBe('per_activation');
  });

  it('records per-run cadence for notifications and per-activation for model', () => {
    expect(getDefaultSideEffectPolicy('model')).toBe('per_activation');
    expect(getDefaultSideEffectPolicy('notification')).toBe('per_run');
  });

  it('preserves the union previously hardcoded in callbacks.ts and engine-execution-node.ts', () => {
    const expected = new Set([
      'agent',
      'advanced_api',
      'api_advanced',
      'database',
      'http',
      'learner_agent',
      'model',
      'notification',
      'playwright',
    ]);
    const actualEffect = new Set(
      Object.entries(NODE_HANDLER_REGISTRY)
        .filter(([, meta]) => meta.isEffect)
        .map(([type]) => type)
    );
    expect(actualEffect).toEqual(expected);
  });
});
