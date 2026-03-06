import { describe, expect, it } from 'vitest';
import { HISTORICAL_RUNTIME_COMPATIBILITY_ALIAS } from '../../../../../../scripts/db/ai-paths-runtime-compatibility-normalization';

import {
  normalizeAiPathRunRuntimeKernelMetadataForCleanup,
  normalizeAiPathRunRuntimeKernelMetadataForRuntimeRead,
} from '@/features/ai/ai-paths/services/path-run-runtime-kernel-metadata';

describe('normalizeAiPathRunRuntimeKernelMetadataForCleanup', () => {
  it('normalizes legacy runtime-kernel config aliases into canonical fields', () => {
    const result = normalizeAiPathRunRuntimeKernelMetadataForCleanup({
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
    const result = normalizeAiPathRunRuntimeKernelMetadataForCleanup({
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

  it('leaves legacy runtime-trace kernel parity strategy counts for cleanup scripts', () => {
    const result = normalizeAiPathRunRuntimeKernelMetadataForCleanup({
      runtimeTrace: {
        kernelParity: {
          sampledHistoryEntries: 3,
          strategyCounts: {
            [HISTORICAL_RUNTIME_COMPATIBILITY_ALIAS]: 2,
            code_object_v3: 1,
            unknown: 0,
          },
        },
      },
    });

    expect(result.changed).toBe(false);
    expect(result.changedFields).toEqual([]);
    expect(result.meta).toEqual({
      runtimeTrace: {
        kernelParity: {
          sampledHistoryEntries: 3,
          strategyCounts: {
            [HISTORICAL_RUNTIME_COMPATIBILITY_ALIAS]: 2,
            code_object_v3: 1,
            unknown: 0,
          },
        },
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

    const result = normalizeAiPathRunRuntimeKernelMetadataForCleanup(meta);

    expect(result.changed).toBe(false);
    expect(result.changedFields).toEqual([]);
    expect(result.meta).toBe(meta);
  });

  it('ignores legacy runtime-kernel aliases during live runtime reads', () => {
    const result = normalizeAiPathRunRuntimeKernelMetadataForRuntimeRead({
      runtimeKernelConfig: {
        mode: ' legacy_only ',
        pilotNodeTypes: ' Template Node, parser ',
        resolverIds: ' resolver.primary , resolver.fallback ',
        strictCodeObjectRegistry: ' YES ',
      },
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
      'runtimeKernelConfig.mode',
      'runtimeKernelConfig.nodeTypes',
      'runtimeKernelConfig.codeObjectResolverIds',
      'runtimeKernelConfig.strictNativeRegistry',
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
        runtimeKernelCodeObjectResolverIds: ['resolver.primary', 'resolver.fallback'],
      },
    });
  });

  it('preserves canonical runtime-kernel metadata during live runtime reads', () => {
    const result = normalizeAiPathRunRuntimeKernelMetadataForRuntimeRead({
      runtimeKernelConfig: {
        mode: 'auto',
        nodeTypes: ' Template Node, parser ',
        codeObjectResolverIds: ' resolver.primary , resolver.fallback ',
        strictNativeRegistry: true,
      },
      runtimeKernel: {
        runtimeKernelMode: 'legacy_only',
        runtimeKernelNodeTypes: ' constant, template ',
        runtimeKernelNodeTypesSource: ' path ',
        runtimeKernelCodeObjectResolverIds: ' resolver.primary , resolver.fallback ',
        runtimeKernelStrictNativeRegistry: '1',
      },
    });

    expect(result.changed).toBe(true);
    expect(result.meta).toEqual({
      runtimeKernelConfig: {
        nodeTypes: ['template_node', 'parser'],
        codeObjectResolverIds: ['resolver.primary', 'resolver.fallback'],
      },
      runtimeKernel: {
        runtimeKernelNodeTypes: ['constant', 'template'],
        runtimeKernelNodeTypesSource: 'path',
        runtimeKernelCodeObjectResolverIds: ['resolver.primary', 'resolver.fallback'],
      },
    });
  });

  it('does not translate legacy runtime-trace kernel parity strategy counts during live runtime reads', () => {
    const result = normalizeAiPathRunRuntimeKernelMetadataForRuntimeRead({
      runtimeTrace: {
        kernelParity: {
          strategyCounts: {
            [HISTORICAL_RUNTIME_COMPATIBILITY_ALIAS]: 4,
            code_object_v3: 2,
            unknown: 1,
          },
        },
      },
    });

    expect(result.changed).toBe(false);
    expect(result.changedFields).toEqual([]);
    expect(result.meta).toEqual({
      runtimeTrace: {
        kernelParity: {
          strategyCounts: {
            [HISTORICAL_RUNTIME_COMPATIBILITY_ALIAS]: 4,
            code_object_v3: 2,
            unknown: 1,
          },
        },
      },
    });
  });
});
