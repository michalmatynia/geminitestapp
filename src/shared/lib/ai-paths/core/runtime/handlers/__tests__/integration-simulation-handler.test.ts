import { describe, expect, it, vi } from 'vitest';

import type { AiNode } from '@/shared/contracts/ai-paths';
import type { NodeHandlerContext } from '@/shared/contracts/ai-paths-runtime';
import { handleSimulation } from '@/shared/lib/ai-paths/core/runtime/handlers/integration-simulation-handler';

const logClientErrorMock = vi.hoisted(() => vi.fn());

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientError: logClientErrorMock,
}));

const buildNode = (overrides: Partial<AiNode> = {}): AiNode =>
  ({
    id: 'simulation-node',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: null,
    type: 'simulation',
    title: 'Simulation Node',
    description: '',
    position: { x: 0, y: 0 },
    inputs: ['trigger'],
    outputs: ['context', 'entityId', 'entityType', 'entityJson'],
    data: {},
    config: {
      simulation: {
        entityId: 'prod-1',
        entityType: 'product',
      },
    },
    ...overrides,
  }) as AiNode;

const buildContext = (overrides: Partial<NodeHandlerContext> = {}): NodeHandlerContext =>
  ({
    node: buildNode(),
    nodeInputs: {},
    prevOutputs: {},
    edges: [],
    nodes: [],
    nodeById: new Map(),
    runId: 'run-simulation',
    runStartedAt: '2026-01-01T00:00:00.000Z',
    activePathId: 'path-1',
    triggerNodeId: undefined,
    triggerEvent: undefined,
    triggerContext: null,
    deferPoll: false,
    skipAiJobs: false,
    now: '2026-01-01T00:00:00.000Z',
    abortSignal: undefined,
    allOutputs: {},
    allInputs: {},
    fetchEntityCached: vi.fn().mockResolvedValue(null),
    reportAiPathsError: vi.fn(),
    toast: vi.fn(),
    simulationEntityType: null,
    simulationEntityId: null,
    resolvedEntity: null,
    fallbackEntityId: null,
    strictFlowMode: true,
    executed: {
      notification: new Set(),
      updater: new Set(),
      http: new Set(),
      delay: new Set(),
      poll: new Set(),
      ai: new Set(),
      schema: new Set(),
      mapper: new Set(),
    },
    ...overrides,
  }) as NodeHandlerContext;

describe('handleSimulation', () => {
  it('skips simulation hydration when trigger input is false', async () => {
    const fetchEntityCached = vi.fn();
    const result = await handleSimulation(
      buildContext({
        nodeInputs: { trigger: false },
        fetchEntityCached,
      })
    );

    expect(result).toEqual({});
    expect(fetchEntityCached).not.toHaveBeenCalled();
  });

  it('hydrates product entities into the returned simulation context', async () => {
    const entity = { id: 'prod-1', name: 'Demo product' };
    const result = await handleSimulation(
      buildContext({
        fetchEntityCached: vi.fn().mockResolvedValue(entity),
      })
    );

    expect(result).toEqual({
      context: {
        source: 'Simulation Node',
        timestamp: '2026-01-01T00:00:00.000Z',
        pathId: 'path-1',
        contextSource: 'simulation',
        simulationNodeId: 'simulation-node',
        simulationNodeTitle: 'Simulation Node',
        entityId: 'prod-1',
        entityType: 'product',
        productId: 'prod-1',
        entity,
        entityJson: entity,
        product: entity,
      },
      entityId: 'prod-1',
      entityType: 'product',
      entityJson: entity,
    });
  });

  it('toasts when the configured entity cannot be found', async () => {
    const toast = vi.fn();
    const result = await handleSimulation(
      buildContext({
        toast,
        fetchEntityCached: vi.fn().mockResolvedValue(null),
      })
    );

    expect(toast).toHaveBeenCalledWith('No product found for simulation ID prod-1.', {
      variant: 'error',
    });
    expect(result).toEqual({
      context: {
        source: 'Simulation Node',
        timestamp: '2026-01-01T00:00:00.000Z',
        pathId: 'path-1',
        contextSource: 'simulation',
        simulationNodeId: 'simulation-node',
        simulationNodeTitle: 'Simulation Node',
        entityId: 'prod-1',
        entityType: 'product',
        productId: 'prod-1',
      },
      entityId: 'prod-1',
      entityType: 'product',
      entityJson: null,
    });
  });

  it('reports hydration failures and still returns the base simulation context', async () => {
    const error = new Error('boom');
    const reportAiPathsError = vi.fn();
    const result = await handleSimulation(
      buildContext({
        reportAiPathsError,
        fetchEntityCached: vi.fn().mockRejectedValue(error),
      })
    );

    expect(logClientErrorMock).toHaveBeenCalledWith(error);
    expect(reportAiPathsError).toHaveBeenCalledWith(
      error,
      expect.objectContaining({
        service: 'ai-paths-runtime',
        nodeId: 'simulation-node',
        nodeType: 'simulation',
        entityId: 'prod-1',
        entityType: 'product',
      }),
      'Simulation hydration failed for product:prod-1'
    );
    expect(result).toEqual({
      context: {
        source: 'Simulation Node',
        timestamp: '2026-01-01T00:00:00.000Z',
        pathId: 'path-1',
        contextSource: 'simulation',
        simulationNodeId: 'simulation-node',
        simulationNodeTitle: 'Simulation Node',
        entityId: 'prod-1',
        entityType: 'product',
        productId: 'prod-1',
      },
      entityId: 'prod-1',
      entityType: 'product',
      entityJson: null,
    });
  });
});
