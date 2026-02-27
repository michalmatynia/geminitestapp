/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { notifyCriticalError } from '@/shared/lib/observability/critical-error-notifier';
import { createSystemLog } from '@/shared/lib/observability/system-log-repository';
import { logSystemEvent, logSystemError } from '@/shared/lib/observability/system-logger';
import { AppError, AppErrorCodes } from '@/shared/errors/app-error';

vi.mock('@/shared/lib/observability/system-log-repository', () => ({
  createSystemLog: vi.fn().mockResolvedValue({ id: 'log-1', level: 'info', message: 'Logged' }),
}));

vi.mock('@/shared/lib/observability/critical-error-notifier', () => ({
  notifyCriticalError: vi.fn().mockResolvedValue({ delivered: true }),
}));

describe('system-logger', () => {
  const waitForAsyncLog = async (): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should log a system event', async () => {
    await logSystemEvent({
      level: 'info',
      message: 'Something happened',
      source: 'test',
      context: { foo: 'bar' },
    });
    await waitForAsyncLog();

    expect(createSystemLog).toHaveBeenCalledWith(expect.objectContaining({
      level: 'info',
      message: 'Something happened',
      source: 'test',
      context: expect.objectContaining({ foo: 'bar' }),
    }));
  });

  it('should log a system error', async () => {
    const error = new Error('Boom');
    await logSystemError({
      message: 'An error occurred',
      error,
    });
    await waitForAsyncLog();

    expect(createSystemLog).toHaveBeenCalledWith(expect.objectContaining({
      level: 'error',
      message: 'An error occurred',
      stack: error.stack,
      context: expect.objectContaining({
        error: expect.objectContaining({
          message: 'Boom',
        }),
        fingerprint: expect.any(String),
      }),
    }));
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
    await waitForAsyncLog();

    expect(createSystemLog).toHaveBeenCalledWith(expect.objectContaining({
      level: 'error',
      category: expect.any(String),
      context: expect.objectContaining({
        category: expect.any(String),
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
    }));
  });

  it('should notify for critical errors', async () => {
    const logResult = { id: 'log-critical', level: 'error', message: 'Critical!' };
    (createSystemLog as any).mockResolvedValue(logResult);

    await logSystemEvent({
      level: 'error',
      message: 'Critical!',
      critical: true,
    });
    await waitForAsyncLog();

    expect(notifyCriticalError).toHaveBeenCalledWith(logResult, true);
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
    await waitForAsyncLog();

    expect(createSystemLog).toHaveBeenCalledWith(expect.objectContaining({
      path: '/api/test',
      method: 'POST',
      requestId: 'req-123',
    }));
  });
});
