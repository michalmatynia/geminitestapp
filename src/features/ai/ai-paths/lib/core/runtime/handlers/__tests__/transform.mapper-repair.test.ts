import { describe, expect, it, vi } from 'vitest';

import { handleMapper } from '@/features/ai/ai-paths/lib/core/runtime/handlers/transform';
import type { AiNode } from '@/shared/contracts/ai-paths';
import type { NodeHandlerContext } from '@/shared/contracts/ai-paths-runtime';

const buildMapperNode = (): AiNode =>
  ({
    id: 'mapper-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: null,
    type: 'mapper',
    title: 'JSON Mapper',
    description: '',
    position: { x: 200, y: 120 },
    data: {},
    inputs: ['context', 'result', 'bundle', 'value'],
    outputs: ['result', 'value'],
    config: {
      mapper: {
        outputs: ['result', 'value'],
        mappings: {
          result: 'result.parameters',
          value: 'value.description_pl',
        },
      },
    },
  }) as AiNode;

const buildContext = (
  overrides: Partial<NodeHandlerContext> = {},
): NodeHandlerContext =>
  ({
    node: buildMapperNode(),
    nodeInputs: {},
    prevOutputs: {},
    edges: [],
    nodes: [],
    nodeById: new Map(),
    runId: 'run-1',
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

describe('handleMapper malformed-object repair', () => {
  it('repairs malformed JSON-like result strings before mapping nested paths', () => {
    const ctx = buildContext({
      nodeInputs: {
        result:
          '{"parameters":[{"parameterId":"p1","value":"v1","valuesByLanguage":{"pl":"x"},{"parameterId":"p2","value":"v2","valuesByLanguage":{"pl":"y"}}]}',
        value: { description_pl: 'Opis PL' },
      },
    });

    const output = handleMapper(ctx);
    expect(output['result']).toEqual([
      {
        parameterId: 'p1',
        value: 'v1',
        valuesByLanguage: { pl: 'x' },
      },
      {
        parameterId: 'p2',
        value: 'v2',
        valuesByLanguage: { pl: 'y' },
      },
    ]);
    expect(output['value']).toBe('Opis PL');
  });

  it('keeps plain text sources unchanged when repair is not applicable', () => {
    const ctx = buildContext({
      nodeInputs: {
        result: 'plain text',
      },
      node: {
        ...buildMapperNode(),
        config: {
          mapper: {
            outputs: ['result'],
            mappings: {
              result: 'result',
            },
          },
        },
      } as AiNode,
    });

    const output = handleMapper(ctx);
    expect(output['result']).toBe('plain text');
  });
});
