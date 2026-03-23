import { describe, it, expect, vi, beforeEach } from 'vitest';

import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { notifyErrorEnrichers } from '@/shared/utils/observability/error-enricher-registry';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

// Mock dependencies — ErrorSystem imports from lib/system-logger, not server barrel
vi.mock('@/shared/lib/observability/system-logger', () => ({
  logSystemEvent: vi.fn().mockResolvedValue(undefined),
  logSystemError: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/shared/utils/observability/error-enricher-registry', () => ({
  notifyErrorEnrichers: vi.fn().mockResolvedValue(undefined),
}));

describe('ErrorSystem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('captures and logs an Error object', async () => {
    const error = new Error('Test exception');
    const context = { service: 'test-service' };

    await ErrorSystem.captureException(error, context);

    expect(logSystemEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'error',
        message: '[test-service] Test exception',
        source: 'test-service',
        error,
      })
    );
  });

  it('captures and logs a string error', async () => {
    await ErrorSystem.captureException('Something went wrong', { service: 'ui' });

    expect(logSystemEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'error',
        message: '[ui] Something went wrong',
        source: 'ui',
      })
    );
  });

  it('notifies error enrichers if runId is provided', async () => {
    const error = new Error('Agent failed');
    const context = { service: 'agent', runId: 'run-123', errorId: 'err-456' };

    await ErrorSystem.captureException(error, context);

    expect(notifyErrorEnrichers).toHaveBeenCalledWith(
      error,
      expect.objectContaining({
        level: 'error',
        message: 'Agent failed',
        errorId: 'err-456',
        runId: 'run-123',
      })
    );
  });

  it('logs warnings and notifies enrichers with warning context', async () => {
    await ErrorSystem.logWarning('Low disk space', { service: 'disk' });
    expect(logSystemEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'warn',
        message: '[disk] Low disk space',
      })
    );

    const agentContext = { service: 'agent', runId: 'run-123' };
    await ErrorSystem.logWarning('Retry limit reached', agentContext);
    expect(notifyErrorEnrichers).toHaveBeenCalledWith(
      'Retry limit reached',
      expect.objectContaining({
        ...agentContext,
        level: 'warn',
        message: 'Retry limit reached',
      })
    );
  });

  it('logs info messages', async () => {
     
    await ErrorSystem.logInfo('User logged in', { userId: 'user-1' });
    expect(logSystemEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'info',
        message: '[unknown] User logged in',
      })
    );
  });
});
