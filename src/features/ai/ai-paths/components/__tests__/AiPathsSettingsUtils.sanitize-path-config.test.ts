import { describe, expect, it } from 'vitest';

import {
  buildPersistedRuntimeState,
  parseRuntimeState,
  sanitizePathConfig,
} from '@/features/ai/ai-paths/components/AiPathsSettingsUtils';
import type { AiNode, Edge, PathConfig, RuntimeState } from '@/shared/contracts/ai-paths';

const buildNode = (patch: Partial<AiNode>): AiNode =>
  ({
    id: 'node',
    type: 'viewer',
    title: 'Node',
    description: '',
    inputs: [],
    outputs: [],
    position: { x: 0, y: 0 },
    data: {},
    ...patch,
  }) as AiNode;

const buildConfig = (edges: Edge[]): PathConfig =>
  ({
    id: 'path-1',
    version: 1,
    name: 'Path 1',
    description: '',
    trigger: 'manual',
    updatedAt: new Date().toISOString(),
    nodes: [
      buildNode({
        id: 'node-6bb64bd12ced85746705fc69',
        type: 'mapper',
        title: 'Mapper',
        inputs: ['context'],
        outputs: ['value'],
      }),
      buildNode({
        id: 'node-837e17bdcefe87fe18d92cd5',
        type: 'compare',
        title: 'Compare',
        inputs: ['value'],
        outputs: ['valid'],
      }),
    ],
    edges,
  }) as PathConfig;

describe('sanitizePathConfig', () => {
  it('drops dangling edges and rewires compatible edge ports', () => {
    const config = buildConfig([
      {
        id: 'edge-valid',
        from: 'node-6bb64bd12ced85746705fc69',
        to: 'node-837e17bdcefe87fe18d92cd5',
        fromPort: 'value',
        toPort: 'value',
      },
      {
        id: 'edge-dangling',
        from: 'node-6bb64bd12ced85746705fc69',
        to: 'missing-node',
        fromPort: 'value',
        toPort: 'value',
      },
      {
        id: 'edge-rewire',
        from: 'node-6bb64bd12ced85746705fc69',
        to: 'node-837e17bdcefe87fe18d92cd5',
        fromPort: 'unknown',
        toPort: 'value',
      },
    ]);

    const sanitized = sanitizePathConfig(config);

    expect(sanitized.edges).toHaveLength(1);
    expect(sanitized.edges.find((edge: Edge) => edge.id === 'edge-dangling')).toBeUndefined();
    expect(sanitized.edges.find((edge: Edge) => edge.id === 'edge-rewire')).toBeUndefined();
  });

  it('keeps already canonical edges unchanged', () => {
    const config = buildConfig([
      {
        id: 'edge-valid',
        from: 'node-6bb64bd12ced85746705fc69',
        to: 'node-837e17bdcefe87fe18d92cd5',
        fromPort: 'value',
        toPort: 'value',
      },
    ]);

    const sanitized = sanitizePathConfig(config);

    expect(sanitized.edges).toHaveLength(1);
    expect(sanitized.edges[0]).toMatchObject(config.edges[0] as Edge);
  });

  it('rejects legacy trigger data ports instead of migrating them', () => {
    const config = {
      ...buildConfig([
        {
          id: 'edge-trigger-parser-context',
          from: 'node-trigger-111111111111111111111111',
          to: 'node-parser-111111111111111111111111',
          fromPort: 'context',
          toPort: 'context',
        },
        {
          id: 'edge-trigger-parser-entity',
          from: 'node-trigger-111111111111111111111111',
          to: 'node-parser-111111111111111111111111',
          fromPort: 'entityId',
          toPort: 'entityId',
        },
      ]),
      nodes: [
        buildNode({
          id: 'node-trigger-111111111111111111111111',
          type: 'trigger',
          title: 'Trigger',
          inputs: [],
          outputs: ['trigger', 'triggerName', 'context', 'meta', 'entityId', 'entityType'],
        }),
        buildNode({
          id: 'node-parser-111111111111111111111111',
          type: 'parser',
          title: 'Parser',
          inputs: ['context', 'entityId'],
          outputs: ['value'],
        }),
      ],
    } as PathConfig;

    expect(() => sanitizePathConfig(config)).toThrowError(
      /Legacy AI Paths trigger data (outputs|edges) are no longer supported/i
    );
  });

  it('preserves shared object-backed ports when persisting runtime state', () => {
    const sharedValue = {
      color: 'red',
    };
    const runtimeState = {
      currentRun: {
        id: 'run-1',
        status: 'running',
        startedAt: '2026-03-03T10:00:00.000Z',
        finishedAt: null,
        pathId: 'path-1',
        pathName: 'Path 1',
        createdAt: '2026-03-03T10:00:00.000Z',
        updatedAt: '2026-03-03T10:01:00.000Z',
        result: { ignored: true },
      },
      inputs: {
        'node-6bb64bd12ced85746705fc69': {
          value: sharedValue,
        },
      },
      outputs: {
        'node-6bb64bd12ced85746705fc69': {
          value: sharedValue,
        },
        'node-837e17bdcefe87fe18d92cd5': {
          value: sharedValue,
        },
      },
    } as unknown as RuntimeState;

    const persisted = buildPersistedRuntimeState(runtimeState, [
      buildNode({ id: 'node-6bb64bd12ced85746705fc69', type: 'mapper', outputs: ['value'] }),
      buildNode({ id: 'node-837e17bdcefe87fe18d92cd5', type: 'compare', outputs: ['value'] }),
    ]);
    const parsed = JSON.parse(persisted) as Record<string, unknown>;
    const inputs = parsed['inputs'] as Record<string, Record<string, unknown>>;
    const outputs = parsed['outputs'] as Record<string, Record<string, unknown>>;
    const currentRun = parsed['currentRun'] as Record<string, unknown>;

    expect(inputs['node-6bb64bd12ced85746705fc69']?.['value']).toEqual(sharedValue);
    expect(outputs['node-6bb64bd12ced85746705fc69']?.['value']).toEqual(sharedValue);
    expect(outputs['node-837e17bdcefe87fe18d92cd5']?.['value']).toEqual(sharedValue);
    expect(parsed).not.toHaveProperty('runId');
    expect(parsed).not.toHaveProperty('runStartedAt');
    expect(currentRun).toMatchObject({
      id: 'run-1',
      status: 'running',
      startedAt: '2026-03-03T10:00:00.000Z',
      pathId: 'path-1',
      pathName: 'Path 1',
    });
    expect(currentRun).not.toHaveProperty('result');
  });

  it('rejects legacy runtime identity fields', () => {
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
          runStartedAt: '2026-03-03T10:00:00.000Z',
        })
      )
    ).toThrowError(/Legacy AI Paths runtime identity fields are no longer supported/i);
  });

  it('rejects legacy runtime identity fields nested in events and history entries', () => {
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
              runId: 'legacy-run-id',
            },
          ],
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
                runStartedAt: '2026-03-03T10:00:00.000Z',
              },
            ],
          },
          inputs: {},
          outputs: {},
        })
      )
    ).toThrowError(/Legacy AI Paths runtime identity fields are no longer supported/i);
  });

  it('rejects path configs with legacy runtime identity fields', () => {
    const config = {
      ...buildConfig([]),
      runtimeState: JSON.stringify({
        status: 'idle',
        nodeStatuses: {},
        nodeOutputs: {},
        variables: {},
        events: [],
        inputs: {},
        outputs: {},
        runId: 'legacy-run-id',
        runStartedAt: '2026-03-03T10:00:00.000Z',
      }),
    } as PathConfig;

    expect(() => sanitizePathConfig(config)).toThrowError(
      /Legacy AI Paths runtime identity fields are no longer supported/i
    );
  });

  it('rejects legacy runtime identity fields nested inside runtime events', () => {
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
              runId: 'legacy-run-id',
            },
          ],
          inputs: {},
          outputs: {},
        })
      )
    ).toThrowError(/Legacy AI Paths runtime identity fields are no longer supported/i);
  });

  it('rejects legacy runtime identity fields nested inside runtime history entries', () => {
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
                runStartedAt: '2026-03-03T10:00:00.000Z',
              },
            ],
          },
        })
      )
    ).toThrowError(/Legacy AI Paths runtime identity fields are no longer supported/i);
  });

  it('rejects legacy "cancelled" status spelling in runtime events', () => {
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
