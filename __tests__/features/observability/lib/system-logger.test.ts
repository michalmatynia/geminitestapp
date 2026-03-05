/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.unmock('@/shared/lib/observability/system-logger');

import { notifyCriticalError } from '@/shared/lib/observability/critical-error-notifier';
import { REDACTED_VALUE } from '@/shared/lib/observability/log-redaction';
import { emitOtelLogRecord } from '@/shared/lib/observability/otel-log-bridge';
import {
  loadCentralLogDeadLetters,
  saveCentralLogDeadLetters,
} from '@/shared/lib/observability/central-log-dead-letter-store';
import { createSystemLog } from '@/shared/lib/observability/system-log-repository';
import { hydrateLogRuntimeContext } from '@/shared/lib/observability/runtime-context/hydrate-system-log-runtime-context';
import {
  logSystemEvent,
  logSystemError,
  normalizeErrorInfo,
  buildErrorFingerprint,
  getCentralLoggingRuntimeStats,
} from '@/shared/lib/observability/system-logger';
import { AppError, AppErrorCodes } from '@/shared/errors/app-error';

vi.mock('@/shared/lib/observability/system-log-repository', () => ({
  createSystemLog: vi.fn().mockResolvedValue({ id: 'log-1', level: 'info', message: 'test', createdAt: new Date().toISOString() }),
}));

vi.mock('@/shared/lib/observability/critical-error-notifier', () => ({
  notifyCriticalError: vi.fn().mockResolvedValue({ delivered: true, throttled: false }),
}));

vi.mock('@/shared/lib/observability/runtime-context/hydrate-system-log-runtime-context', () => ({
  hydrateLogRuntimeContext: vi.fn().mockImplementation(async (context) => context),
}));

vi.mock('@/shared/lib/observability/otel-log-bridge', () => ({
  emitOtelLogRecord: vi.fn(),
}));

vi.mock('@/shared/lib/observability/central-log-dead-letter-store', () => ({
  loadCentralLogDeadLetters: vi.fn().mockResolvedValue([]),
  saveCentralLogDeadLetters: vi.fn().mockResolvedValue(true),
}));

describe('system-logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.mocked(hydrateLogRuntimeContext).mockImplementation(async (context) => context);
    vi.mocked(loadCentralLogDeadLetters).mockResolvedValue([]);
    vi.mocked(saveCentralLogDeadLetters).mockResolvedValue(true);
    vi.unstubAllGlobals();
    delete process.env['CENTRAL_LOG_WEBHOOK_URL'];
  });

  describe('normalizeErrorInfo', () => {
    it('should normalize Error objects', () => {
      const error = new Error('Test error');
      const normalized = normalizeErrorInfo(error);
      expect(normalized.message).toBe('Test error');
      expect(normalized.name).toBe('Error');
      expect(normalized.stack).toBeDefined();
    });

    it('should handle strings', () => {
      const normalized = normalizeErrorInfo('Test string error');
      expect(normalized.message).toBe('Test string error');
    });

    it('should handle arbitrary objects', () => {
      const normalized = normalizeErrorInfo({ foo: 'bar' });
      expect(normalized.message).toBe('Unknown error');
      expect(normalized.raw).toEqual({ foo: 'bar' });
    });
  });

  describe('log-redaction integration', () => {
    it('should redact sensitive keys in context', async () => {
      await logSystemEvent({
        message: 'Test message',
        source: 'test',
        context: { password: 'secret123', token: 'abc-123', safe: 'value' },
      });

      await vi.waitFor(() => {
        expect(createSystemLog).toHaveBeenCalledWith(
          expect.objectContaining({
            context: expect.objectContaining({
              password: REDACTED_VALUE,
              token: REDACTED_VALUE,
              safe: 'value',
            }),
          })
        );
      });
    });
  });

  describe('buildErrorFingerprint', () => {
    it('should generate consistent fingerprints', () => {
      const input = {
        message: 'Test error',
        source: 'api',
        path: '/api/test',
        statusCode: 500,
      };
      const f1 = buildErrorFingerprint(input);
      const f2 = buildErrorFingerprint(input);
      expect(f1).toBe(f2);
      expect(f1).toHaveLength(16);
    });

    it('should differ for different inputs', () => {
      const f1 = buildErrorFingerprint({ message: 'Error 1' });
      const f2 = buildErrorFingerprint({ message: 'Error 2' });
      expect(f1).not.toBe(f2);
    });
  });

  describe('logSystemEvent', () => {
    it('should call createSystemLog with default info level', async () => {
      await logSystemEvent({ message: 'Hello', source: 'test' });
      await vi.waitFor(() => {
        expect(createSystemLog).toHaveBeenCalledWith(
          expect.objectContaining({
            level: 'info',
            message: 'Hello',
          })
        );
      });
    });

    it('should emit an OpenTelemetry log record with correlation attributes', async () => {
      await logSystemEvent({
        level: 'warn',
        message: 'Telemetry bridge event',
        source: 'observability.logs',
        context: {
          requestId: 'req-1',
          traceId: 'trace-1',
          correlationId: 'corr-1',
          otelTraceId: 'otel-trace-1',
          otelSpanId: 'otel-span-1',
        },
      });

      await vi.waitFor(() => {
        expect(emitOtelLogRecord).toHaveBeenCalledWith(
          expect.objectContaining({
            level: 'warn',
            message: 'Telemetry bridge event',
            source: 'observability.logs',
            context: expect.objectContaining({
              requestId: 'req-1',
              traceId: 'trace-1',
              correlationId: 'corr-1',
              otelTraceId: 'otel-trace-1',
              otelSpanId: 'otel-span-1',
            }),
          })
        );
      });
    });

    it('should log a system error', async () => {
      const error = new Error('Boom');
      await logSystemError({
        message: 'An error occurred',
        error,
      });
      
      await vi.waitFor(() => {
        expect(createSystemLog).toHaveBeenCalledWith(
          expect.objectContaining({
            level: 'error',
            message: 'An error occurred',
            stack: error.stack,
            context: expect.objectContaining({
              error: expect.objectContaining({
                message: 'Boom',
              }),
              fingerprint: expect.any(String),
            }),
          })
        );
      });
    });

    it('should preserve AppError metadata and cause chain', async () => {
      const rootCause = new Error('Database timeout');
      const appError = new AppError('Invalid payload', {
        code: AppErrorCodes.validation,
        httpStatus: 400,
        expected: true,
        retryable: false,
        cause: rootCause,
        meta: { field: 'sku' },
      });

      await logSystemError({
        message: 'Validation failed',
        source: 'products.v2',
        error: appError,
      });

      await vi.waitFor(() => {
        expect(createSystemLog).toHaveBeenCalledWith(
          expect.objectContaining({
            level: 'error',
            context: expect.objectContaining({
              errorCode: AppErrorCodes.validation,
              errorName: 'AppError',
              error: expect.objectContaining({
                code: AppErrorCodes.validation,
                httpStatus: 400,
                expected: true,
                meta: expect.objectContaining({ field: 'sku' }),
                causeChain: expect.arrayContaining([
                  expect.objectContaining({ message: 'Database timeout' }),
                ]),
              }),
            }),
          })
        );
      });
    });

    it('should notify critical errors', async () => {
      await logSystemEvent({ message: 'Critical fail', source: 'test', level: 'error', critical: true });
      await vi.waitFor(() => {
        expect(notifyCriticalError).toHaveBeenCalled();
      });
    });

    it('should handle circular references in context', async () => {
      const context: Record<string, unknown> = { a: 1 };
      context['self'] = context;

      await logSystemEvent({ message: 'Circular', source: 'test', context });

      await vi.waitFor(() => {
        const calls = vi.mocked(createSystemLog).mock.calls;
        expect(calls.length).toBeGreaterThan(0);
        const actualContext = calls[0]?.[0].context as any;
        expect(actualContext.self.self).toBe('[Circular]');
      });
    });

    it('should extract info from Request', async () => {
      const req = new Request('http://localhost/api/test', {
        method: 'POST',
        headers: { 'x-request-id': 'req-123' },
      });

      await logSystemEvent({
        message: 'Request log',
        request: req,
      });

      await vi.waitFor(() => {
        expect(createSystemLog).toHaveBeenCalledWith(
          expect.objectContaining({
            path: '/api/test',
            method: 'POST',
            requestId: 'req-123',
          })
        );
      });
    });

    it('should enrich persisted context with canonical context-registry refs when runId is present', async () => {
      vi.mocked(hydrateLogRuntimeContext).mockResolvedValue({
        runId: 'run-1',
        fingerprint: 'fp-1',
        contextRegistry: {
          refs: [
            {
              id: 'runtime:ai-path-run:run-1',
              kind: 'runtime_document',
              providerId: 'ai-path-run',
              entityType: 'ai_path_run',
            },
          ],
          engineVersion: 'registry:codefirst:7|providers:ai-path-run@1',
        },
      });

      await logSystemEvent({
        message: 'Run failed',
        source: 'ai-paths-worker',
        level: 'error',
        context: {
          runId: 'run-1',
          fingerprint: 'fp-1',
        },
      });

      await vi.waitFor(() => {
        expect(hydrateLogRuntimeContext).toHaveBeenCalledWith(
          expect.objectContaining({
            runId: 'run-1',
            fingerprint: expect.any(String),
          })
        );
        expect(createSystemLog).toHaveBeenCalledWith(
          expect.objectContaining({
            context: expect.objectContaining({
              runId: 'run-1',
              fingerprint: expect.any(String),
              contextRegistry: expect.objectContaining({
                refs: [
                  expect.objectContaining({
                    id: 'runtime:ai-path-run:run-1',
                  }),
                ],
              }),
            }),
          })
        );
      });
    });

    it('should continue persisting logs when AI path static context enrichment fails', async () => {
      vi.mocked(hydrateLogRuntimeContext).mockRejectedValue(new Error('Static context builder failed'));

      await logSystemEvent({
        message: 'Run failed',
        source: 'ai-paths-worker',
        level: 'error',
        context: {
          runId: 'run-1',
        },
      });

      await vi.waitFor(() => {
        expect(createSystemLog).toHaveBeenCalledWith(
          expect.objectContaining({
            context: expect.objectContaining({
              runId: 'run-1',
              fingerprint: expect.any(String),
            }),
          })
        );
      });
    });

    it('should forward the hydrated runtime context to centralized logging and persist the same enriched payload', async () => {
      const fetchMock = vi.fn().mockResolvedValue({ ok: true });
      vi.stubGlobal('fetch', fetchMock);
      process.env['CENTRAL_LOG_WEBHOOK_URL'] = 'https://logs.example.test/webhook';
      const beforeStats = getCentralLoggingRuntimeStats();

      vi.mocked(hydrateLogRuntimeContext).mockResolvedValue({
        runId: 'run-1',
        fingerprint: 'fp-1',
        contextRegistry: {
          refs: [
            {
              id: 'runtime:ai-path-run:run-1',
              kind: 'runtime_document',
              providerId: 'ai-path-run',
              entityType: 'ai_path_run',
            },
          ],
          engineVersion: 'registry:codefirst:7|providers:ai-path-run@1',
        },
      });

      await logSystemEvent({
        message: 'Run failed',
        source: 'ai-paths-worker',
        level: 'error',
        context: { runId: 'run-1' },
      });

      await vi.waitFor(() => {
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(createSystemLog).toHaveBeenCalledTimes(1);
      });

      const afterStats = getCentralLoggingRuntimeStats();
      expect(afterStats.configured).toBe(true);
      expect(afterStats.webhookHost).toBe('logs.example.test');
      expect(afterStats.attempts).toBeGreaterThanOrEqual(beforeStats.attempts + 1);
      expect(afterStats.delivered).toBeGreaterThanOrEqual(beforeStats.delivered + 1);

      const fetchPayload = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body ?? '{}')) as {
        context?: Record<string, unknown>;
      };
      expect(fetchPayload.context).toEqual(
        expect.objectContaining({
          runId: 'run-1',
          fingerprint: expect.any(String),
          contextRegistry: expect.objectContaining({
            refs: [expect.objectContaining({ id: 'runtime:ai-path-run:run-1' })],
          }),
        })
      );
      expect(createSystemLog).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            runId: 'run-1',
            fingerprint: expect.any(String),
            contextRegistry: expect.objectContaining({
              refs: [expect.objectContaining({ id: 'runtime:ai-path-run:run-1' })],
            }),
          }),
        })
      );
    });

    it('should enqueue failed central deliveries into dead-letter backlog and replay after recovery', async () => {
      const fetchMock = vi
        .fn()
        .mockRejectedValueOnce(new Error('network outage 1'))
        .mockRejectedValueOnce(new Error('network outage 2'))
        .mockRejectedValueOnce(new Error('network outage 3'))
        .mockResolvedValue({ ok: true })
        .mockResolvedValue({ ok: true });
      vi.stubGlobal('fetch', fetchMock);
      process.env['CENTRAL_LOG_WEBHOOK_URL'] = 'https://logs.example.test/webhook';

      const beforeStats = getCentralLoggingRuntimeStats();

      await logSystemEvent({
        message: 'Central sink down',
        source: 'observability.test',
        level: 'error',
        context: { runId: 'run-down' },
      });

      await vi.waitFor(() => {
        const failedStats = getCentralLoggingRuntimeStats();
        expect(failedStats.failed).toBeGreaterThanOrEqual(beforeStats.failed + 1);
        expect(failedStats.deadLetterBacklog).toBeGreaterThanOrEqual(1);
        expect(failedStats.deadLetterPersisted).toBeGreaterThanOrEqual(
          beforeStats.deadLetterPersisted + 1
        );
      });

      const failedStats = getCentralLoggingRuntimeStats();

      await logSystemEvent({
        message: 'Central sink recovered',
        source: 'observability.test',
        level: 'error',
        context: { runId: 'run-up' },
      });

      await vi.waitFor(() => {
        const recoveredStats = getCentralLoggingRuntimeStats();
        expect(recoveredStats.deadLetterBacklog).toBe(0);
        expect(recoveredStats.deadLetterReplayed).toBeGreaterThanOrEqual(
          failedStats.deadLetterReplayed + 1
        );
        expect(recoveredStats.replayDelivered).toBeGreaterThanOrEqual(
          failedStats.replayDelivered + 1
        );
        expect(recoveredStats.deadLetterPersisted).toBeGreaterThanOrEqual(
          failedStats.deadLetterPersisted + 1
        );
      });
      expect(saveCentralLogDeadLetters).toHaveBeenCalled();
    });

    it('should skip runtime hydration in the browser path', async () => {
      vi.stubGlobal('window', {} as Window & typeof globalThis);

      await logSystemEvent({
        message: 'Client-side log',
        source: 'client',
        context: { runId: 'run-1' },
      });

      expect(hydrateLogRuntimeContext).not.toHaveBeenCalled();
      expect(createSystemLog).not.toHaveBeenCalled();
    });
  });
});
