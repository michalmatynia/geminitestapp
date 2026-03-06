import { describe, expect, it, vi } from 'vitest';

import type { NodeHandler } from '@/shared/contracts/ai-paths-runtime';
import {
  createNodeRuntimeKernel,
  resolveNodeRuntimeKernelMode,
} from '@/shared/lib/ai-paths/core/runtime/node-runtime-kernel';

const buildHandler = (label: string): NodeHandler =>
  vi.fn(async () => ({
    status: 'completed',
    value: label,
  }));

describe('node-runtime-kernel', () => {
  it('resolves canonical runtime-kernel node types through code_object_v3 strategy while keeping legacy handlers', () => {
    const constantHandler = buildHandler('constant');
    const templateHandler = buildHandler('template');
    const mathHandler = buildHandler('math');

    const runtimeKernel = createNodeRuntimeKernel({
      resolveLegacyHandler: (nodeType: string) =>
        ({
          constant: constantHandler,
          template: templateHandler,
          math: mathHandler,
        })[nodeType] ?? null,
    });

    const descriptor = runtimeKernel.resolveDescriptor('constant');
    expect(descriptor.strategy).toBe('code_object_v3');
    expect(descriptor.source).toBe('registry');
    expect(descriptor.codeObjectId).toBe('ai-paths.node-code-object.constant.v3');
    expect(runtimeKernel.resolveHandler('constant')).toBe(constantHandler);

    const templateDescriptor = runtimeKernel.resolveDescriptor('template');
    expect(templateDescriptor.strategy).toBe('code_object_v3');
    expect(templateDescriptor.codeObjectId).toBe('ai-paths.node-code-object.template.v3');
    expect(runtimeKernel.resolveHandler('template')).toBe(templateHandler);
  });

  it('prefers direct code-object handlers for canonical runtime-kernel node types when provided', () => {
    const legacyConstantHandler = buildHandler('legacy-constant');
    const v3ConstantHandler = buildHandler('v3-constant');
    const resolveCodeObjectHandler = vi.fn(
      ({ nodeType, codeObjectId }: { nodeType: string; codeObjectId: string }) =>
        nodeType === 'constant' && codeObjectId === 'ai-paths.node-code-object.constant.v3'
          ? v3ConstantHandler
          : null
    );

    const runtimeKernel = createNodeRuntimeKernel({
      resolveLegacyHandler: (nodeType: string) =>
        nodeType === 'constant' ? legacyConstantHandler : null,
      resolveCodeObjectHandler,
    });

    const descriptor = runtimeKernel.resolveDescriptor('constant');
    expect(descriptor.strategy).toBe('code_object_v3');
    expect(descriptor.source).toBe('registry');
    expect(descriptor.handler).toBe(v3ConstantHandler);
    expect(runtimeKernel.resolveHandler('constant')).toBe(v3ConstantHandler);
    expect(resolveCodeObjectHandler).toHaveBeenCalledWith({
      nodeType: 'constant',
      codeObjectId: 'ai-paths.node-code-object.constant.v3',
    });
  });

  it('falls back to legacy handlers when direct code-object handler is unavailable', () => {
    const legacyMathHandler = buildHandler('legacy-math');
    const resolveCodeObjectHandler = vi.fn(() => null);

    const runtimeKernel = createNodeRuntimeKernel({
      resolveLegacyHandler: (nodeType: string) => (nodeType === 'math' ? legacyMathHandler : null),
      resolveCodeObjectHandler,
      runtimeKernelNodeTypes: ['math'],
    });

    const descriptor = runtimeKernel.resolveDescriptor('math');
    expect(descriptor.strategy).toBe('code_object_v3');
    expect(descriptor.source).toBe('registry');
    expect(descriptor.handler).toBe(legacyMathHandler);
    expect(runtimeKernel.resolveHandler('math')).toBe(legacyMathHandler);
    expect(resolveCodeObjectHandler).toHaveBeenCalledWith({
      nodeType: 'math',
      codeObjectId: 'ai-paths.node-code-object.math.v3',
    });
  });

  it('keeps missing descriptor when strict native registry mode is enabled', () => {
    const legacyMathHandler = buildHandler('legacy-math');
    const resolveCodeObjectHandler = vi.fn(() => null);

    const runtimeKernel = createNodeRuntimeKernel({
      resolveLegacyHandler: (nodeType: string) => (nodeType === 'math' ? legacyMathHandler : null),
      resolveCodeObjectHandler,
      runtimeKernelNodeTypes: ['math'],
      runtimeKernelStrictNativeRegistry: true,
    });

    const descriptor = runtimeKernel.resolveDescriptor('math');
    expect(descriptor.strategy).toBe('code_object_v3');
    expect(descriptor.source).toBe('missing');
    expect(descriptor.handler).toBeNull();
    expect(runtimeKernel.resolveHandler('math')).toBeNull();
    expect(resolveCodeObjectHandler).toHaveBeenCalledWith({
      nodeType: 'math',
      codeObjectId: 'ai-paths.node-code-object.math.v3',
    });
  });

  it('keeps non-runtime-kernel node types on legacy_adapter strategy', () => {
    const legacyCustomHandler = buildHandler('legacy_custom');
    const runtimeKernel = createNodeRuntimeKernel({
      resolveLegacyHandler: (nodeType: string) =>
        nodeType === 'legacy_custom' ? legacyCustomHandler : null,
    });

    const descriptor = runtimeKernel.resolveDescriptor('legacy_custom');
    expect(descriptor.strategy).toBe('legacy_adapter');
    expect(descriptor.source).toBe('registry');
    expect(descriptor.codeObjectId).toBeNull();
    expect(descriptor.handler).toBe(legacyCustomHandler);
  });

  it('prefers override handlers before legacy registry handlers', () => {
    const legacyMathHandler = buildHandler('legacy');
    const overrideMathHandler = buildHandler('override');

    const runtimeKernel = createNodeRuntimeKernel({
      resolveLegacyHandler: (nodeType: string) => (nodeType === 'math' ? legacyMathHandler : null),
      resolveOverrideHandler: (nodeType: string) =>
        nodeType === 'math' ? overrideMathHandler : null,
    });

    const descriptor = runtimeKernel.resolveDescriptor('math');
    expect(descriptor.strategy).toBe('code_object_v3');
    expect(descriptor.source).toBe('override');
    expect(descriptor.handler).toBe(overrideMathHandler);
    expect(runtimeKernel.resolveHandler('math')).toBe(overrideMathHandler);
  });

  it('reports missing handlers without throwing in descriptor resolution', () => {
    const runtimeKernel = createNodeRuntimeKernel({
      resolveLegacyHandler: () => null,
    });

    const descriptor = runtimeKernel.resolveDescriptor('unknown_type');
    expect(descriptor.source).toBe('missing');
    expect(descriptor.strategy).toBe('legacy_adapter');
    expect(descriptor.handler).toBeNull();
    expect(runtimeKernel.resolveHandler('unknown_type')).toBeNull();
  });

  it('supports custom runtime-kernel node type lists for staged migration rollouts', () => {
    const databaseHandler = buildHandler('database');
    const runtimeKernel = createNodeRuntimeKernel({
      resolveLegacyHandler: (nodeType: string) =>
        nodeType === 'database' ? databaseHandler : null,
      runtimeKernelNodeTypes: ['database'],
    });

    const descriptor = runtimeKernel.resolveDescriptor('database');
    expect(descriptor.strategy).toBe('code_object_v3');
    expect(descriptor.codeObjectId).toBe('ai-paths.node-code-object.database.v3');
    expect(descriptor.handler).toBe(databaseHandler);
  });

  it('normalizes unknown runtime kernel mode to auto', () => {
    expect(resolveNodeRuntimeKernelMode('auto')).toBe('auto');
    expect(resolveNodeRuntimeKernelMode('unexpected_mode')).toBe('auto');
    expect(resolveNodeRuntimeKernelMode(undefined)).toBe('auto');
  });
});
