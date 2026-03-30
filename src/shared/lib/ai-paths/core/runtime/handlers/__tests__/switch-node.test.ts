import { describe, expect, it, vi } from 'vitest';

import type { AiNode } from '@/shared/contracts/ai-paths';
import type { NodeHandlerContext } from '@/shared/contracts/ai-paths-runtime';
import { handleSwitchNode } from '@/shared/lib/ai-paths/core/runtime/handlers/switch-node';

const buildNode = (): AiNode =>
  ({
    id: 'switch-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: null,
    type: 'switch',
    title: 'Switch',
    description: '',
    position: { x: 0, y: 0 },
    data: {},
    inputs: ['value'],
    outputs: ['value', 'caseId', 'matched'],
    config: {
      switch: {
        inputPort: ' status ',
        cases: [
          { id: 'draft-case', matchValue: 'draft' },
          { id: 'live-case', matchValue: 'live' },
        ],
        defaultCaseId: 'fallback-case',
      },
    },
  }) as AiNode;

const buildContext = (overrides: Partial<NodeHandlerContext> = {}): NodeHandlerContext =>
  ({
    node: buildNode(),
    nodeInputs: {},
    prevOutputs: { passthrough: true },
    edges: [],
    nodes: [],
    nodeById: new Map(),
    runId: 'run-switch',
    runStartedAt: '2026-01-01T00:00:00.000Z',
    activePathId: null,
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

describe('handleSwitchNode', () => {
  it('returns previous outputs for non-switch nodes', () => {
    const prevOutputs = { passthrough: true };
    const output = handleSwitchNode(
      buildContext({
        prevOutputs,
        node: { ...buildNode(), type: 'viewer' } as AiNode,
      })
    );

    expect(output).toBe(prevOutputs);
  });

  it('matches using the configured input port', () => {
    const output = handleSwitchNode(
      buildContext({
        nodeInputs: { status: 'live' },
      })
    );

    expect(output).toEqual({
      value: 'live',
      caseId: 'live-case',
      matched: true,
    });
  });

  it('falls back to the default case when nothing matches', () => {
    const output = handleSwitchNode(
      buildContext({
        nodeInputs: { status: 'archived' },
      })
    );

    expect(output).toEqual({
      value: 'archived',
      caseId: 'fallback-case',
      matched: true,
    });
  });
});
