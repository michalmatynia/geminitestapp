import { describe, expect, it } from 'vitest';

import { stableStringify } from '@/shared/lib/ai-paths/core/utils';
import { repairRuntimeStatePorts } from '@/features/ai/ai-paths/services/runtime-state-port-repair';
import type { AiPathRunNodeRecord, RuntimeState } from '@/shared/contracts/ai-paths';

const buildRunNode = (patch: Partial<AiPathRunNodeRecord>): AiPathRunNodeRecord =>
  ({
    id: 'node-record-1',
    runId: 'run-1',
    nodeId: 'node-regex-params',
    nodeType: 'regex',
    nodeTitle: 'Regex JSON Extract',
    status: 'completed',
    attempt: 1,
    inputs: {},
    outputs: {},
    errorMessage: null,
    createdAt: '2026-02-23T22:12:42.229Z',
    updatedAt: '2026-02-23T22:12:43.229Z',
    startedAt: '2026-02-23T22:12:42.229Z',
    finishedAt: '2026-02-23T22:12:43.229Z',
    ...patch,
  }) as AiPathRunNodeRecord;

describe('repairRuntimeStatePorts', () => {
  it('fills missing outputs/nodeOutputs ports from run nodes and latest history', () => {
    const state = {
      inputs: {
        'node-regex-params': { value: 'raw-input' },
      },
      outputs: {
        'node-regex-params': { grouped: {}, matches: [] },
      },
      nodeOutputs: {
        'node-regex-params': { grouped: {}, matches: [] },
      },
      history: {
        'node-regex-params': [
          {
            status: 'completed',
            inputs: { value: 'raw-input' },
            outputs: { grouped: {}, matches: [], value: [{ key: 'color', value: 'red' }] },
          },
        ],
      },
    } as unknown as RuntimeState;

    const nodes = [
      buildRunNode({
        inputs: { value: 'raw-input' },
        outputs: { grouped: {}, matches: [], value: [{ key: 'color', value: 'red' }] },
      }),
    ];

    const result = repairRuntimeStatePorts({
      runtimeState: state,
      runNodes: nodes,
    });

    const repairedOutputs = result.runtimeState.outputs?.['node-regex-params'] ?? {};
    const repairedNodeOutputs = result.runtimeState.nodeOutputs?.['node-regex-params'] ?? {};

    expect(result.changed).toBe(true);
    expect(result.counts.outputs).toBeGreaterThan(0);
    expect(result.counts.nodeOutputs).toBeGreaterThan(0);
    expect(repairedOutputs['value']).toEqual([{ key: 'color', value: 'red' }]);
    expect(repairedNodeOutputs['value']).toEqual([{ key: 'color', value: 'red' }]);
    expect(repairedOutputs['matches']).toEqual([]);
  });

  it('does not overwrite existing ports', () => {
    const state = {
      outputs: {
        'node-regex-params': {
          value: 'already-present',
        },
      },
      nodeOutputs: {
        'node-regex-params': {
          value: 'already-present',
        },
      },
      inputs: {},
    } as unknown as RuntimeState;

    const nodes = [
      buildRunNode({
        outputs: { value: 'from-node-record' },
      }),
    ];

    const result = repairRuntimeStatePorts({
      runtimeState: state,
      runNodes: nodes,
    });

    expect(
      (result.runtimeState.outputs?.['node-regex-params'] as Record<string, unknown>)['value']
    ).toBe('already-present');
    expect(
      (result.runtimeState.nodeOutputs?.['node-regex-params'] as Record<string, unknown>)['value']
    ).toBe('already-present');
    expect(result.counts.outputs).toBe(0);
    expect(result.counts.nodeOutputs).toBe(0);
  });

  it('is idempotent on already repaired state', () => {
    const original = {
      inputs: {},
      outputs: {
        'node-regex-params': { grouped: {}, matches: [] },
      },
      nodeOutputs: {
        'node-regex-params': { grouped: {}, matches: [] },
      },
    } as unknown as RuntimeState;

    const nodes = [
      buildRunNode({
        outputs: { grouped: {}, matches: [], value: [{ key: 'color', value: 'red' }] },
      }),
    ];

    const first = repairRuntimeStatePorts({
      runtimeState: original,
      runNodes: nodes,
    });
    const second = repairRuntimeStatePorts({
      runtimeState: first.runtimeState,
      runNodes: nodes,
    });

    expect(first.changed).toBe(true);
    expect(second.changed).toBe(false);
    expect(second.counts.total).toBe(0);
    expect(stableStringify(second.runtimeState)).toBe(stableStringify(first.runtimeState));
  });

  it('recovers missing input ports from run nodes when snapshot inputs are empty', () => {
    const state = {
      status: 'running',
      inputs: {},
      outputs: {},
      nodeOutputs: {},
    } as unknown as RuntimeState;

    const nodes = [
      buildRunNode({
        nodeId: 'node-db-write',
        inputs: {
          entityId: '75fd29f3-8155-437d-af98-f5ee85e78c37',
          value: { description_pl: 'Opis PL' },
          result: { parameters: [{ key: 'material', value: 'metal' }] },
        },
        outputs: { status: 'failed' },
      }),
    ];

    const result = repairRuntimeStatePorts({
      runtimeState: state,
      runNodes: nodes,
    });

    const repairedInputs = result.runtimeState.inputs?.['node-db-write'] as
      | Record<string, unknown>
      | undefined;
    expect(result.changed).toBe(true);
    expect(result.counts.inputs).toBeGreaterThan(0);
    expect(repairedInputs?.['entityId']).toBe('75fd29f3-8155-437d-af98-f5ee85e78c37');
    expect(repairedInputs?.['value']).toEqual({ description_pl: 'Opis PL' });
    expect(repairedInputs?.['result']).toEqual({
      parameters: [{ key: 'material', value: 'metal' }],
    });
  });
});
