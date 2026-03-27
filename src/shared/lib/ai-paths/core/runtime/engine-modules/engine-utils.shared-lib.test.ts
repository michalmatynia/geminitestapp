import { describe, expect, it } from 'vitest';

import type { AiNode, Edge } from '@/shared/contracts/ai-paths';

import {
  buildInputLinks,
  buildOutputLinks,
  buildWaitingOnDetails,
  checkContextMatchesSimulation,
  collectNodeInputs,
  evaluateInputReadiness,
  hasMeaningfulValue,
  hasValuableSimulationContext,
  isSimulationCapableFetcher,
  orderNodesByDependencies,
  pickString,
  readEntityIdFromContext,
  readEntityTypeFromContext,
  resolveMissingInputStatus,
} from '@/shared/lib/ai-paths/core/runtime/engine-modules/engine-utils';

const buildNode = (overrides: Partial<AiNode> = {}): AiNode =>
  ({
    id: 'node-1',
    type: 'prompt',
    title: 'Node 1',
    description: '',
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
    data: {},
    config: {},
    ...overrides,
  }) as AiNode;

describe('engine-utils shared-lib behavior', () => {
  it('covers string and simulation context helpers', () => {
    expect(pickString('  hello  ')).toBe('hello');
    expect(pickString('   ')).toBeUndefined();

    expect(readEntityTypeFromContext({ entityType: 'product' })).toBe('product');
    expect(readEntityTypeFromContext({ productId: 'prod-1' })).toBe('product');
    expect(readEntityTypeFromContext({})).toBeNull();

    expect(readEntityIdFromContext({ productId: 'prod-1', entityId: 'entity-1' })).toBe('prod-1');
    expect(readEntityIdFromContext({ entityId: 'entity-1' })).toBe('entity-1');
    expect(readEntityIdFromContext({})).toBeNull();

    expect(checkContextMatchesSimulation({ contextSource: ' simulation_preview ' })).toBe(true);
    expect(checkContextMatchesSimulation({ source: 'simulation' })).toBe(true);
    expect(checkContextMatchesSimulation({ source: 'manual' })).toBe(false);

    expect(hasValuableSimulationContext({ entityType: 'product', entityId: 'prod-1' })).toBe(true);
    expect(hasValuableSimulationContext({ entityType: 'product' })).toBe(false);

    expect(
      isSimulationCapableFetcher(
        buildNode({ type: 'fetcher', config: { fetcher: { sourceMode: 'simulation_id' } } })
      )
    ).toBe(true);
    expect(
      isSimulationCapableFetcher(
        buildNode({ type: 'fetcher', config: { fetcher: { sourceMode: 'live_then_simulation' } } })
      )
    ).toBe(true);
    expect(
      isSimulationCapableFetcher(
        buildNode({ type: 'fetcher', config: { fetcher: { sourceMode: 'live' } } })
      )
    ).toBe(false);
    expect(isSimulationCapableFetcher(buildNode({ type: 'prompt' }))).toBe(false);

    expect(hasMeaningfulValue(' text ')).toBe(true);
    expect(hasMeaningfulValue('   ')).toBe(false);
    expect(hasMeaningfulValue([])).toBe(false);
    expect(hasMeaningfulValue([1])).toBe(true);
    expect(hasMeaningfulValue({})).toBe(false);
    expect(hasMeaningfulValue({ ok: true })).toBe(true);
  });

  it('orders nodes by dependencies and appends cyclic leftovers', () => {
    const a = buildNode({ id: 'a', title: 'A' });
    const b = buildNode({ id: 'b', title: 'B' });
    const c = buildNode({ id: 'c', title: 'C' });

    const ordered = orderNodesByDependencies(
      [a, b, c],
      [
        { id: 'edge-1', from: 'a', to: 'b' } as Edge,
        { id: 'edge-2', from: 'b', to: 'c' } as Edge,
      ]
    );
    expect(ordered.map((node) => node.id)).toEqual(['a', 'b', 'c']);

    const cyclic = orderNodesByDependencies(
      [a, b],
      [
        { id: 'edge-1', from: 'a', to: 'b' } as Edge,
        { id: 'edge-2', from: 'b', to: 'a' } as Edge,
      ]
    );
    expect(cyclic.map((node) => node.id)).toEqual(['a', 'b']);
  });

  it('builds input and output history links only for present values', () => {
    const fromNode = buildNode({ id: 'from-node', type: 'prompt', title: 'Prompt Node' });
    const toNode = buildNode({ id: 'to-node', type: 'model', title: 'Model Node' });
    const edges = [
      {
        id: 'edge-1',
        from: 'from-node',
        to: 'to-node',
        fromPort: 'prompt',
        toPort: 'prompt',
      } as Edge,
      {
        id: 'edge-2',
        from: 'to-node',
        to: 'sink-node',
        fromPort: 'result',
        toPort: 'value',
      } as Edge,
    ];
    const nodeById = new Map([
      ['from-node', fromNode],
      ['to-node', toNode],
      ['sink-node', buildNode({ id: 'sink-node', type: 'http', title: 'Sink' })],
    ]);

    expect(
      buildInputLinks('to-node', edges, nodeById, {
        prompt: 'hello',
      })
    ).toEqual([
      {
        nodeId: 'from-node',
        nodeType: 'prompt',
        nodeTitle: 'Prompt Node',
        fromPort: 'prompt',
        toPort: 'prompt',
      },
    ]);
    expect(buildInputLinks('to-node', edges, nodeById, {})).toEqual([]);

    expect(
      buildOutputLinks('to-node', edges, nodeById, {
        result: 'done',
      })
    ).toEqual([
      {
        nodeId: 'sink-node',
        nodeType: 'http',
        nodeTitle: 'Sink',
        fromPort: 'result',
        toPort: 'value',
      },
    ]);
    expect(buildOutputLinks('to-node', edges, nodeById, {})).toEqual([]);
  });

  it('builds waiting details and missing-input statuses from upstream nodes', () => {
    const upstreamPrompt = buildNode({ id: 'prompt-node', type: 'prompt', title: 'Prompt' });
    const upstreamPoll = buildNode({ id: 'poll-node', type: 'poll', title: 'Poll' });
    const nodeById = new Map([
      ['prompt-node', upstreamPrompt],
      ['poll-node', upstreamPoll],
    ]);
    const incoming = [
      {
        id: 'edge-1',
        from: 'prompt-node',
        to: 'model-node',
        fromPort: 'prompt',
        toPort: 'prompt',
      } as Edge,
      {
        id: 'edge-2',
        from: 'poll-node',
        to: 'model-node',
        fromPort: 'result',
        toPort: 'context',
      } as Edge,
    ];

    const details = buildWaitingOnDetails(
      buildNode({ id: 'model-node', type: 'model' }),
      new Set(['prompt', 'context']),
      incoming,
      nodeById,
      (id) => (id === 'prompt-node' ? 'blocked' : 'running'),
      (id) =>
        id === 'prompt-node'
          ? { blockedReason: 'missing_inputs', waitingOnPorts: ['bundle', ''] }
          : { waitingOnPorts: [] }
    );

    expect(details).toEqual([
      {
        port: 'prompt',
        upstream: [
          {
            nodeId: 'prompt-node',
            nodeType: 'prompt',
            nodeTitle: 'Prompt',
            sourcePort: 'prompt',
            status: 'blocked',
            blockedReason: 'missing_inputs',
            waitingOnPorts: ['bundle'],
          },
        ],
      },
      {
        port: 'context',
        upstream: [
          {
            nodeId: 'poll-node',
            nodeType: 'poll',
            nodeTitle: 'Poll',
            sourcePort: 'result',
            status: 'running',
            waitingOnPorts: [],
          },
        ],
      },
    ]);

    expect(resolveMissingInputStatus({ waitingOnDetails: details })).toBe('waiting_callback');
    expect(
      resolveMissingInputStatus({
        waitingOnDetails: [
          {
            upstream: [{ status: 'blocked', blockedReason: 'validation_failed', waitingOnPorts: [] }],
          },
        ],
      })
    ).toBe('blocked');
  });

  it('evaluates prompt and database input readiness across major operation branches', () => {
    const promptNode = buildNode({
      id: 'prompt-node',
      type: 'prompt',
      config: { prompt: { template: 'Name: {{ bundle.name }}' } },
    });
    const promptEdges = [
      { id: 'edge-1', from: 'source', to: 'prompt-node', toPort: 'bundle' } as Edge,
    ];
    const promptReadiness = evaluateInputReadiness(
      promptNode,
      { value: 'present' },
      promptEdges,
      new Map([['source', buildNode({ id: 'source', type: 'fetcher' })]]),
      () => 'blocked',
      () => ({ blockedReason: 'missing_inputs', waitingOnPorts: ['bundle'] })
    );
    expect(promptReadiness).toEqual(
      expect.objectContaining({
        ready: false,
        requiredPorts: ['bundle'],
        optionalPorts: [],
        waitingOnPorts: ['bundle'],
      })
    );

    const promptStaticReadiness = evaluateInputReadiness(
      buildNode({
        id: 'prompt-static',
        type: 'prompt',
        config: { prompt: { template: 'Static prompt only' } },
      }),
      {},
      [{ id: 'edge-1', from: 'source', to: 'prompt-static', toPort: 'bundle' } as Edge],
      new Map(),
      () => 'pending',
      () => ({})
    );
    expect(promptStaticReadiness.ready).toBe(true);

    const noIncomingRequired = evaluateInputReadiness(
      buildNode({
        id: 'required-node',
        type: 'mapper',
        inputs: ['value'],
        inputContracts: { value: { required: true } },
      }),
      {},
      [],
      new Map(),
      () => 'pending',
      () => ({})
    );
    expect(noIncomingRequired).toEqual(
      expect.objectContaining({
        ready: false,
        requiredPorts: ['value'],
        waitingOnPorts: ['value'],
      })
    );

    const dbQuery = evaluateInputReadiness(
      buildNode({
        id: 'db-query',
        type: 'database',
        config: { database: { operation: 'query' } },
      }),
      { entityId: 'prod-1' },
      [
        { id: 'edge-1', from: 'source', to: 'db-query', toPort: 'query' } as Edge,
        { id: 'edge-2', from: 'source', to: 'db-query', toPort: 'entityId' } as Edge,
      ],
      new Map(),
      () => 'pending',
      () => ({})
    );
    expect(dbQuery).toEqual(expect.objectContaining({ ready: false, waitingOnPorts: ['query'] }));

    const dbDelete = evaluateInputReadiness(
      buildNode({
        id: 'db-delete',
        type: 'database',
        config: { database: { operation: 'delete' } },
      }),
      {},
      [{ id: 'edge-1', from: 'source', to: 'db-delete', toPort: 'entityId' } as Edge],
      new Map(),
      () => 'pending',
      () => ({})
    );
    expect(dbDelete).toEqual(expect.objectContaining({ ready: false, waitingOnPorts: ['entityId'] }));

    const dbInsertTemplate = evaluateInputReadiness(
      buildNode({
        id: 'db-insert',
        type: 'database',
        config: { database: { operation: 'insert', query: { queryTemplate: 'insert {{ value }}' } } },
      }),
      {},
      [{ id: 'edge-1', from: 'source', to: 'db-insert', toPort: 'value' } as Edge],
      new Map(),
      () => 'pending',
      () => ({})
    );
    expect(dbInsertTemplate.ready).toBe(true);

    const dbUpdate = evaluateInputReadiness(
      buildNode({
        id: 'db-update',
        type: 'database',
        config: {
          database: {
            operation: 'update',
            mappings: [{ sourcePort: 'fieldValue' }],
          },
        },
      }),
      {},
      [
        { id: 'edge-1', from: 'source', to: 'db-update', toPort: 'entityId' } as Edge,
        { id: 'edge-2', from: 'source', to: 'db-update', toPort: 'fieldValue' } as Edge,
      ],
      new Map(),
      () => 'pending',
      () => ({})
    );
    expect(dbUpdate).toEqual(
      expect.objectContaining({
        ready: false,
        waitingOnPorts: ['entityId', 'fieldValue'],
      })
    );
  });

  it('collects node inputs using default result and value ports when edges omit them', () => {
    const outputs = {
      sourceA: { result: 'hello' },
      sourceB: { custom: 'ignored', value: 'fallback' },
    };
    const incomingEdgesByNode = new Map<string, Edge[]>([
      [
        'target',
        [
          { id: 'edge-1', from: 'sourceA', to: 'target' } as Edge,
          { id: 'edge-2', source: 'sourceB', to: 'target', toPort: 'payload' } as Edge,
        ],
      ],
    ]);

    expect(collectNodeInputs('target', outputs, incomingEdgesByNode)).toEqual({
      value: 'hello',
    });
    expect(collectNodeInputs('missing', outputs, incomingEdgesByNode)).toEqual({});
  });
});
