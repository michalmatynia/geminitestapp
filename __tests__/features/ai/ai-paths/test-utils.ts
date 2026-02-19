import { vi } from 'vitest';

import type { AiNode } from '@/shared/types/domain/ai-paths';
import type { NodeHandlerContext } from '@/shared/types/domain/ai-paths-runtime';

export const createMockContext = (overrides: Partial<NodeHandlerContext> = {}): NodeHandlerContext => {
  return {
    node: {
      id: 'test-node',
      type: 'constant',
      title: 'Test Node',
      description: '',
      inputs: [],
      outputs: [],
      position: { x: 0, y: 0 },
      config: {},
    } as AiNode,
    nodeInputs: {},
    prevOutputs: {},
    edges: [],
    nodes: [],
    nodeById: new Map(),
    runId: 'test-run-id',
    runStartedAt: new Date().toISOString(),
    activePathId: 'test-path',
    triggerNodeId: undefined,
    triggerEvent: undefined,
    triggerContext: null,
    deferPoll: false,
    skipAiJobs: false,
    now: new Date().toISOString(),
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
  };
};
