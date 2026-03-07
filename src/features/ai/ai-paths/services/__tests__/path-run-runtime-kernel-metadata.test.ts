import { describe, expect, it } from 'vitest';
import { HISTORICAL_RUNTIME_COMPATIBILITY_ALIAS } from '../../../../../../scripts/db/ai-paths-runtime-compatibility-normalization';
import {
  DEPRECATED_RUNTIME_KERNEL_CONFIG_MODE_FIELD,
  DEPRECATED_RUNTIME_KERNEL_CONFIG_NODE_TYPES_FIELD,
  DEPRECATED_RUNTIME_KERNEL_MODE_ALIAS,
  DEPRECATED_RUNTIME_KERNEL_CONFIG_RESOLVER_IDS_FIELD,
  DEPRECATED_RUNTIME_KERNEL_CONFIG_STRICT_ALIAS_FIELD,
  DEPRECATED_RUNTIME_KERNEL_CONFIG_STRICT_NATIVE_FIELD,
  DEPRECATED_RUNTIME_KERNEL_TELEMETRY_MODE_FIELD,
  DEPRECATED_RUNTIME_KERNEL_TELEMETRY_MODE_SOURCE_FIELD,
  DEPRECATED_RUNTIME_KERNEL_TELEMETRY_NODE_TYPES_FIELD,
  DEPRECATED_RUNTIME_KERNEL_TELEMETRY_NODE_TYPES_SOURCE_FIELD,
  DEPRECATED_RUNTIME_KERNEL_TELEMETRY_STRICT_NATIVE_FIELD,
  DEPRECATED_RUNTIME_KERNEL_TELEMETRY_STRICT_NATIVE_SOURCE_FIELD,
} from '@/shared/lib/ai-paths/core/runtime/runtime-kernel-legacy-aliases';

import {
  AI_PATH_RUN_RUNTIME_KERNEL_METADATA_CHANGED_FIELDS,
  normalizeAiPathRunRuntimeKernelMetadataForCleanup,
  normalizeAiPathRunRuntimeKernelMetadataForRuntimeRead,
} from '@/features/ai/ai-paths/services/path-run-runtime-kernel-metadata';

describe('normalizeAiPathRunRuntimeKernelMetadataForCleanup', () => {
  it('normalizes legacy runtime-kernel config aliases into canonical fields', () => {
    const result = normalizeAiPathRunRuntimeKernelMetadataForCleanup({
      runtimeKernelConfig: {
        [DEPRECATED_RUNTIME_KERNEL_CONFIG_MODE_FIELD]: ` ${DEPRECATED_RUNTIME_KERNEL_MODE_ALIAS} `,
        [DEPRECATED_RUNTIME_KERNEL_CONFIG_NODE_TYPES_FIELD]: ' Template Node, parser ',
        [DEPRECATED_RUNTIME_KERNEL_CONFIG_RESOLVER_IDS_FIELD]:
          ' resolver.primary , resolver.fallback ',
        [DEPRECATED_RUNTIME_KERNEL_CONFIG_STRICT_ALIAS_FIELD]: ' YES ',
      },
    });

    expect(result.changed).toBe(true);
    expect(result.changedFields).toEqual([
      AI_PATH_RUN_RUNTIME_KERNEL_METADATA_CHANGED_FIELDS.runtimeKernelConfigMode,
      AI_PATH_RUN_RUNTIME_KERNEL_METADATA_CHANGED_FIELDS.runtimeKernelConfigNodeTypes,
      AI_PATH_RUN_RUNTIME_KERNEL_METADATA_CHANGED_FIELDS.runtimeKernelConfigCodeObjectResolverIds,
      AI_PATH_RUN_RUNTIME_KERNEL_METADATA_CHANGED_FIELDS.runtimeKernelConfigStrictNativeRegistry,
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
        [DEPRECATED_RUNTIME_KERNEL_TELEMETRY_MODE_FIELD]: DEPRECATED_RUNTIME_KERNEL_MODE_ALIAS,
        [DEPRECATED_RUNTIME_KERNEL_TELEMETRY_MODE_SOURCE_FIELD]: 'default',
        [DEPRECATED_RUNTIME_KERNEL_TELEMETRY_NODE_TYPES_FIELD]: ['constant', 'template'],
        [DEPRECATED_RUNTIME_KERNEL_TELEMETRY_NODE_TYPES_SOURCE_FIELD]: ' path ',
        runtimeKernelCodeObjectResolverIds: ' resolver.primary , resolver.fallback ',
        [DEPRECATED_RUNTIME_KERNEL_TELEMETRY_STRICT_NATIVE_FIELD]: '1',
        [DEPRECATED_RUNTIME_KERNEL_TELEMETRY_STRICT_NATIVE_SOURCE_FIELD]: 'default',
      },
    });

    expect(result.changed).toBe(true);
    expect(result.changedFields).toEqual([
      AI_PATH_RUN_RUNTIME_KERNEL_METADATA_CHANGED_FIELDS.runtimeKernelMode,
      AI_PATH_RUN_RUNTIME_KERNEL_METADATA_CHANGED_FIELDS.runtimeKernelModeSource,
      AI_PATH_RUN_RUNTIME_KERNEL_METADATA_CHANGED_FIELDS.runtimeKernelNodeTypes,
      AI_PATH_RUN_RUNTIME_KERNEL_METADATA_CHANGED_FIELDS.runtimeKernelNodeTypesSource,
      AI_PATH_RUN_RUNTIME_KERNEL_METADATA_CHANGED_FIELDS.runtimeKernelCodeObjectResolverIds,
      AI_PATH_RUN_RUNTIME_KERNEL_METADATA_CHANGED_FIELDS.runtimeKernelStrictNativeRegistry,
      AI_PATH_RUN_RUNTIME_KERNEL_METADATA_CHANGED_FIELDS.runtimeKernelStrictNativeRegistrySource,
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
        [DEPRECATED_RUNTIME_KERNEL_CONFIG_MODE_FIELD]: ` ${DEPRECATED_RUNTIME_KERNEL_MODE_ALIAS} `,
        [DEPRECATED_RUNTIME_KERNEL_CONFIG_NODE_TYPES_FIELD]: ' Template Node, parser ',
        [DEPRECATED_RUNTIME_KERNEL_CONFIG_RESOLVER_IDS_FIELD]:
          ' resolver.primary , resolver.fallback ',
        [DEPRECATED_RUNTIME_KERNEL_CONFIG_STRICT_ALIAS_FIELD]: ' YES ',
      },
      runtimeKernel: {
        [DEPRECATED_RUNTIME_KERNEL_TELEMETRY_MODE_FIELD]: DEPRECATED_RUNTIME_KERNEL_MODE_ALIAS,
        [DEPRECATED_RUNTIME_KERNEL_TELEMETRY_MODE_SOURCE_FIELD]: 'default',
        [DEPRECATED_RUNTIME_KERNEL_TELEMETRY_NODE_TYPES_FIELD]: ['constant', 'template'],
        [DEPRECATED_RUNTIME_KERNEL_TELEMETRY_NODE_TYPES_SOURCE_FIELD]: ' path ',
        runtimeKernelCodeObjectResolverIds: ' resolver.primary , resolver.fallback ',
        [DEPRECATED_RUNTIME_KERNEL_TELEMETRY_STRICT_NATIVE_FIELD]: '1',
        [DEPRECATED_RUNTIME_KERNEL_TELEMETRY_STRICT_NATIVE_SOURCE_FIELD]: 'default',
      },
    });

    expect(result.changed).toBe(true);
    expect(result.changedFields).toEqual([
      AI_PATH_RUN_RUNTIME_KERNEL_METADATA_CHANGED_FIELDS.runtimeKernelConfigMode,
      AI_PATH_RUN_RUNTIME_KERNEL_METADATA_CHANGED_FIELDS.runtimeKernelConfigNodeTypes,
      AI_PATH_RUN_RUNTIME_KERNEL_METADATA_CHANGED_FIELDS.runtimeKernelConfigCodeObjectResolverIds,
      AI_PATH_RUN_RUNTIME_KERNEL_METADATA_CHANGED_FIELDS.runtimeKernelConfigStrictNativeRegistry,
      AI_PATH_RUN_RUNTIME_KERNEL_METADATA_CHANGED_FIELDS.runtimeKernelMode,
      AI_PATH_RUN_RUNTIME_KERNEL_METADATA_CHANGED_FIELDS.runtimeKernelModeSource,
      AI_PATH_RUN_RUNTIME_KERNEL_METADATA_CHANGED_FIELDS.runtimeKernelNodeTypes,
      AI_PATH_RUN_RUNTIME_KERNEL_METADATA_CHANGED_FIELDS.runtimeKernelNodeTypesSource,
      AI_PATH_RUN_RUNTIME_KERNEL_METADATA_CHANGED_FIELDS.runtimeKernelCodeObjectResolverIds,
      AI_PATH_RUN_RUNTIME_KERNEL_METADATA_CHANGED_FIELDS.runtimeKernelStrictNativeRegistry,
      AI_PATH_RUN_RUNTIME_KERNEL_METADATA_CHANGED_FIELDS.runtimeKernelStrictNativeRegistrySource,
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
        [DEPRECATED_RUNTIME_KERNEL_CONFIG_MODE_FIELD]: 'auto',
        nodeTypes: ' Template Node, parser ',
        codeObjectResolverIds: ' resolver.primary , resolver.fallback ',
        [DEPRECATED_RUNTIME_KERNEL_CONFIG_STRICT_NATIVE_FIELD]: true,
      },
      runtimeKernel: {
        [DEPRECATED_RUNTIME_KERNEL_TELEMETRY_MODE_FIELD]: DEPRECATED_RUNTIME_KERNEL_MODE_ALIAS,
        runtimeKernelNodeTypes: ' constant, template ',
        runtimeKernelNodeTypesSource: ' path ',
        runtimeKernelCodeObjectResolverIds: ' resolver.primary , resolver.fallback ',
        [DEPRECATED_RUNTIME_KERNEL_TELEMETRY_STRICT_NATIVE_FIELD]: '1',
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
