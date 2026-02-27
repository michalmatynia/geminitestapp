import { afterEach, describe, expect, it, vi } from 'vitest';

import { handlePoll } from '@/shared/lib/ai-paths/core/runtime/handlers/integration-poll-handler';
import type { AiNode } from '@/shared/contracts/ai-paths';
import type { NodeHandlerContext, RuntimePortValues } from '@/shared/contracts/ai-paths-runtime';

import {
  pollDatabaseQuery,
  pollGraphJob,
} from '../../utils';

vi.mock('../../utils', async () => {
  const actual = await vi.importActual<typeof import('../../utils')>('../../utils');
  return {
    ...actual,
    pollDatabaseQuery: vi.fn(),
    pollGraphJob: vi.fn(),
  };
});

const buildNode = (
  patch: Partial<AiNode> = {}
): AiNode =>
  ({
    id: 'node-poll',
    type: 'poll',
    title: 'Poll',
    description: 'Poll node',
    position: { x: 0, y: 0 },
    data: {},
    inputs: ['jobId'],
    outputs: ['result', 'status', 'jobId', 'bundle'],
    config: {
      poll: {
        mode: 'job',
        intervalMs: 100,
        maxAttempts: 2,
      },
    },
    ...(patch as Record<string, unknown>),
  }) as AiNode;

const buildContext = (
  node: AiNode,
  nodeInputs: RuntimePortValues,
  patch?: Partial<NodeHandlerContext>
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
    ...(patch as Record<string, unknown>),
  }) as NodeHandlerContext;

describe('handlePoll', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('classifies canceled job polling as canceled status', async () => {
    vi.mocked(pollGraphJob).mockRejectedValueOnce(new Error('AI job was canceled.'));

    const result = await handlePoll(
      buildContext(buildNode(), { jobId: 'job-1' })
    );

    expect(result['status']).toBe('canceled');
    expect(result['bundle']).toEqual(
      expect.objectContaining({
        status: 'canceled',
        reason: 'poll_job_canceled',
        retryable: false,
      })
    );
  });

  it('classifies job timeout as timeout status', async () => {
    vi.mocked(pollGraphJob).mockRejectedValueOnce(new Error('AI job timed out.'));

    const result = await handlePoll(
      buildContext(buildNode(), { jobId: 'job-timeout' })
    );

    expect(result['status']).toBe('timeout');
    expect(result['bundle']).toEqual(
      expect.objectContaining({
        status: 'timeout',
        reason: 'poll_timeout',
        retryable: true,
      })
    );
  });

  it('adds timeout reason when database polling returns timeout result', async () => {
    vi.mocked(pollDatabaseQuery).mockResolvedValueOnce({
      result: null,
      status: 'timeout',
      bundle: { status: 'timeout' },
    });
    const node = buildNode({
      config: {
        poll: {
          mode: 'database',
          intervalMs: 100,
          maxAttempts: 2,
        },
      },
    });

    const result = await handlePoll(
      buildContext(node, { jobId: 'job-db-timeout' })
    );

    expect(result['status']).toBe('timeout');
    expect(result['bundle']).toEqual(
      expect.objectContaining({
        status: 'timeout',
        reason: 'poll_timeout',
        retryable: true,
      })
    );
  });

  it('rethrows abort errors for cancellation propagation', async () => {
    const abortError = new Error('Operation aborted.');
    (abortError as { name?: string }).name = 'AbortError';
    vi.mocked(pollGraphJob).mockRejectedValueOnce(abortError);
    const controller = new AbortController();
    controller.abort();

    await expect(
      handlePoll(
        buildContext(
          buildNode(),
          { jobId: 'job-abort' },
          { abortSignal: controller.signal }
        )
      )
    ).rejects.toThrow('Operation aborted.');
  });
});
