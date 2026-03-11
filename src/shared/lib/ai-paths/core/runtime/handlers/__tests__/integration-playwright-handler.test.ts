import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { handlePlaywright } from '@/shared/lib/ai-paths/core/runtime/handlers/integration-playwright-handler';
import type { ContextRegistryConsumerEnvelope } from '@/shared/contracts/ai-context-registry';
import type { AiNode, RuntimePortValues } from '@/shared/contracts/ai-paths';
import type { NodeHandlerContext } from '@/shared/contracts/ai-paths-runtime';

const { enqueueMock, pollMock, artifactUrlFromPathMock } = vi.hoisted(() => ({
  enqueueMock: vi.fn(),
  pollMock: vi.fn(),
  artifactUrlFromPathMock: vi.fn(),
}));

vi.mock('@/shared/lib/ai-paths/api', () => ({
  playwrightNodeApi: {
    enqueue: enqueueMock,
    poll: pollMock,
    artifactUrlFromPath: artifactUrlFromPathMock,
  },
}));

const buildNode = (patch: Partial<AiNode> = {}): AiNode =>
  ({
    id: 'node-playwright',
    type: 'playwright',
    title: 'Playwright',
    description: 'Playwright node',
    position: { x: 0, y: 0 },
    data: {},
    inputs: ['prompt', 'value', 'result', 'bundle'],
    outputs: ['result', 'value', 'bundle', 'status', 'jobId'],
    config: {
      playwright: {
        personaId: '',
        script:
          'export default async function run({ page, input, emit }) {\n' +
          '  await page.goto(input?.prompt || "https://example.com");\n' +
          '  emit(\'result\', \'ok\');\n' +
          '  return { ok: true };\n' +
          '}',
        waitForResult: true,
        timeoutMs: 120000,
        browserEngine: 'chromium',
        startUrlTemplate: '',
        launchOptionsJson: '{}',
        contextOptionsJson: '{}',
        settingsOverrides: {},
        capture: {
          screenshot: true,
          html: false,
          video: false,
          trace: false,
        },
      },
    },
    ...(patch as Record<string, unknown>),
  }) as AiNode;

const buildContext = (
  node: AiNode,
  nodeInputs: RuntimePortValues,
  options: {
    contextRegistry?: ContextRegistryConsumerEnvelope | null;
  } = {}
): NodeHandlerContext =>
  ({
    node,
    nodeInputs,
    prevOutputs: {},
    edges: [],
    nodes: [node],
    nodeById: new Map<string, AiNode>([[node.id, node]]),
    runId: 'run-1',
    runStartedAt: new Date().toISOString(),
    activePathId: 'path-1',
    contextRegistry: options.contextRegistry ?? null,
    triggerNodeId: undefined,
    triggerEvent: undefined,
    triggerContext: undefined,
    deferPoll: false,
    skipAiJobs: false,
    now: new Date().toISOString(),
    allOutputs: {},
    allInputs: {},
    fetchEntityCached: async () => null,
    reportAiPathsError: vi.fn(),
    toast: vi.fn(),
    simulationEntityType: null,
    simulationEntityId: null,
    resolvedEntity: null,
    fallbackEntityId: null,
    strictFlowMode: true,
    executed: {
      notification: new Set<string>(),
      updater: new Set<string>(),
      http: new Set<string>(),
      delay: new Set<string>(),
      poll: new Set<string>(),
      ai: new Set<string>(),
      schema: new Set<string>(),
      mapper: new Set<string>(),
    },
  }) as NodeHandlerContext;

describe('handlePlaywright', () => {
  beforeEach(() => {
    enqueueMock.mockReset();
    pollMock.mockReset();
    artifactUrlFromPathMock.mockReset();
    artifactUrlFromPathMock.mockImplementation(
      (_relativePath: string) =>
        `/api/ai-paths/playwright/${encodeURIComponent('run-100')}/artifacts/${encodeURIComponent('final.png')}`
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns failed status when script is empty', async () => {
    const node = buildNode({
      config: {
        playwright: {
          ...buildNode().config!.playwright!,
          script: '   ',
        },
      },
    });

    const result = await handlePlaywright(buildContext(node, {}));

    expect(enqueueMock).not.toHaveBeenCalled();
    expect(result['status']).toBe('failed');
    expect(result['bundle']).toEqual(
      expect.objectContaining({
        status: 'failed',
        error: 'Playwright script is empty.',
      })
    );
  });

  it('fails fast when launch options is not a JSON object', async () => {
    const node = buildNode({
      config: {
        playwright: {
          ...buildNode().config!.playwright!,
          launchOptionsJson: '[1,2,3]',
        },
      },
    });
    const context = buildContext(node, {});

    const result = (await handlePlaywright(context)) as unknown as RuntimePortValues;

    expect(enqueueMock).not.toHaveBeenCalled();
    expect(result['status']).toBe('failed');
    expect(result['bundle']).toEqual(
      expect.objectContaining({
        status: 'failed',
        error: 'Launch options must be a valid JSON object.',
      })
    );
    expect(context.reportAiPathsError).toHaveBeenCalledTimes(1);
    expect(context.toast).toHaveBeenCalledWith('Playwright run failed.', {
      variant: 'error',
    });
    expect(context.executed.ai.has('node-playwright')).toBe(true);
  });

  it('returns queued job metadata when waitForResult is disabled', async () => {
    enqueueMock.mockResolvedValueOnce({
      ok: true,
      data: {
        run: {
          runId: 'run-queued-1',
          status: 'queued',
          artifacts: [],
          logs: [],
        },
      },
    });
    const node = buildNode({
      config: {
        playwright: {
          ...buildNode().config!.playwright!,
          waitForResult: false,
          personaId: 'persona-1',
        },
      },
    });
    const context = buildContext(node, { prompt: 'https://example.com' });

    const result = (await handlePlaywright(context)) as unknown as RuntimePortValues;

    expect(enqueueMock).toHaveBeenCalledTimes(1);
    expect(pollMock).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        jobId: 'run-queued-1',
        status: 'queued',
        bundle: expect.objectContaining({
          runId: 'run-queued-1',
          status: 'queued',
          personaId: 'persona-1',
        }),
      })
    );
    expect(context.executed.ai.has('node-playwright')).toBe(true);
    expect(context.toast).toHaveBeenCalledWith('Playwright run queued.', {
      variant: 'success',
    });
  });

  it('includes contextRegistry in the queued Playwright payload when available', async () => {
    enqueueMock.mockResolvedValueOnce({
      ok: true,
      data: {
        run: {
          runId: 'run-ctx-1',
          status: 'queued',
          artifacts: [],
          logs: [],
        },
      },
    });
    const contextRegistry: ContextRegistryConsumerEnvelope = {
      refs: [{ kind: 'static_node', id: 'page:ai-paths' }],
      resolved: {
        refs: [{ kind: 'static_node', id: 'page:ai-paths' }],
        nodes: [],
        documents: [
          {
            id: 'runtime:ai-paths:workspace',
            kind: 'runtime_document',
            entityType: 'ai_paths_workspace_state',
            title: 'AI Paths workspace',
            summary: 'Current AI Paths workspace state.',
            tags: ['ai-paths'],
            relatedNodeIds: ['page:ai-paths'],
            sections: [],
          },
        ],
      },
    };

    await handlePlaywright(buildContext(buildNode(), { prompt: 'https://example.com' }, { contextRegistry }));

    expect(enqueueMock).toHaveBeenCalledWith(
      expect.objectContaining({
        contextRegistry,
      })
    );
  });

  it('polls queued run and maps final outputs', async () => {
    enqueueMock.mockResolvedValueOnce({
      ok: true,
      data: {
        run: {
          runId: 'run-100',
          status: 'queued',
          artifacts: [],
          logs: [],
        },
      },
    });
    pollMock.mockResolvedValueOnce({
      ok: true,
      data: {
        run: {
          runId: 'run-100',
          status: 'completed',
          result: {
            returnValue: { title: 'Example title' },
            outputs: {
              result: 'Example title',
              custom: 42,
            },
          },
          error: null,
          artifacts: [{ name: 'final', path: 'run-100/final.png' }],
          logs: ['done'],
          startedAt: '2026-02-21T10:00:00.000Z',
          completedAt: '2026-02-21T10:00:05.000Z',
        },
      },
    });
    const node = buildNode();

    const result = await handlePlaywright(buildContext(node, { prompt: 'https://example.com' }));

    expect(enqueueMock).toHaveBeenCalledTimes(1);
    expect(pollMock).toHaveBeenCalledTimes(1);
    expect(result['result']).toBe('Example title');
    expect(result['value']).toEqual({ title: 'Example title' });
    expect(result['custom']).toBe(42);
    expect(result['status']).toBe('completed');
    expect(result['jobId']).toBe('run-100');
    expect(result['bundle']).toEqual(
      expect.objectContaining({
        runId: 'run-100',
        status: 'completed',
      })
    );
    const bundle = result['bundle'] as Record<string, unknown>;
    const artifacts = bundle['artifacts'] as Array<Record<string, unknown>>;
    expect(artifacts[0]?.['url']).toBe('/api/ai-paths/playwright/run-100/artifacts/final.png');
  });

  it('reports and returns failure when enqueue fails', async () => {
    enqueueMock.mockResolvedValueOnce({
      ok: false,
      error: 'Unable to enqueue',
    });
    const context = buildContext(buildNode(), {});

    const result = (await handlePlaywright(context)) as unknown as RuntimePortValues;

    expect(result['status']).toBe('failed');
    expect(result['bundle']).toEqual(
      expect.objectContaining({
        status: 'failed',
        error: 'Unable to enqueue',
      })
    );
    expect(context.reportAiPathsError).toHaveBeenCalledTimes(1);
    expect(context.toast).toHaveBeenCalledWith('Playwright run failed.', {
      variant: 'error',
    });
    expect(context.executed.ai.has('node-playwright')).toBe(true);
  });
});
