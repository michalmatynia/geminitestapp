import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createDefaultPathConfig } from '@/shared/lib/ai-paths/core/utils/factory';

const {
  requireAiPathsRunAccessMock,
  enforceAiPathsRunRateLimitMock,
  getAiPathsSettingMock,
  enqueuePathRunMock,
  assertAiPathRunQueueReadyForEnqueueMock,
  logSystemEventMock,
} = vi.hoisted(() => ({
  requireAiPathsRunAccessMock: vi.fn(),
  enforceAiPathsRunRateLimitMock: vi.fn(),
  getAiPathsSettingMock: vi.fn(),
  enqueuePathRunMock: vi.fn(),
  assertAiPathRunQueueReadyForEnqueueMock: vi.fn(),
  logSystemEventMock: vi.fn(),
}));

vi.mock('@/features/ai/ai-paths/server', () => ({
  requireAiPathsRunAccess: requireAiPathsRunAccessMock,
  enforceAiPathsRunRateLimit: enforceAiPathsRunRateLimitMock,
  getAiPathsSetting: getAiPathsSettingMock,
  enqueuePathRun: enqueuePathRunMock,
}));

vi.mock('@/features/jobs/server', () => ({
  assertAiPathRunQueueReadyForEnqueue: assertAiPathRunQueueReadyForEnqueueMock,
}));

vi.mock('@/shared/lib/observability/system-logger', () => ({
  logSystemEvent: logSystemEventMock,
}));

import { POST_handler } from './handler';

const makeRequest = (body: Record<string, unknown>): NextRequest =>
  new NextRequest('http://localhost/api/ai-paths/runs/enqueue', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });

const parseResponseBody = async (response: Response): Promise<Record<string, unknown>> => {
  const bodyText = await response.text();
  const parsed: unknown = bodyText ? JSON.parse(bodyText) : {};
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Expected a JSON object response body.');
  }
  return parsed;
};

describe('ai-paths runs enqueue handler', () => {
  beforeEach(() => {
    requireAiPathsRunAccessMock.mockReset().mockResolvedValue({ userId: 'user-1' });
    enforceAiPathsRunRateLimitMock.mockReset().mockResolvedValue(undefined);
    getAiPathsSettingMock.mockReset().mockResolvedValue(null);
    enqueuePathRunMock.mockReset().mockResolvedValue({ id: 'run-1', status: 'queued' });
    assertAiPathRunQueueReadyForEnqueueMock.mockReset().mockResolvedValue(undefined);
    logSystemEventMock.mockReset().mockResolvedValue(undefined);
  });

  it('rejects legacy node identities before enqueueing the run', async () => {
    const config = createDefaultPathConfig('path-legacy');
    const legacyNodeId = 'node-legacy-parser';
    const [firstNode, ...restNodes] = config.nodes;
    if (!firstNode) {
      throw new Error('Expected default path config to include at least one node.');
    }
    const nodes = [
      {
        ...firstNode,
        id: legacyNodeId,
        instanceId: legacyNodeId,
      },
      ...restNodes,
    ];
    const edges = config.edges.map((edge) =>
      edge.from === firstNode.id
        ? { ...edge, from: legacyNodeId }
        : edge.to === firstNode.id
          ? { ...edge, to: legacyNodeId }
          : edge
    );

    await expect(
      POST_handler(
        makeRequest({
          pathId: config.id,
          pathName: config.name,
          nodes,
          edges,
        }),
        {} as Parameters<typeof POST_handler>[1]
      )
    ).rejects.toThrow(/unsupported node identities/i);

    expect(enqueuePathRunMock).not.toHaveBeenCalled();
  });

  it('rejects invalid edges before enqueueing the run', async () => {
    const config = createDefaultPathConfig('path-invalid-edge');
    const [firstEdge, ...restEdges] = config.edges;
    if (!firstEdge) {
      throw new Error('Expected default path config to include at least one edge.');
    }
    const edges = [
      {
        ...firstEdge,
        to: 'node-missing001122334455667788',
      },
      ...restEdges,
    ];

    await expect(
      POST_handler(
        makeRequest({
          pathId: config.id,
          pathName: config.name,
          nodes: config.nodes,
          edges,
        }),
        {} as Parameters<typeof POST_handler>[1]
      )
    ).rejects.toThrow(/invalid or non-canonical edges/i);

    expect(enqueuePathRunMock).not.toHaveBeenCalled();
  });

  it('enqueues canonical graphs without identity repair metadata', async () => {
    const config = createDefaultPathConfig('path-canonical');

    const response = await POST_handler(
      makeRequest({
        pathId: config.id,
        pathName: config.name,
        nodes: config.nodes,
        edges: config.edges,
        meta: {
          aiPathsValidation: {
            enabled: false,
          },
        },
      }),
      {} as Parameters<typeof POST_handler>[1]
    );

    expect(response.status).toBe(200);
    await expect(parseResponseBody(response)).resolves.toEqual({
      run: { id: 'run-1', status: 'queued' },
      runId: 'run-1',
    });
    const enqueueArgs = enqueuePathRunMock.mock.calls[0]?.[0] as
      | {
        pathId?: string;
        pathName?: string;
        nodes?: unknown;
        edges?: unknown;
        meta?: Record<string, unknown>;
      }
      | undefined;
    expect(enqueueArgs).toEqual(
      expect.objectContaining({
        pathId: config.id,
        pathName: config.name,
        nodes: config.nodes,
        edges: config.edges,
      })
    );
    expect(enqueueArgs?.meta).not.toHaveProperty('identityRepair');
  });

  it('loads stored path config when nodes and edges are omitted', async () => {
    const config = createDefaultPathConfig('path-stored-config');
    getAiPathsSettingMock.mockResolvedValueOnce(JSON.stringify(config));

    const response = await POST_handler(
      makeRequest({
        pathId: config.id,
        triggerEvent: 'manual',
        triggerNodeId: config.nodes.find((node) => node.type === 'trigger')?.id,
        meta: {
          aiPathsValidation: {
            enabled: false,
          },
        },
      }),
      {} as Parameters<typeof POST_handler>[1]
    );

    expect(response.status).toBe(200);
    expect(getAiPathsSettingMock).toHaveBeenCalledWith(`ai_paths_config_${config.id}`);
    expect(enqueuePathRunMock).toHaveBeenCalledWith(
      expect.objectContaining({
        pathId: config.id,
        pathName: config.name,
        nodes: config.nodes,
        edges: config.edges,
      })
    );
    const logInvocation = logSystemEventMock.mock.calls[0]?.[0] as
      | { source?: string; context?: Record<string, unknown> }
      | undefined;
    expect(logInvocation?.source).toBe('ai-paths.runs.enqueue');
    expect(logInvocation?.context?.['graphSource']).toBe('settings');
  });

  it('derives runId from legacy _id run payloads', async () => {
    enqueuePathRunMock.mockResolvedValueOnce({ _id: 'run-legacy-1', status: 'queued' });
    const config = createDefaultPathConfig('path-canonical-legacy-id');

    const response = await POST_handler(
      makeRequest({
        pathId: config.id,
        pathName: config.name,
        nodes: config.nodes,
        edges: config.edges,
        meta: {
          aiPathsValidation: {
            enabled: false,
          },
        },
      }),
      {} as Parameters<typeof POST_handler>[1]
    );

    expect(response.status).toBe(200);
    await expect(parseResponseBody(response)).resolves.toEqual({
      run: { _id: 'run-legacy-1', status: 'queued' },
      runId: 'run-legacy-1',
    });
  });

  it('rejects enqueue responses that do not expose any run identifier', async () => {
    enqueuePathRunMock.mockResolvedValueOnce({ status: 'queued' });
    const config = createDefaultPathConfig('path-canonical-missing-id');

    await expect(
      POST_handler(
        makeRequest({
          pathId: config.id,
          pathName: config.name,
          nodes: config.nodes,
          edges: config.edges,
          meta: {
            aiPathsValidation: {
              enabled: false,
            },
          },
        }),
        {} as Parameters<typeof POST_handler>[1]
      )
    ).rejects.toThrow(/missing run identifier/i);
  });

  it('rejects legacy object-shaped enqueue metadata source', async () => {
    const config = createDefaultPathConfig('path-legacy-meta-source');

    await expect(
      POST_handler(
        makeRequest({
          pathId: config.id,
          pathName: config.name,
          nodes: config.nodes,
          edges: config.edges,
          meta: {
            source: {
              tab: 'product',
            },
            triggerEventId: 'trigger_event_id',
          },
        }),
        {} as Parameters<typeof POST_handler>[1]
      )
    ).rejects.toThrow(/meta\.source must be a string/i);

    expect(enqueuePathRunMock).not.toHaveBeenCalled();
  });
});
