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
        nodeTypes: ['template_node', 'parser'],
        codeObjectResolverIds: ['resolver.primary', 'resolver.fallback'],
      },
    });
  });

  it('prunes deprecated runtime-kernel telemetry aliases and typed values', () => {
    const result = normalizeAiPathRunRuntimeKernelMetadata({
      runtimeKernel: {
        runtimeKernelMode: 'legacy_only',
        runtimeKernelModeSource: 'default',
        runtimeKernelPilotNodeTypes: ['constant', 'template'],
        runtimeKernelPilotNodeTypesSource: ' path ',
        runtimeKernelCodeObjectResolverIds: ' resolver.primary , resolver.fallback ',
        runtimeKernelStrictNativeRegistry: '1',
        runtimeKernelStrictNativeRegistrySource: 'default',
      },
    });

    expect(result.changed).toBe(true);
    expect(result.changedFields).toEqual([
      'runtimeKernel.mode',
      'runtimeKernel.modeSource',
      'runtimeKernel.nodeTypes',
      'runtimeKernel.nodeTypesSource',
      'runtimeKernel.codeObjectResolverIds',
      'runtimeKernel.strictNativeRegistry',
      'runtimeKernel.strictNativeRegistrySource',
    ]);
    expect(result.meta).toEqual({
      runtimeKernel: {
        runtimeKernelNodeTypes: ['constant', 'template'],
        runtimeKernelNodeTypesSource: 'path',
        runtimeKernelCodeObjectResolverIds: ['resolver.primary', 'resolver.fallback'],
      },
    });
  });

  it('returns unchanged metadata when values are already canonical', () => {
    const meta = {
      runtimeKernelConfig: {
        nodeTypes: ['constant'],
        codeObjectResolverIds: ['resolver.primary'],
      },
      runtimeKernel: {
        runtimeKernelNodeTypes: ['constant'],
        runtimeKernelNodeTypesSource: 'settings',
        runtimeKernelCodeObjectResolverIds: ['resolver.primary'],
      },
    };

    const result = normalizeAiPathRunRuntimeKernelMetadata(meta);

    expect(result.changed).toBe(false);
    expect(result.changedFields).toEqual([]);
    expect(result.meta).toBe(meta);
  });
});
