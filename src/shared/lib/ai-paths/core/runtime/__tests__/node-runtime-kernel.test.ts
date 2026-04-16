import { describe, expect, it, vi } from 'vitest';

import type { NodeHandler } from '@/shared/contracts/ai-paths-runtime';
import { createNodeRuntimeKernel } from '@/shared/lib/ai-paths/core/runtime/node-runtime-kernel';

const buildHandler = (label: string): NodeHandler =>
  vi.fn(async () => ({
    status: 'completed',
    value: label,
  }));

describe('node-runtime-kernel', () => {
  it('fails closed for contract-backed canonical node types when no code-object resolver is available', () => {
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
    expect(descriptor.source).toBe('missing');
    expect(descriptor.codeObjectId).toBe('ai-paths.node-code-object.constant.v3');
    expect(runtimeKernel.resolveHandler('constant')).toBeNull();

    const templateDescriptor = runtimeKernel.resolveDescriptor('template');
    expect(templateDescriptor.strategy).toBe('code_object_v3');
    expect(templateDescriptor.codeObjectId).toBe('ai-paths.node-code-object.template.v3');
    expect(templateDescriptor.source).toBe('missing');
    expect(runtimeKernel.resolveHandler('template')).toBeNull();
    expect(runtimeKernel.resolveHandler('math')).toBeNull();
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

  it('fails closed for contract-backed nodes when direct code-object handler is unavailable', () => {
    const legacyMathHandler = buildHandler('legacy-math');
    const resolveCodeObjectHandler = vi.fn(() => null);

    const runtimeKernel = createNodeRuntimeKernel({
      resolveLegacyHandler: (nodeType: string) => (nodeType === 'math' ? legacyMathHandler : null),
      resolveCodeObjectHandler,
      runtimeKernelNodeTypes: ['math'],
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

  it('falls back to legacy handlers for experimental runtime-kernel node types without contract entries', () => {
    const legacyExperimentalHandler = buildHandler('legacy-experimental');
    const resolveCodeObjectHandler = vi.fn(() => null);

    const runtimeKernel = createNodeRuntimeKernel({
      resolveLegacyHandler: (nodeType: string) =>
        nodeType === 'experimental_type' ? legacyExperimentalHandler : null,
      resolveCodeObjectHandler,
      runtimeKernelNodeTypes: ['experimental_type'],
    });

    const descriptor = runtimeKernel.resolveDescriptor('experimental_type');
    expect(descriptor.strategy).toBe('code_object_v3');
    expect(descriptor.source).toBe('registry');
    expect(descriptor.handler).toBe(legacyExperimentalHandler);
    expect(runtimeKernel.resolveHandler('experimental_type')).toBe(legacyExperimentalHandler);
    expect(resolveCodeObjectHandler).toHaveBeenCalledWith({
      nodeType: 'experimental_type',
      codeObjectId: 'ai-paths.node-code-object.experimental_type.v3',
    });
  });

  it('keeps non-runtime-kernel node types on the canonical strategy without a code-object id', () => {
    const legacyCustomHandler = buildHandler('legacy_custom');
    const runtimeKernel = createNodeRuntimeKernel({
      resolveLegacyHandler: (nodeType: string) =>
        nodeType === 'legacy_custom' ? legacyCustomHandler : null,
    });

    const descriptor = runtimeKernel.resolveDescriptor('legacy_custom');
    expect(descriptor.strategy).toBe('code_object_v3');
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
    expect(descriptor.strategy).toBe('code_object_v3');
    expect(descriptor.codeObjectId).toBeNull();
    expect(descriptor.handler).toBeNull();
    expect(runtimeKernel.resolveHandler('unknown_type')).toBeNull();
  });

  it('supports custom runtime-kernel node type lists when a resolver is provided', () => {
    const databaseHandler = buildHandler('database');
    const runtimeKernel = createNodeRuntimeKernel({
      resolveLegacyHandler: () => null,
      resolveCodeObjectHandler: ({
        nodeType,
        codeObjectId,
      }: {
        nodeType: string;
        codeObjectId: string;
      }) =>
        nodeType === 'database' && codeObjectId === 'ai-paths.node-code-object.database.v3'
          ? databaseHandler
          : null,
      runtimeKernelNodeTypes: ['database'],
    });

    const descriptor = runtimeKernel.resolveDescriptor('database');
    expect(descriptor.strategy).toBe('code_object_v3');
    expect(descriptor.codeObjectId).toBe('ai-paths.node-code-object.database.v3');
    expect(descriptor.handler).toBe(databaseHandler);
    expect(descriptor.source).toBe('registry');
  });
});
