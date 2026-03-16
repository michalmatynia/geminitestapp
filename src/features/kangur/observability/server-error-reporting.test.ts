/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { captureExceptionMock } = vi.hoisted(() => ({
  captureExceptionMock: vi.fn(),
}));

vi.mock('@/features/kangur/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: captureExceptionMock,
  },
}));

import { reportKangurServerError, withKangurServerError } from './server-error-reporting';

describe('kangur server error reporting', () => {
  beforeEach(() => {
    captureExceptionMock.mockClear();
  });

  it('reports server errors with the provided context', () => {
    const error = new Error('boom');

    reportKangurServerError(error, {
      source: 'kangur.test',
      action: 'sync',
      description: 'Test server error reporting.',
      context: {
        jobId: 'job-1',
        detail: 'extra',
      },
    });

    expect(captureExceptionMock).toHaveBeenCalledWith(
      error,
      expect.objectContaining({
        service: 'kangur.test',
        source: 'kangur.test',
        action: 'sync',
        description: 'Test server error reporting.',
        jobId: 'job-1',
        detail: 'extra',
      })
    );
  });

  it('wraps async tasks and returns the fallback on failure', async () => {
    const error = new Error('fail');

    const result = await withKangurServerError(
      {
        source: 'kangur.test',
        action: 'task',
        description: 'Run a task with observability.',
      },
      async () => {
        throw error;
      },
      {
        fallback: 'fallback',
        shouldRethrow: () => false,
      }
    );

    expect(result).toBe('fallback');
    expect(captureExceptionMock).toHaveBeenCalled();
  });

  it('skips reporting when shouldReport returns false', async () => {
    const error = new Error('silent');

    const result = await withKangurServerError(
      {
        source: 'kangur.test',
        action: 'silent',
        description: 'Do not report this error.',
      },
      async () => {
        throw error;
      },
      {
        fallback: null,
        shouldReport: () => false,
        shouldRethrow: () => false,
      }
    );

    expect(result).toBeNull();
    expect(captureExceptionMock).not.toHaveBeenCalled();
  });
});
