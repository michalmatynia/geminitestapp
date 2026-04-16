import { describe, expect, it } from 'vitest';
import type { RuntimeState } from '@/shared/contracts/ai-paths';

import {
  matchesRuntimeKernelExecutionTelemetryFromMeta,
  matchesRuntimeKernelExecutionTelemetryRecord,
  parseRuntimeKernelCodeObjectResolverIds,
  parseRuntimeKernelExecutionTelemetryRecord,
  parseRuntimeKernelNodeTypes,
  readRuntimeKernelConfigRecordFromMeta,
  readRuntimeKernelExecutionTelemetryFromMeta,
  resolveRuntimeKernelConfigForRun,
  summarizeRuntimeKernelParityFromHistory,
  toRuntimeKernelExecutionTelemetry,
  toRuntimeNodeResolutionTelemetry,
} from '../path-run-executor.runtime-kernel';

describe('parseRuntimeKernelNodeTypes', () => {
  it('parses comma-delimited values', () => {
    expect(parseRuntimeKernelNodeTypes(' constant, math ,template ')).toEqual([
      'constant',
      'math',
      'template',
    ]);
  });

  it('parses JSON arrays and normalizes values', () => {
    expect(parseRuntimeKernelNodeTypes('["Template Node","math"," "]')).toEqual([
      'template_node',
      'math',
    ]);
  });

  it('returns undefined for empty or invalid inputs', () => {
    expect(parseRuntimeKernelNodeTypes('')).toBeUndefined();
    expect(parseRuntimeKernelNodeTypes('[]')).toBeUndefined();
    expect(parseRuntimeKernelNodeTypes(null)).toBeUndefined();
  });
});

describe('parseRuntimeKernelCodeObjectResolverIds', () => {
  it('parses comma-delimited resolver ids', () => {
    expect(
      parseRuntimeKernelCodeObjectResolverIds(' resolver.primary ,resolver.fallback ')
    ).toEqual(['resolver.primary', 'resolver.fallback']);
  });

  it('parses JSON arrays and trims values', () => {
    expect(
      parseRuntimeKernelCodeObjectResolverIds('["resolver.alpha"," resolver.beta ",""]')
    ).toEqual(['resolver.alpha', 'resolver.beta']);
  });

  it('returns undefined for empty or invalid inputs', () => {
    expect(parseRuntimeKernelCodeObjectResolverIds('')).toBeUndefined();
    expect(parseRuntimeKernelCodeObjectResolverIds('[]')).toBeUndefined();
    expect(parseRuntimeKernelCodeObjectResolverIds(null)).toBeUndefined();
  });
});

describe('resolveRuntimeKernelConfigForRun', () => {
  it('pins runtime-kernel mode to canonical auto/default while honoring env overrides', () => {
    expect(
      resolveRuntimeKernelConfigForRun({
        envNodeTypes: 'constant',
        pathNodeTypes: undefined,
        settingNodeTypes: 'math',
        envResolverIds: 'resolver.primary',
        pathResolverIds: undefined,
        settingResolverIds: 'resolver.secondary',
      })
    ).toMatchObject({
      nodeTypes: ['constant'],
      nodeTypesSource: 'env',
      resolverIds: ['resolver.primary'],
      resolverSource: 'env',
    });
  });

  it('falls back to default mode and canonical settings values', () => {
    expect(
      resolveRuntimeKernelConfigForRun({
        envNodeTypes: '',
        pathNodeTypes: '',
        settingNodeTypes: 'constant, math',
        envResolverIds: '',
        pathResolverIds: '',
        settingResolverIds: 'resolver.primary, resolver.secondary',
      })
    ).toMatchObject({
      nodeTypes: ['constant', 'math'],
      nodeTypesSource: 'settings',
      resolverIds: ['resolver.primary', 'resolver.secondary'],
      resolverSource: 'settings',
    });
  });

  it('prefers path runtime-kernel config over global settings when env is unset and pins strict-native behavior on', () => {
    expect(
      resolveRuntimeKernelConfigForRun({
        envNodeTypes: undefined,
        pathNodeTypes: 'template',
        settingNodeTypes: 'constant, math',
        envResolverIds: undefined,
        pathResolverIds: 'resolver.path',
        settingResolverIds: 'resolver.settings',
      })
    ).toMatchObject({
      nodeTypes: ['template'],
      nodeTypesSource: 'path',
      resolverIds: ['resolver.path'],
      resolverSource: 'path',
    });
  });
});

describe('runtime kernel telemetry helpers', () => {
  it('serializes runtime kernel execution telemetry context', () => {
    expect(
      toRuntimeKernelExecutionTelemetry({
        nodeTypes: ['constant', 'template'],
        nodeTypesSource: 'env',
        resolverIds: ['resolver.primary'],
        resolverSource: 'settings',
      })
    ).toEqual({
      runtimeKernelNodeTypes: ['constant', 'template'],
      runtimeKernelNodeTypesSource: 'env',
      runtimeKernelCodeObjectResolverIds: ['resolver.primary'],
      runtimeKernelCodeObjectResolverIdsSource: 'settings',
    });
  });

  it('parses canonical runtime kernel execution telemetry records', () => {
    expect(
      parseRuntimeKernelExecutionTelemetryRecord({
        runtimeKernelNodeTypes: [' constant ', 'template'],
        runtimeKernelNodeTypesSource: 'env',
        runtimeKernelCodeObjectResolverIds: [' resolver.primary ', 'resolver.fallback'],
        runtimeKernelCodeObjectResolverIdsSource: 'settings',
      })
    ).toEqual({
      runtimeKernelNodeTypes: ['constant', 'template'],
      runtimeKernelNodeTypesSource: 'env',
      runtimeKernelCodeObjectResolverIds: ['resolver.primary', 'resolver.fallback'],
      runtimeKernelCodeObjectResolverIdsSource: 'settings',
    });
  });

  it('requires fully canonical runtime kernel execution telemetry records', () => {
    expect(
      parseRuntimeKernelExecutionTelemetryRecord({
        runtimeKernelNodeTypes: ['constant'],
        runtimeKernelNodeTypesSource: 'invalid',
        runtimeKernelCodeObjectResolverIds: ['resolver.primary'],
        runtimeKernelCodeObjectResolverIdsSource: 'settings',
      })
    ).toBeNull();
  });

  it('compares canonical runtime kernel execution telemetry records', () => {
    expect(
      matchesRuntimeKernelExecutionTelemetryRecord(
        {
          runtimeKernelNodeTypes: [' constant ', 'template'],
          runtimeKernelNodeTypesSource: 'env',
          runtimeKernelCodeObjectResolverIds: [' resolver.primary '],
          runtimeKernelCodeObjectResolverIdsSource: 'settings',
        },
        {
          runtimeKernelNodeTypes: ['constant', 'template'],
          runtimeKernelNodeTypesSource: 'env',
          runtimeKernelCodeObjectResolverIds: ['resolver.primary'],
          runtimeKernelCodeObjectResolverIdsSource: 'settings',
        }
      )
    ).toBe(true);

    expect(
      matchesRuntimeKernelExecutionTelemetryRecord(
        {
          runtimeKernelNodeTypes: ['constant'],
          runtimeKernelNodeTypesSource: 'path',
          runtimeKernelCodeObjectResolverIds: ['resolver.primary'],
          runtimeKernelCodeObjectResolverIdsSource: 'settings',
        },
        {
          runtimeKernelNodeTypes: ['constant', 'template'],
          runtimeKernelNodeTypesSource: 'env',
          runtimeKernelCodeObjectResolverIds: ['resolver.primary'],
          runtimeKernelCodeObjectResolverIdsSource: 'settings',
        }
      )
    ).toBe(false);
  });

  it('reads runtime kernel sections from run meta records', () => {
    const meta = {
      runtimeKernelConfig: {
        nodeTypes: ['constant'],
        codeObjectResolverIds: ['resolver.primary'],
      },
      runtimeKernel: {
        runtimeKernelNodeTypes: ['constant'],
        runtimeKernelNodeTypesSource: 'settings',
        runtimeKernelCodeObjectResolverIds: ['resolver.primary'],
        runtimeKernelCodeObjectResolverIdsSource: 'settings',
      },
    } satisfies Record<string, unknown>;

    expect(readRuntimeKernelConfigRecordFromMeta(meta)).toEqual(meta.runtimeKernelConfig);
    expect(readRuntimeKernelExecutionTelemetryFromMeta(meta)).toEqual(meta.runtimeKernel);
    expect(matchesRuntimeKernelExecutionTelemetryFromMeta(meta, meta.runtimeKernel)).toBe(true);
    expect(
      matchesRuntimeKernelExecutionTelemetryFromMeta({ runtimeKernel: {} }, meta.runtimeKernel)
    ).toBe(false);
  });

  it('normalizes runtime node resolution telemetry payloads', () => {
    expect(
      toRuntimeNodeResolutionTelemetry({
        runtimeStrategy: 'legacy_mode',
        runtimeResolutionSource: 'registry',
        runtimeCodeObjectId: null,
      })
    ).toEqual({
      runtimeResolutionSource: 'registry',
      runtimeCodeObjectId: null,
    });

    expect(
      toRuntimeNodeResolutionTelemetry({
        runtimeStrategy: 'code_object_v3',
        runtimeResolutionSource: 'override',
        runtimeCodeObjectId: ' ai-paths.node-code-object.template.v3 ',
      })
    ).toEqual({
      runtimeStrategy: 'code_object_v3',
      runtimeResolutionSource: 'override',
      runtimeCodeObjectId: 'ai-paths.node-code-object.template.v3',
    });

    expect(
      toRuntimeNodeResolutionTelemetry({
        runtimeStrategy: 'unsupported',
        runtimeResolutionSource: 'invalid',
        runtimeCodeObjectId: '',
      })
    ).toEqual({});
  });

  it('summarizes runtime kernel parity from runtime history entries', () => {
    const summary = summarizeRuntimeKernelParityFromHistory({
      'node-template': [
        {
          runtimeStrategy: 'code_object_v3',
          runtimeResolutionSource: 'override',
          runtimeCodeObjectId: 'ai-paths.node-code-object.template.v3',
        },
        {
          runtimeStrategy: 'legacy_mode',
          runtimeResolutionSource: 'registry',
          runtimeCodeObjectId: null,
        },
      ],
      'node-math': [
        {
          runtimeStrategy: 'legacy_mode',
          runtimeResolutionSource: 'missing',
          runtimeCodeObjectId: '',
        },
        {
          runtimeStrategy: 'invalid',
          runtimeResolutionSource: 'invalid',
        },
      ],
    } as RuntimeState['history']);
expect(summary).toEqual({
  sampledHistoryEntries: 4,
  strategyCounts: {
    code_object_v3: 1,
    unknown: 3,
  },
  resolutionSourceCounts: {
    override: 1,
    registry: 1,
    missing: 1,
    unknown: 1,
  },
  codeObjectIds: ['ai-paths.node-code-object.template.v3'],
});

  });
});
