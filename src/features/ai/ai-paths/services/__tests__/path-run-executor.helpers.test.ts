import { describe, expect, it } from 'vitest';
import type { RuntimeState } from '@/shared/contracts/ai-paths';

import {
  EMPTY_RUNTIME_STATE,
  parseRuntimeKernelCodeObjectResolverIds,
  parseRuntimeKernelNodeTypes,
  parseRuntimeState,
  resolveRuntimeKernelConfigForRun,
  summarizeRuntimeKernelParityFromHistory,
  toRuntimeKernelExecutionTelemetry,
  toRuntimeNodeResolutionTelemetry,
} from '../path-run-executor.helpers';

describe('parseRuntimeState', () => {
  it('returns empty runtime state for empty input', () => {
    expect(parseRuntimeState(null)).toEqual(EMPTY_RUNTIME_STATE);
  });

  it('rejects legacy runtime identity fields in non-empty payloads', () => {
    expect(() =>
      parseRuntimeState(
        JSON.stringify({
          status: 'running',
          nodeStatuses: {},
          nodeOutputs: {},
          variables: {},
          events: [],
          inputs: {},
          outputs: {},
          runId: 'legacy-run-id',
        })
      )
    ).toThrowError(/AI Paths runtime state payload includes unsupported identity fields\./i);
  });

  it('rejects legacy runtime identity fields nested in runtime events', () => {
    expect(() =>
      parseRuntimeState(
        JSON.stringify({
          status: 'running',
          nodeStatuses: {},
          nodeOutputs: {},
          variables: {},
          events: [
            {
              id: 'evt-1',
              timestamp: '2026-03-03T10:00:00.000Z',
              type: 'status',
              message: 'Run started.',
              runStartedAt: '2026-03-03T10:00:00.000Z',
            },
          ],
          inputs: {},
          outputs: {},
        })
      )
    ).toThrowError(/AI Paths runtime state payload includes unsupported identity fields\./i);
  });

  it('rejects legacy runtime identity fields nested in runtime history entries', () => {
    expect(() =>
      parseRuntimeState(
        JSON.stringify({
          status: 'running',
          nodeStatuses: {},
          nodeOutputs: {},
          variables: {},
          events: [],
          inputs: {},
          outputs: {},
          history: {
            'node-1': [
              {
                timestamp: '2026-03-03T10:00:00.000Z',
                pathId: 'path-1',
                pathName: 'Path 1',
                nodeId: 'node-1',
                nodeType: 'prompt',
                nodeTitle: 'Node 1',
                status: 'completed',
                iteration: 1,
                inputs: {},
                outputs: {},
                inputHash: null,
                runId: 'legacy-run-id',
              },
            ],
          },
        })
      )
    ).toThrowError(/AI Paths runtime state payload includes unsupported identity fields\./i);
  });

  it('accepts canonical runtime payloads with currentRun identity', () => {
    const parsed = parseRuntimeState(
      JSON.stringify({
        status: 'running',
        nodeStatuses: {},
        nodeOutputs: {},
        variables: {},
        events: [],
        inputs: {},
        outputs: {},
        currentRun: {
          id: 'run-1',
          status: 'running',
          startedAt: '2026-03-03T10:00:00.000Z',
          finishedAt: null,
          pathId: 'path-1',
          pathName: 'Path 1',
          createdAt: '2026-03-03T10:00:00.000Z',
          updatedAt: '2026-03-03T10:00:00.000Z',
        },
      })
    );

    expect(parsed.currentRun?.id).toBe('run-1');
    expect(parsed.currentRun?.status).toBe('running');
  });

  it('rejects legacy "cancelled" runtime event status spelling', () => {
    expect(() =>
      parseRuntimeState(
        JSON.stringify({
          status: 'running',
          nodeStatuses: {},
          nodeOutputs: {},
          variables: {},
          events: [
            {
              id: 'evt-1',
              timestamp: '2026-03-03T10:00:00.000Z',
              type: 'status',
              message: 'Node cancelled.',
              status: 'cancelled',
            },
          ],
          inputs: {},
          outputs: {},
        })
      )
    ).toThrowError(/Invalid AI Paths runtime state payload\./i);
  });
});

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
  it('prefers valid env mode over settings mode', () => {
    expect(
      resolveRuntimeKernelConfigForRun({
        envMode: 'auto',
        pathMode: undefined,
        settingMode: 'invalid',
        envNodeTypes: 'constant',
        pathNodeTypes: undefined,
        settingNodeTypes: 'math',
        envResolverIds: 'resolver.primary',
        pathResolverIds: undefined,
        settingResolverIds: 'resolver.secondary',
        envStrictNativeRegistry: undefined,
        pathStrictNativeRegistry: undefined,
        settingStrictNativeRegistry: undefined,
      })
    ).toMatchObject({
      mode: 'auto',
      modeSource: 'env',
      nodeTypes: ['constant'],
      nodeTypesSource: 'env',
      resolverIds: ['resolver.primary'],
      resolverSource: 'env',
      strictNativeRegistry: true,
      strictNativeRegistrySource: 'default',
    });
  });

  it('uses settings mode when env mode is missing', () => {
    expect(
      resolveRuntimeKernelConfigForRun({
        envMode: undefined,
        pathMode: undefined,
        settingMode: 'auto',
        envNodeTypes: undefined,
        pathNodeTypes: undefined,
        settingNodeTypes: undefined,
        envResolverIds: undefined,
        pathResolverIds: undefined,
        settingResolverIds: undefined,
        envStrictNativeRegistry: undefined,
        pathStrictNativeRegistry: undefined,
        settingStrictNativeRegistry: undefined,
      })
    ).toMatchObject({
      mode: 'auto',
      modeSource: 'settings',
      resolverIds: undefined,
      resolverSource: 'default',
      strictNativeRegistry: true,
      strictNativeRegistrySource: 'default',
    });
  });

  it('maps deprecated legacy_only mode to canonical auto mode', () => {
    expect(
      resolveRuntimeKernelConfigForRun({
        envMode: undefined,
        pathMode: undefined,
        settingMode: 'legacy_only',
        envNodeTypes: undefined,
        pathNodeTypes: undefined,
        settingNodeTypes: undefined,
        envResolverIds: undefined,
        pathResolverIds: undefined,
        settingResolverIds: undefined,
        envStrictNativeRegistry: undefined,
        pathStrictNativeRegistry: undefined,
        settingStrictNativeRegistry: undefined,
      })
    ).toMatchObject({
      mode: 'auto',
      modeSource: 'settings',
    });
  });

  it('falls back to default mode and setting node-type list', () => {
    expect(
      resolveRuntimeKernelConfigForRun({
        envMode: 'invalid',
        pathMode: 'invalid',
        settingMode: 'invalid',
        envNodeTypes: '',
        pathNodeTypes: '',
        settingNodeTypes: 'constant, math',
        envResolverIds: '',
        pathResolverIds: '',
        settingResolverIds: 'resolver.primary, resolver.secondary',
        envStrictNativeRegistry: '',
        pathStrictNativeRegistry: '',
        settingStrictNativeRegistry: 'true',
      })
    ).toMatchObject({
      mode: 'auto',
      modeSource: 'default',
      nodeTypes: ['constant', 'math'],
      nodeTypesSource: 'settings',
      resolverIds: ['resolver.primary', 'resolver.secondary'],
      resolverSource: 'settings',
      strictNativeRegistry: true,
      strictNativeRegistrySource: 'settings',
    });
  });

  it('prefers path runtime-kernel config over global settings when env is unset', () => {
    expect(
      resolveRuntimeKernelConfigForRun({
        envMode: undefined,
        pathMode: 'auto',
        settingMode: 'auto',
        envNodeTypes: undefined,
        pathNodeTypes: 'template',
        settingNodeTypes: 'constant, math',
        envResolverIds: undefined,
        pathResolverIds: 'resolver.path',
        settingResolverIds: 'resolver.settings',
        envStrictNativeRegistry: undefined,
        pathStrictNativeRegistry: 'false',
        settingStrictNativeRegistry: 'true',
      })
    ).toMatchObject({
      mode: 'auto',
      modeSource: 'path',
      nodeTypes: ['template'],
      nodeTypesSource: 'path',
      resolverIds: ['resolver.path'],
      resolverSource: 'path',
      strictNativeRegistry: false,
      strictNativeRegistrySource: 'path',
    });
  });

});

describe('runtime kernel telemetry helpers', () => {
  it('serializes runtime kernel execution telemetry context', () => {
    expect(
      toRuntimeKernelExecutionTelemetry({
        mode: 'auto',
        modeSource: 'settings',
        nodeTypes: ['constant', 'template'],
        nodeTypesSource: 'env',
        resolverIds: ['resolver.primary'],
        resolverSource: 'settings',
        strictNativeRegistry: true,
        strictNativeRegistrySource: 'env',
      })
    ).toEqual({
      runtimeKernelMode: 'auto',
      runtimeKernelModeSource: 'settings',
      runtimeKernelNodeTypes: ['constant', 'template'],
      runtimeKernelNodeTypesSource: 'env',
      runtimeKernelCodeObjectResolverIds: ['resolver.primary'],
      runtimeKernelCodeObjectResolverIdsSource: 'settings',
      runtimeKernelStrictNativeRegistry: true,
      runtimeKernelStrictNativeRegistrySource: 'env',
    });
  });

  it('normalizes runtime node resolution telemetry payloads', () => {
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
          runtimeStrategy: 'legacy_adapter',
          runtimeResolutionSource: 'registry',
          runtimeCodeObjectId: null,
        },
      ],
      'node-math': [
        {
          runtimeStrategy: 'legacy_adapter',
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
        legacy_adapter: 2,
        code_object_v3: 1,
        unknown: 1,
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
