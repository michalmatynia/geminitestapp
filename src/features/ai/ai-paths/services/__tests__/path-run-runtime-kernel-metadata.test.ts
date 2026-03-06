import { describe, expect, it } from 'vitest';

import { normalizeAiPathRunRuntimeKernelMetadata } from '@/features/ai/ai-paths/services/path-run-runtime-kernel-metadata';

describe('normalizeAiPathRunRuntimeKernelMetadata', () => {
  it('normalizes legacy runtime-kernel config aliases into canonical fields', () => {
    const result = normalizeAiPathRunRuntimeKernelMetadata({
      runtimeKernelConfig: {
        mode: ' legacy_only ',
        pilotNodeTypes: ' Template Node, parser ',
        resolverIds: ' resolver.primary , resolver.fallback ',
        strictCodeObjectRegistry: ' YES ',
      },
    });

    expect(result.changed).toBe(true);
    expect(result.changedFields).toEqual([
      'runtimeKernelConfig.mode',
      'runtimeKernelConfig.nodeTypes',
      'runtimeKernelConfig.codeObjectResolverIds',
      'runtimeKernelConfig.strictNativeRegistry',
    ]);
    expect(result.meta).toEqual({
      runtimeKernelConfig: {
        mode: 'auto',
        nodeTypes: ['template_node', 'parser'],
        codeObjectResolverIds: ['resolver.primary', 'resolver.fallback'],
        strictNativeRegistry: true,
      },
    });
  });

  it('normalizes runtime-kernel telemetry aliases and typed values', () => {
    const result = normalizeAiPathRunRuntimeKernelMetadata({
      runtimeKernel: {
        runtimeKernelMode: 'legacy_only',
        runtimeKernelPilotNodeTypes: ['constant', 'template'],
        runtimeKernelPilotNodeTypesSource: ' path ',
        runtimeKernelCodeObjectResolverIds: ' resolver.primary , resolver.fallback ',
        runtimeKernelStrictNativeRegistry: '1',
      },
    });

    expect(result.changed).toBe(true);
    expect(result.changedFields).toEqual([
      'runtimeKernel.mode',
      'runtimeKernel.nodeTypes',
      'runtimeKernel.nodeTypesSource',
      'runtimeKernel.codeObjectResolverIds',
      'runtimeKernel.strictNativeRegistry',
    ]);
    expect(result.meta).toEqual({
      runtimeKernel: {
        runtimeKernelMode: 'auto',
        runtimeKernelNodeTypes: ['constant', 'template'],
        runtimeKernelNodeTypesSource: 'path',
        runtimeKernelCodeObjectResolverIds: ['resolver.primary', 'resolver.fallback'],
        runtimeKernelStrictNativeRegistry: true,
      },
    });
  });

  it('returns unchanged metadata when values are already canonical', () => {
    const meta = {
      runtimeKernelConfig: {
        mode: 'auto',
        nodeTypes: ['constant'],
        codeObjectResolverIds: ['resolver.primary'],
        strictNativeRegistry: true,
      },
      runtimeKernel: {
        runtimeKernelMode: 'auto',
        runtimeKernelNodeTypes: ['constant'],
        runtimeKernelNodeTypesSource: 'settings',
        runtimeKernelCodeObjectResolverIds: ['resolver.primary'],
        runtimeKernelStrictNativeRegistry: true,
      },
    };

    const result = normalizeAiPathRunRuntimeKernelMetadata(meta);

    expect(result.changed).toBe(false);
    expect(result.changedFields).toEqual([]);
    expect(result.meta).toBe(meta);
  });
});
