/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.unmock('@/shared/lib/observability/system-logger');

import { notifyCriticalError } from '@/shared/lib/observability/critical-error-notifier';
import { REDACTED_VALUE } from '@/shared/lib/observability/log-redaction';
import { createSystemLog } from '@/shared/lib/observability/system-log-repository';
import { hydrateLogRuntimeContext } from '@/shared/lib/observability/runtime-context/hydrate-system-log-runtime-context';
import {
  logSystemEvent,
  logSystemError,
  normalizeErrorInfo,
  buildErrorFingerprint,
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

describe('system-logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.mocked(hydrateLogRuntimeContext).mockImplementation(async (context) => context);
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

    it('should enrich persisted context with AI path run static context when runId is present', async () => {
      vi.mocked(hydrateLogRuntimeContext).mockResolvedValue({
        runId: 'run-1',
        fingerprint: 'fp-1',
        staticContext: {
          aiPathRun: {
            kind: 'ai_path_run',
            runId: 'run-1',
            status: 'failed',
          },
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
              staticContext: {
                aiPathRun: expect.objectContaining({
                  kind: 'ai_path_run',
                  runId: 'run-1',
                }),
              },
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

      vi.mocked(hydrateLogRuntimeContext).mockResolvedValue({
        runId: 'run-1',
        fingerprint: 'fp-1',
        staticContext: {
          aiPathRun: {
            kind: 'ai_path_run',
            runId: 'run-1',
            status: 'failed',
          },
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

      const fetchPayload = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body ?? '{}')) as {
        context?: Record<string, unknown>;
      };
      expect(fetchPayload.context).toEqual(
        expect.objectContaining({
          runId: 'run-1',
          fingerprint: expect.any(String),
          staticContext: {
            aiPathRun: expect.objectContaining({
              runId: 'run-1',
            }),
          },
        })
      );
      expect(createSystemLog).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            runId: 'run-1',
            fingerprint: expect.any(String),
            staticContext: {
              aiPathRun: expect.objectContaining({
                runId: 'run-1',
              }),
            },
          }),
        })
      );
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
