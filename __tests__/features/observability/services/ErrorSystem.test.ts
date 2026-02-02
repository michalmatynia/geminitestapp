import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ErrorSystem } from '@/features/observability/services/error-system';
import { logger } from '@/shared/utils/logger';
import { logAgentAudit } from '@/features/ai/agent-runtime/server';

// Mock dependencies
vi.mock('@/shared/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('@/features/ai/agent-runtime/server', () => ({
  logAgentAudit: vi.fn(),
}));

describe('ErrorSystem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('captures and logs an Error object', async () => {
    const error = new Error('Test exception');
    const context = { service: 'test-service' };
    
    await ErrorSystem.captureException(error, context);

    expect(logger.error).toHaveBeenCalledWith(
      '[test-service] Test exception',
      expect.objectContaining({
        service: 'test-service',
        stack: error.stack,
      })
    );
  });

  it('captures and logs a string error', async () => {
    await ErrorSystem.captureException('Something went wrong', { service: 'ui' });

    expect(logger.error).toHaveBeenCalledWith(
      '[ui] Something went wrong',
      expect.objectContaining({ service: 'ui' })
    );
  });

  it('logs to agent audit if runId is provided', async () => {
    const error = new Error('Agent failed');
    const context = { service: 'agent', runId: 'run-123', errorId: 'err-456' };

    await ErrorSystem.captureException(error, context);

    expect(logAgentAudit).toHaveBeenCalledWith(
      'run-123',
      'error',
      'Agent failed',
      expect.objectContaining({
        errorId: 'err-456',
        runId: 'run-123',
      })
    );
  });

  it('logs warnings and optionally to agent audit', async () => {
    await ErrorSystem.logWarning('Low disk space', { service: 'disk' });
    expect(logger.warn).toHaveBeenCalledWith('[disk] Low disk space', { service: 'disk' });

    const agentContext = { service: 'agent', runId: 'run-123' };
    await ErrorSystem.logWarning('Retry limit reached', agentContext);
    expect(logAgentAudit).toHaveBeenCalledWith('run-123', 'warning', 'Retry limit reached', agentContext);
  });

  it('logs info messages', async () => {
    await ErrorSystem.logInfo('User logged in', { userId: 'user-1' });
    expect(logger.info).toHaveBeenCalledWith('[unknown] User logged in', { userId: 'user-1' });
  });
});
