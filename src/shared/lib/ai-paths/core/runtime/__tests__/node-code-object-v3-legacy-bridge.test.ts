import { describe, expect, it, vi } from 'vitest';

import type { NodeHandler } from '@/shared/contracts/ai-paths-runtime';
import {
  createNodeCodeObjectV3ContractResolver,
  resolveNodeCodeObjectV3ContractByCodeObjectId,
} from '@/shared/lib/ai-paths/core/runtime/node-code-object-v3-legacy-bridge';

const buildHandler = (label: string): NodeHandler =>
  vi.fn(async () => ({
    status: 'completed',
    value: label,
  }));

describe('node-code-object-v3 legacy bridge', () => {
  it('loads contract metadata by code object id', () => {
    const entry = resolveNodeCodeObjectV3ContractByCodeObjectId(
      'ai-paths.node-code-object.constant.v3'
    );

    expect(entry).toMatchObject({
      nodeType: 'constant',
      codeObjectId: 'ai-paths.node-code-object.constant.v3',
      runtimeStrategy: 'code_object_v3',
      executionAdapter: 'native_handler_registry',
      legacyHandlerKey: 'constant',
    });
  });

  it('returns null for unknown code object ids', () => {
    expect(
      resolveNodeCodeObjectV3ContractByCodeObjectId('ai-paths.node-code-object.unknown.v3')
    ).toBeNull();
  });

  it('resolves v3 code object via native handler registry', () => {
    const nativeConstantHandler = buildHandler('native-constant');
    const resolveNativeCodeObjectHandler = vi.fn(({ codeObjectId }: { codeObjectId: string }) =>
      codeObjectId === 'ai-paths.node-code-object.constant.v3' ? nativeConstantHandler : null
    );

    const resolver = createNodeCodeObjectV3ContractResolver({
      resolveNativeCodeObjectHandler,
    });

    const resolved = resolver({
      nodeType: 'constant',
      codeObjectId: 'ai-paths.node-code-object.constant.v3',
    });

    expect(resolved).toBe(nativeConstantHandler);
    expect(resolveNativeCodeObjectHandler).toHaveBeenCalledWith({
      nodeType: 'constant',
      codeObjectId: 'ai-paths.node-code-object.constant.v3',
    });
  });

  it('fails closed when native handler is unavailable for a contract-backed node', () => {
    const resolveNativeCodeObjectHandler = vi.fn(() => null);

    const resolver = createNodeCodeObjectV3ContractResolver({
      resolveNativeCodeObjectHandler,
    });

    const resolved = resolver({
      nodeType: 'constant',
      codeObjectId: 'ai-paths.node-code-object.constant.v3',
    });

    expect(resolved).toBeNull();
    expect(resolveNativeCodeObjectHandler).toHaveBeenCalledWith({
      nodeType: 'constant',
      codeObjectId: 'ai-paths.node-code-object.constant.v3',
    });
  });

  it('routes model contract entries through native registry', () => {
    const nativeModelHandler = buildHandler('native-model');
    const resolveNativeCodeObjectHandler = vi.fn(({ codeObjectId }: { codeObjectId: string }) =>
      codeObjectId === 'ai-paths.node-code-object.model.v3' ? nativeModelHandler : null
    );

    const resolver = createNodeCodeObjectV3ContractResolver({
      resolveNativeCodeObjectHandler,
    });

    const resolved = resolver({
      nodeType: 'model',
      codeObjectId: 'ai-paths.node-code-object.model.v3',
    });

    expect(resolved).toBe(nativeModelHandler);
    expect(resolveNativeCodeObjectHandler).toHaveBeenCalledWith({
      nodeType: 'model',
      codeObjectId: 'ai-paths.node-code-object.model.v3',
    });
  });

  it('returns null when node type and code object id contract do not match', () => {
    const resolveNativeCodeObjectHandler = vi.fn(() => buildHandler('unused'));

    const resolver = createNodeCodeObjectV3ContractResolver({
      resolveNativeCodeObjectHandler,
    });

    const resolved = resolver({
      nodeType: 'math',
      codeObjectId: 'ai-paths.node-code-object.constant.v3',
    });

    expect(resolved).toBeNull();
    expect(resolveNativeCodeObjectHandler).not.toHaveBeenCalled();
  });
});
