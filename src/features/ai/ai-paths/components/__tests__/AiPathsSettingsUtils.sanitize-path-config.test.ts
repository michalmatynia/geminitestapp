import { describe, expect, it } from 'vitest';
import { HISTORICAL_RUNTIME_COMPATIBILITY_ALIAS } from '@/dev/ai-paths-runtime-compatibility-normalization';

import {
  buildPersistedRuntimeState,
  parseRuntimeState,
  sanitizePathConfig,
} from '@/features/ai/ai-paths/components/AiPathsSettingsUtils';
import type { AiNode, Edge, PathConfig, RuntimeState } from '@/shared/contracts/ai-paths';
import { createDefaultPathConfig } from '@/shared/lib/ai-paths';
import { palette } from '@/shared/lib/ai-paths/core/definitions';
import { resolveNodeTypeId } from '@/shared/lib/ai-paths/core/utils/node-identity';

const buildNode = (patch: Partial<AiNode>): AiNode => {
  const baseNode = createDefaultPathConfig('path-node-fixture').nodes[0] as AiNode;
  const nextId = typeof patch.id === 'string' ? patch.id : baseNode.id;
  return {
    ...baseNode,
    ...patch,
    id: nextId,
    instanceId: typeof patch.instanceId === 'string' ? patch.instanceId : nextId,
    nodeTypeId:
      typeof patch.nodeTypeId === 'string'
        ? patch.nodeTypeId
        : resolveNodeTypeId(
            {
              ...baseNode,
              ...patch,
              id: nextId,
            } as AiNode,
            palette
        ),
  } as AiNode;
};

const buildConfig = (edges: Edge[]): PathConfig => {
  const config = createDefaultPathConfig('path-1');
  return {
    ...config,
    edges,
  };
};

describe('sanitizePathConfig', () => {
  it('rejects dangling and incompatible edges instead of dropping them', () => {
    const config = createDefaultPathConfig('path-invalid-edges');
    const fromNode = config.nodes[0]!;
    const toNode = config.nodes[1]!;
    config.edges = [
      {
        id: 'edge-valid',
        from: fromNode.id,
        to: toNode.id,
        fromPort: 'entityJson',
        toPort: 'entityJson',
      },
      {
        id: 'edge-dangling',
        from: fromNode.id,
        to: 'missing-node',
        fromPort: 'entityJson',
        toPort: 'entityJson',
      },
      {
        id: 'edge-invalid-port',
        from: fromNode.id,
        to: toNode.id,
        fromPort: 'unknown',
        toPort: 'entityJson',
      },
    ];

    expect(() => sanitizePathConfig(config)).toThrowError(/invalid or non-canonical edges/i);
  });

  it('keeps already canonical edges unchanged', () => {
    const config = createDefaultPathConfig('path-canonical-edges');
    const fromNode = config.nodes[0]!;
    const toNode = config.nodes[1]!;
    config.edges = [
      {
        id: 'edge-valid',
        from: fromNode.id,
        to: toNode.id,
        fromPort: 'entityJson',
        toPort: 'entityJson',
      },
    ];

    const sanitized = sanitizePathConfig(config);

    expect(sanitized.edges).toHaveLength(1);
    expect(sanitized.edges[0]).toMatchObject(config.edges[0] as Edge);
  });

  it('rejects alias-only edge fields instead of accepting legacy edge shape', () => {
    const config = createDefaultPathConfig('path-alias-only-edge-shape');
    const fromNode = config.nodes[0]!;
    const toNode = config.nodes[1]!;
    config.edges = [
      {
        id: 'edge-legacy-alias-shape',
        source: fromNode.id,
        target: toNode.id,
        sourceHandle: 'entityJson',
        targetHandle: 'entityJson',
      },
    ] as unknown as Edge[];

    expect(() => sanitizePathConfig(config)).toThrowError(/invalid or non-canonical edges/i);
  });

  it('rejects legacy trigger data ports instead of migrating them', () => {
    const config = {
      ...buildConfig([
        {
          id: 'edge-trigger-parser-context',
          from: 'node-111111111111111111111111',
          to: 'node-222222222222222222222222',
          fromPort: 'context',
          toPort: 'context',
        },
        {
          id: 'edge-trigger-parser-entity',
          from: 'node-111111111111111111111111',
          to: 'node-222222222222222222222222',
          fromPort: 'entityId',
          toPort: 'entityId',
        },
      ]),
      nodes: [
        buildNode({
          id: 'node-111111111111111111111111',
          type: 'trigger',
          title: 'Trigger',
          inputs: [],
          outputs: ['trigger', 'triggerName', 'context', 'meta', 'entityId', 'entityType'],
        }),
        buildNode({
          id: 'node-222222222222222222222222',
          type: 'parser',
          title: 'Parser',
          inputs: ['context', 'entityId'],
          outputs: ['value'],
        }),
      ],
      uiState: {
        selectedNodeId: 'node-111111111111111111111111',
      },
    } as PathConfig;

    expect(() => sanitizePathConfig(config)).toThrowError(
      /AI Path config contains unsupported trigger (output ports|data edges)\./i
    );
  });

  it('rejects unsupported database schemaSnapshot in path configs', () => {
    const config = createDefaultPathConfig('path-db-schema-snapshot');
    config.nodes = config.nodes.map(
      (node: AiNode): AiNode =>
        node.type === 'database'
          ? {
            ...node,
            config: {
              ...(node.config ?? {}),
              database: {
                operation: 'query',
                schemaSnapshot: {
                  collections: [],
                  sources: {},
                },
              },
            },
          }
          : node
    );

    expect(() => sanitizePathConfig(config)).toThrowError(
      /(?:unsupported|deprecated) database schemaSnapshot/i
    );
  });

  it('rejects unsupported database query provider "all" in path configs', () => {
    const config = createDefaultPathConfig('path-db-provider-all');
    config.nodes = config.nodes.map(
      (node: AiNode): AiNode =>
        node.type === 'database'
          ? {
            ...node,
            config: {
              ...(node.config ?? {}),
              database: {
                operation: 'query',
                query: {
                  provider: 'all',
                },
              },
            },
          }
          : node
    );

    expect(() => sanitizePathConfig(config)).toThrowError(
      /(?:unsupported|deprecated) database query provider "all"/i
    );
  });

  it('rejects deprecated parameter inference target path aliases in path configs', () => {
    const config = createDefaultPathConfig('path-parameter-target-alias');
    config.nodes = config.nodes.map(
      (node: AiNode): AiNode =>
        node.type === 'database'
          ? {
            ...node,
            config: {
              ...(node.config ?? {}),
              database: {
                operation: 'update',
                parameterInferenceGuard: {
                  enabled: true,
                  targetPath: 'simpleParameters',
                },
              },
            },
          }
          : node
    );

    expect(() => sanitizePathConfig(config)).toThrowError(
      /(?:unsupported|deprecated) parameter inference target path/i
    );
  });

  it('rejects legacy node identity repair candidates instead of backfilling them', () => {
    const config = createDefaultPathConfig('path-legacy-node-identities');
    config.nodes = config.nodes.map(
      (node: AiNode, index: number): AiNode =>
        index === 0
          ? {
            ...node,
            instanceId: undefined,
          }
          : node
    );

    expect(() => sanitizePathConfig(config)).toThrowError(
      /(?:unsupported|legacy) node identities/i
    );
  });

  it.each([
    {
      nodeType: 'description_updater',
      title: 'Description Updater',
      pathId: 'path-legacy-description-updater',
      expectedMessage: /Database node/i,
    },
  ])(
    'rejects removed legacy $nodeType nodes with a targeted error',
    ({ nodeType, title, pathId, expectedMessage }) => {
      const config = createDefaultPathConfig(pathId);
      config.nodes = config.nodes.map(
        (node: AiNode, index: number): AiNode =>
          index === 0
            ? ({
                ...node,
                type: nodeType,
                title,
              } as unknown as AiNode)
            : node
      );

      expect(() => sanitizePathConfig(config)).toThrowError(/removed legacy node/i);
      expect(() => sanitizePathConfig(config)).toThrowError(expectedMessage);
    }
  );

  it('backfills missing node createdAt/updatedAt timestamps', () => {
    const config = createDefaultPathConfig('path-missing-node-timestamps');
    const [firstNode, ...restNodes] = config.nodes;
    expect(firstNode).toBeDefined();
    config.nodes = [
      {
        ...(firstNode as AiNode),
        createdAt: undefined as unknown as string,
        updatedAt: undefined as unknown as string | null,
      },
      ...restNodes,
    ];

    const sanitized = sanitizePathConfig(config);
    const sanitizedNode = sanitized.nodes.find(
      (node: AiNode): boolean => node.id === (firstNode as AiNode).id
    );
    expect(sanitizedNode).toBeDefined();
    expect(typeof sanitizedNode?.createdAt).toBe('string');
    expect((sanitizedNode?.createdAt ?? '').length).toBeGreaterThan(0);
    expect(sanitizedNode?.updatedAt).toBeNull();
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

  it('rejects legacy runtime identity fields in runtime state payloads', () => {
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

  it('rejects nested legacy runtime identity fields in runtime state payloads', () => {
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
    ).toThrowError(/AI Paths runtime state payload includes unsupported identity fields\./i);
  });

  it('rejects legacy runtime identity fields while sanitizing path configs', () => {
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
      /AI Paths runtime state payload includes unsupported identity fields\./i
    );
  });

  it('rejects historical legacy runtime strategies inside runtime history', () => {
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
                nodeType: 'template',
                nodeTitle: 'Node 1',
                status: 'completed',
                iteration: 1,
                inputs: {},
                outputs: {},
                inputHash: null,
                runtimeStrategy: HISTORICAL_RUNTIME_COMPATIBILITY_ALIAS,
                runtimeResolutionSource: 'registry',
                runtimeCodeObjectId: null,
              },
            ],
          },
        })
      )
    ).toThrowError(/Invalid AI Paths runtime state payload\./i);
  });

  it('rejects malformed runtime payloads while sanitizing path configs', () => {
    const config = {
      ...buildConfig([]),
      runtimeState: JSON.stringify({
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
      }),
    } as PathConfig;

    expect(() => sanitizePathConfig(config)).toThrowError(
      /Invalid AI Paths runtime state payload\./i
    );
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
