import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  startAiInsightsQueueMock,
  getSystemLogByIdMock,
  hydrateSystemLogRecordRuntimeContextMock,
  generateLogInterpretationMock,
} = vi.hoisted(() => ({
  startAiInsightsQueueMock: vi.fn(),
  getSystemLogByIdMock: vi.fn(),
  hydrateSystemLogRecordRuntimeContextMock: vi.fn(),
  generateLogInterpretationMock: vi.fn(),
}));

vi.mock('@/features/jobs/server', () => ({
  startAiInsightsQueue: startAiInsightsQueueMock,
}));

vi.mock('@/shared/lib/observability/system-logger', () => ({
  getSystemLogById: getSystemLogByIdMock,
}));

vi.mock('@/shared/lib/observability/runtime-context/hydrate-system-log-runtime-context', () => ({
  hydrateSystemLogRecordRuntimeContext: hydrateSystemLogRecordRuntimeContextMock,
}));

vi.mock('@/features/ai/insights/generator', () => ({
  generateLogInterpretation: generateLogInterpretationMock,
}));

describe('system logs interpret handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hydrates AI-path run static context before generating the log interpretation', async () => {
    const { POST_handler } = await import('./handler');

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
        staticContext: {
          aiPathRun: {
            kind: 'ai_path_run',
            runId: 'run-1',
            status: 'failed',
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
      body: JSON.stringify({ logId: 'log-1' }),
    });

    const response = await POST_handler(req, {} as never);
    const data = await response.json();

    expect(startAiInsightsQueueMock).toHaveBeenCalledTimes(1);
    expect(getSystemLogByIdMock).toHaveBeenCalledWith('log-1');
    expect(hydrateSystemLogRecordRuntimeContextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'log-1',
      })
    );
    expect(generateLogInterpretationMock).toHaveBeenCalledWith({
      source: 'manual',
      log: expect.objectContaining({
        id: 'log-1',
        context: expect.objectContaining({
          runId: 'run-1',
          staticContext: {
            aiPathRun: expect.objectContaining({
              kind: 'ai_path_run',
              runId: 'run-1',
            }),
          },
        }),
      }),
    });
    expect(data).toEqual({ insight: { id: 'insight-1' } });
  });
});
