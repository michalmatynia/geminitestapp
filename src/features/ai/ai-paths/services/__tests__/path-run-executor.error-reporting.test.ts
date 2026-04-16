import { describe, expect, it, vi, beforeEach } from 'vitest';

const { captureExceptionMock, logClientErrorMock } = vi.hoisted(() => ({
  captureExceptionMock: vi.fn(),
  logClientErrorMock: vi.fn(),
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: captureExceptionMock,
  },
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientError: logClientErrorMock,
}));

import { createErrorReporting } from '@/features/ai/ai-paths/services/path-run-executor/error-reporting';

describe('createErrorReporting', () => {
  beforeEach(() => {
    captureExceptionMock.mockReset();
    logClientErrorMock.mockReset();
    captureExceptionMock.mockResolvedValue(undefined);
  });

  it('persists warning-severity reports as warn-level run events', async () => {
    const createRunEvent = vi.fn().mockResolvedValue(undefined);

    const { reportAiPathsError } = createErrorReporting({
      run: {
        id: 'run-1',
      } as never,
      repo: {
        createRunEvent,
      } as never,
      traceId: 'trace-1',
      runtimeFingerprint: 'runtime-fingerprint',
      runStartedAt: '2026-04-14T00:00:00.000Z',
      runtimeKernelExecutionTelemetry: {},
    });

    await reportAiPathsError(new Error('Database write affected 0 records for update.'), {
      nodeId: 'node-1',
      errorSeverity: 'warning',
      errorCode: 'AI_PATHS_DB_WRITE_ZERO_AFFECTED',
      errorCategory: 'database',
      errorScope: 'node',
    });

    expect(createRunEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: 'run-1',
        level: 'warn',
        message: 'Database write affected 0 records for update.',
        metadata: expect.objectContaining({
          errorCode: 'AI_PATHS_DB_WRITE_ZERO_AFFECTED',
          errorCategory: 'database',
          errorScope: 'node',
          errorReport: expect.objectContaining({
            severity: 'warning',
            code: 'AI_PATHS_DB_WRITE_ZERO_AFFECTED',
          }),
        }),
      })
    );
  });
});
