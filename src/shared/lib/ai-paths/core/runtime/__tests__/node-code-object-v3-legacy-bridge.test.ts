import { describe, expect, it, vi } from 'vitest';

import type { NodeHandler } from '@/shared/contracts/ai-paths-runtime';
import {
  createNodeCodeObjectV3ContractResolver,
  createNodeCodeObjectV3LegacyBridgeResolver,
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
    expect(resolveNodeCodeObjectV3ContractByCodeObjectId('ai-paths.node-code-object.unknown.v3')).toBeNull();
  });

  it('bridges v3 code object resolution to legacy handlers using contract mapping', () => {
    const constantHandler = buildHandler('constant');
    const resolveLegacyHandler = vi.fn((nodeType: string) =>
      nodeType === 'constant' ? constantHandler : null
    );
    const resolver = createNodeCodeObjectV3LegacyBridgeResolver({
      resolveLegacyHandler,
    });

    const resolved = resolver({
      nodeType: 'constant',
      codeObjectId: 'ai-paths.node-code-object.constant.v3',
    });

    expect(resolved).toBe(constantHandler);
    expect(resolveLegacyHandler).toHaveBeenCalledWith('constant');
  });

  it('prefers native registry handlers when contract execution adapter is native_handler_registry', () => {
    const nativeConstantHandler = buildHandler('native-constant');
    const resolveLegacyHandler = vi.fn(() => buildHandler('legacy-unused'));
    const resolveNativeCodeObjectHandler = vi.fn(({ codeObjectId }: { codeObjectId: string }) =>
      codeObjectId === 'ai-paths.node-code-object.constant.v3' ? nativeConstantHandler : null
    );

    const resolver = createNodeCodeObjectV3ContractResolver({
      resolveLegacyHandler,
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
    expect(resolveLegacyHandler).not.toHaveBeenCalled();
  });

  it('falls back to legacy bridge when native handler is unavailable', () => {
    const legacyConstantHandler = buildHandler('legacy-constant');
    const resolveLegacyHandler = vi.fn((nodeType: string) =>
      nodeType === 'constant' ? legacyConstantHandler : null
    );
    const resolveNativeCodeObjectHandler = vi.fn(() => null);

    const resolver = createNodeCodeObjectV3ContractResolver({
      resolveLegacyHandler,
      resolveNativeCodeObjectHandler,
    });

    const resolved = resolver({
      nodeType: 'constant',
      codeObjectId: 'ai-paths.node-code-object.constant.v3',
    });

    expect(resolved).toBe(legacyConstantHandler);
    expect(resolveNativeCodeObjectHandler).toHaveBeenCalledWith({
      nodeType: 'constant',
      codeObjectId: 'ai-paths.node-code-object.constant.v3',
    });
    expect(resolveLegacyHandler).toHaveBeenCalledWith('constant');
  });

  it('routes promoted model contract entries through native registry first', () => {
    const nativeModelHandler = buildHandler('native-model');
    const resolveLegacyHandler = vi.fn(() => buildHandler('legacy-unused'));
    const resolveNativeCodeObjectHandler = vi.fn(({ codeObjectId }: { codeObjectId: string }) =>
      codeObjectId === 'ai-paths.node-code-object.model.v3' ? nativeModelHandler : null
    );

    const resolver = createNodeCodeObjectV3ContractResolver({
      resolveLegacyHandler,
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
    expect(resolveLegacyHandler).not.toHaveBeenCalled();
  });

  it('does not bridge when node type and code object id contract do not match', () => {
    const resolveLegacyHandler = vi.fn(() => buildHandler('unused'));
    const resolver = createNodeCodeObjectV3LegacyBridgeResolver({
      resolveLegacyHandler,
    });

    const resolved = resolver({
      nodeType: 'math',
      codeObjectId: 'ai-paths.node-code-object.constant.v3',
    });

    expect(resolved).toBeNull();
    expect(resolveLegacyHandler).not.toHaveBeenCalled();
  });
});
