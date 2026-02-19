import { describe, expect, it, vi } from 'vitest';

import { handleParser } from '@/features/ai/ai-paths/lib/core/runtime/handlers/transform';
import type { AiNode } from '@/shared/types/domain/ai-paths';
import type { NodeHandlerContext } from '@/shared/types/domain/ai-paths-runtime';

const buildParserNode = (): AiNode =>
  ({
    id: 'parser-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: null,
    type: 'parser',
    title: 'JSON Parser',
    description: '',
    position: { x: 120, y: 80 },
    data: {},
    inputs: ['entityJson', 'context'],
    outputs: ['bundle', 'title', 'content_en'],
    config: {
      parser: {
        mappings: {
          title: 'title',
          content_en: 'content_en',
          parameters: 'parameters',
        },
        outputMode: 'bundle',
      },
    },
  }) as AiNode;

const buildContext = (
  overrides: Partial<NodeHandlerContext> = {},
): NodeHandlerContext =>
  ({
    node: buildParserNode(),
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

describe('handleParser strict context hydration', () => {
  it('hydrates entity from explicit context identity in strict mode', async () => {
    const fetchEntityCached = vi.fn().mockResolvedValue({
      id: 'product-1',
      title: 'Desk Lamp',
      content_en: 'Metal desk lamp.',
      parameters: [{ parameterId: 'color', value: 'Black' }],
    });
    const ctx = buildContext({
      nodeInputs: {
        context: { entityId: 'product-1', entityType: 'product' },
      },
      fetchEntityCached,
    });

    const output = await handleParser(ctx);
    expect(fetchEntityCached).toHaveBeenCalledWith('product', 'product-1');
    expect(output).toMatchObject({
      title: 'Desk Lamp',
      content_en: 'Metal desk lamp.',
      bundle: {
        title: 'Desk Lamp',
        content_en: 'Metal desk lamp.',
        parameters: [{ parameterId: 'color', value: 'Black' }],
      },
    });
  });

  it('returns empty output when strict mode has no explicit source', async () => {
    const fetchEntityCached = vi.fn();
    const ctx = buildContext({
      nodeInputs: { context: { trigger: true } },
      fetchEntityCached,
    });

    const output = await handleParser(ctx);
    expect(output).toEqual({});
    expect(fetchEntityCached).not.toHaveBeenCalled();
  });
});
