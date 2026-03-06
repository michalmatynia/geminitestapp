import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { NodeHandler } from '@/shared/contracts/ai-paths-runtime';
import {
  clearAiPathsRuntimeCodeObjectResolvers,
  listAiPathsRuntimeCodeObjectResolverIds,
  registerAiPathsRuntimeCodeObjectResolver,
  resolveAiPathsRuntimeCodeObjectHandler,
  unregisterAiPathsRuntimeCodeObjectResolver,
} from '@/shared/lib/ai-paths/core/runtime/code-object-resolver-registry';

const buildHandler = (label: string): NodeHandler =>
  vi.fn(async () => ({
    status: 'completed',
    value: label,
  }));

describe('code-object-resolver-registry', () => {
  beforeEach(() => {
    clearAiPathsRuntimeCodeObjectResolvers();
  });

  it('registers and resolves handlers in registration order', () => {
    const fallbackHandler = buildHandler('fallback');
    const winningHandler = buildHandler('winning');
    registerAiPathsRuntimeCodeObjectResolver('resolver.fallback', () => fallbackHandler);
    registerAiPathsRuntimeCodeObjectResolver('resolver.winner', ({ codeObjectId }) =>
      codeObjectId === 'ai-paths.node-code-object.constant.v3' ? winningHandler : null
    );

    const resolved = resolveAiPathsRuntimeCodeObjectHandler({
      nodeType: 'constant',
      codeObjectId: 'ai-paths.node-code-object.constant.v3',
    });
    expect(resolved).toBe(fallbackHandler);
  });

  it('supports resolver-id filtering when resolving handlers', () => {
    const alphaHandler = buildHandler('alpha');
    const betaHandler = buildHandler('beta');
    registerAiPathsRuntimeCodeObjectResolver('resolver.alpha', () => alphaHandler);
    registerAiPathsRuntimeCodeObjectResolver('resolver.beta', () => betaHandler);

    const resolved = resolveAiPathsRuntimeCodeObjectHandler(
      {
        nodeType: 'constant',
        codeObjectId: 'ai-paths.node-code-object.constant.v3',
      },
      {
        resolverIds: ['resolver.beta'],
      }
    );

    expect(resolved).toBe(betaHandler);
  });

  it('supports unregister via explicit call and disposer', () => {
    const disposer = registerAiPathsRuntimeCodeObjectResolver('resolver.temp', () =>
      buildHandler('temp')
    );
    expect(listAiPathsRuntimeCodeObjectResolverIds()).toEqual(['resolver.temp']);

    disposer();
    expect(listAiPathsRuntimeCodeObjectResolverIds()).toEqual([]);
    expect(unregisterAiPathsRuntimeCodeObjectResolver('resolver.temp')).toBe(false);

    registerAiPathsRuntimeCodeObjectResolver('resolver.temp', () => buildHandler('temp2'));
    expect(listAiPathsRuntimeCodeObjectResolverIds()).toEqual(['resolver.temp']);
    expect(unregisterAiPathsRuntimeCodeObjectResolver('resolver.temp')).toBe(true);
    expect(listAiPathsRuntimeCodeObjectResolverIds()).toEqual([]);
  });

  it('throws for empty resolver ids', () => {
    expect(() => registerAiPathsRuntimeCodeObjectResolver('   ', () => null)).toThrow(/non-empty/i);
  });
});
