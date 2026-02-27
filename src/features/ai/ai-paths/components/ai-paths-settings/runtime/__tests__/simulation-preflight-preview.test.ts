import { describe, expect, it } from 'vitest';

import { evaluateDataContractPreflight } from '@/shared/lib/ai-paths/core/utils/data-contract-preflight';
import { applySimulationPreviewToRuntimeState } from '@/features/ai/ai-paths/components/ai-paths-settings/runtime/useAiPathsSimulation';
import type { AiNode, Edge } from '@/shared/contracts/ai-paths';
import type { RuntimePortValues, RuntimeState } from '@/shared/contracts/ai-paths-runtime';

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

const emptyRuntimeState = (): RuntimeState => ({
  status: 'idle',
  nodeStatuses: {},
  nodeOutputs: {},
  variables: {},
  events: [],
  inputs: {},
  outputs: {},
});

describe('simulation preflight preview', () => {
  it('fetch preview seeding populates downstream inputs immediately', () => {
    const simulationNode = buildNode({
      id: 'simulation-1',
      type: 'simulation',
      outputs: ['context', 'entityId', 'entityType', 'entityJson'],
    });
    const edges: Edge[] = [
      {
        id: 'edge-simulation-db-entity-id',
        from: 'simulation-1',
        to: 'db-1',
        fromPort: 'entityId',
        toPort: 'entityId',
      },
    ];

    const simulationOutputs: RuntimePortValues = {
      context: {
        entityId: { wrapped: 'A-1' },
      },
      entityId: { wrapped: 'A-1' },
      entityType: 'product',
    };

    const nextState = applySimulationPreviewToRuntimeState({
      runtimeState: emptyRuntimeState(),
      simulationNode,
      simulationOutputs,
      edges,
    });

    expect(nextState.outputs?.['simulation-1']?.['entityId']).toEqual({ wrapped: 'A-1' });
    expect(nextState.inputs?.['db-1']?.['entityId']).toEqual({ wrapped: 'A-1' });
  });

  it('full preflight uses seeded preview values before run', () => {
    const simulationNode = buildNode({
      id: 'simulation-1',
      type: 'simulation',
      outputs: ['entityId'],
    });
    const dbNode = buildNode({
      id: 'db-1',
      type: 'database',
      inputs: ['entityId'],
      outputs: ['result'],
      config: {
        database: {
          operation: 'query',
          query: {
            provider: 'auto',
            collection: 'products',
            mode: 'custom',
            preset: 'by_id',
            field: 'id',
            idType: 'string',
            queryTemplate: '{"id":"{{entityId}}"}',
            limit: 1,
            sort: '',
            projection: '',
            single: true,
          },
        },
      },
    });
    const edges: Edge[] = [
      {
        id: 'edge-simulation-db-entity-id',
        from: 'simulation-1',
        to: 'db-1',
        fromPort: 'entityId',
        toPort: 'entityId',
      },
    ];

    const previewState = applySimulationPreviewToRuntimeState({
      runtimeState: emptyRuntimeState(),
      simulationNode,
      simulationOutputs: {
        entityId: { wrapped: 'A-1' },
      },
      edges,
    });

    const report = evaluateDataContractPreflight({
      nodes: [simulationNode, dbNode],
      edges,
      runtimeState: previewState,
      mode: 'full',
    });

    expect(report.errors).toBeGreaterThan(0);
    expect(
      report.issues.some(
        (issue) =>
          issue.code === 'database_scalar_identity_expected' &&
          issue.nodeId === 'db-1' &&
          issue.port === 'entityId'
      )
    ).toBe(true);
  });
});
