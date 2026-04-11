import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  startAiInsightsQueueMock,
  getSystemLogByIdMock,
  hydrateSystemLogRecordRuntimeContextMock,
  resolveObservabilityContextRegistryEnvelopeMock,
  generateLogInterpretationMock,
  assertSettingsManageAccessMock,
} = vi.hoisted(() => ({
  startAiInsightsQueueMock: vi.fn(),
  getSystemLogByIdMock: vi.fn(),
  hydrateSystemLogRecordRuntimeContextMock: vi.fn(),
  resolveObservabilityContextRegistryEnvelopeMock: vi.fn(),
  generateLogInterpretationMock: vi.fn(),
  assertSettingsManageAccessMock: vi.fn(),
}));

vi.mock('@/features/jobs/server', () => ({
  startAiInsightsQueue: startAiInsightsQueueMock,
}));

vi.mock('@/shared/lib/observability/system-log-repository', () => ({
  getSystemLogById: getSystemLogByIdMock,
}));

vi.mock('@/shared/lib/observability/entry-server', () => ({
  hydrateSystemLogRecordRuntimeContext: hydrateSystemLogRecordRuntimeContextMock,
}));

vi.mock('@/shared/lib/observability/runtime-context/server', () => ({
  resolveObservabilityContextRegistryEnvelope: resolveObservabilityContextRegistryEnvelopeMock,
}));

vi.mock('@/features/ai/insights/server', () => ({
  generateLogInterpretation: generateLogInterpretationMock,
}));

vi.mock('@/features/auth/server', () => ({
  assertSettingsManageAccess: assertSettingsManageAccessMock,
}));

describe('system logs interpret handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    assertSettingsManageAccessMock.mockResolvedValue(undefined);
  });

  it('hydrates registry runtime context before generating the log interpretation', async () => {
    const { POST_handler } = await import('./handler');

    resolveObservabilityContextRegistryEnvelopeMock.mockResolvedValue({
      refs: [{ id: 'page:system-logs', kind: 'static_node' }],
      resolved: {
        refs: [{ id: 'page:system-logs', kind: 'static_node' }],
        nodes: [
          {
            id: 'page:system-logs',
            kind: 'page',
            name: 'Observation Post',
            description: 'System logs workspace',
            tags: ['observability'],
            permissions: {
              readScopes: ['ctx:read'],
              riskTier: 'none',
              classification: 'internal',
            },
            version: '1.0.0',
            updatedAtISO: '2026-03-09T00:00:00.000Z',
            source: { type: 'code', ref: 'test' },
          },
        ],
        documents: [],
        truncated: false,
        engineVersion: 'registry:test',
      },
      engineVersion: 'registry:test',
    });

    getSystemLogByIdMock.mockResolvedValue({
      id: 'log-1',
      level: 'error',
      message: 'Run failed',
      source: 'ai-paths-worker',
      context: {
        runId: 'run-1',
      },
      stack: 'stack',
      path: '/api/ai-paths/runs/enqueue',
      method: 'POST',
      statusCode: 500,
      createdAt: '2026-03-02T10:00:00.000Z',
    });

    hydrateSystemLogRecordRuntimeContextMock.mockResolvedValue({
      id: 'log-1',
      level: 'error',
      message: 'Run failed',
      source: 'ai-paths-worker',
      context: {
        runId: 'run-1',
        contextRegistry: {
          refs: [
            {
              id: 'runtime:ai-path-run:run-1',
              kind: 'runtime_document',
              providerId: 'ai-path-run',
              entityType: 'ai_path_run',
            },
          ],
          resolved: {
            refs: [
              {
                id: 'runtime:ai-path-run:run-1',
                kind: 'runtime_document',
                providerId: 'ai-path-run',
                entityType: 'ai_path_run',
              },
            ],
            documents: [
              {
                id: 'runtime:ai-path-run:run-1',
                kind: 'runtime_document',
                entityType: 'ai_path_run',
                title: 'Primary Path',
                summary: 'failed run',
                status: 'failed',
                tags: ['ai-paths'],
                relatedNodeIds: ['page:ai-paths'],
              },
            ],
            nodes: [],
            truncated: false,
            engineVersion: 'registry:codefirst:7|providers:ai-path-run@1',
          },
        },
      },
      stack: 'stack',
      path: '/api/ai-paths/runs/enqueue',
      method: 'POST',
      statusCode: 500,
      createdAt: '2026-03-02T10:00:00.000Z',
    });

    generateLogInterpretationMock.mockResolvedValue({ id: 'insight-1' });

    const req = new NextRequest('http://localhost/api/system/logs/interpret', {
      method: 'POST',
      body: JSON.stringify({
        logId: 'log-1',
        contextRegistry: {
          refs: [{ id: 'page:system-logs', kind: 'static_node' }],
          engineVersion: 'page-context:v1',
        },
      }),
    });

    const response = await POST_handler(req, {} as never);
    const data = await response.json();

    expect(assertSettingsManageAccessMock).toHaveBeenCalledTimes(1);
    expect(startAiInsightsQueueMock).toHaveBeenCalledTimes(1);
    expect(getSystemLogByIdMock).toHaveBeenCalledWith('log-1');
    expect(hydrateSystemLogRecordRuntimeContextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'log-1',
      })
    );
    expect(resolveObservabilityContextRegistryEnvelopeMock).toHaveBeenCalledWith(
      {
        refs: [{ id: 'page:system-logs', kind: 'static_node' }],
        engineVersion: 'page-context:v1',
      },
      expect.any(Function)
    );
    expect(generateLogInterpretationMock).toHaveBeenCalledWith({
      source: 'manual',
      contextRegistry: expect.objectContaining({
        refs: expect.arrayContaining([
          expect.objectContaining({ id: 'page:system-logs' }),
          expect.objectContaining({ id: 'runtime:ai-path-run:run-1' }),
        ]),
        resolved: expect.objectContaining({
          documents: [expect.objectContaining({ id: 'runtime:ai-path-run:run-1' })],
        }),
      }),
      log: expect.objectContaining({
        id: 'log-1',
        context: expect.objectContaining({
          runId: 'run-1',
          contextRegistry: expect.objectContaining({
            refs: [expect.objectContaining({ id: 'runtime:ai-path-run:run-1' })],
            resolved: expect.objectContaining({
              documents: [expect.objectContaining({ id: 'runtime:ai-path-run:run-1' })],
            }),
          }),
        }),
      }),
    });
    expect(data).toEqual({ insight: { id: 'insight-1' } });
  });
});
