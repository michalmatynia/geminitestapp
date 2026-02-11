import { describe, it, expect, vi, beforeEach } from 'vitest';

import { logAgentAudit } from '@/features/ai/agent-runtime/audit';
import { logSystemEvent } from '@/features/observability/lib/system-logger';
import { ErrorSystem } from '@/features/observability/services/error-system';

// Mock dependencies — ErrorSystem imports from lib/system-logger, not server barrel
vi.mock('@/features/observability/lib/system-logger', () => ({
  logSystemEvent: vi.fn().mockResolvedValue(undefined),
  logSystemError: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/features/ai/agent-runtime/audit', () => ({
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
    expect(logSystemEvent).toHaveBeenCalledWith(expect.objectContaining({
      level: 'warn',
      message: '[disk] Low disk space',
    }));

    const agentContext = { service: 'agent', runId: 'run-123' };
    await ErrorSystem.logWarning('Retry limit reached', agentContext);
    expect(logAgentAudit).toHaveBeenCalledWith('run-123', 'warning', 'Retry limit reached', agentContext);
  });

  it('logs info messages', async () => {
    await ErrorSystem.logInfo('User logged in', { userId: 'user-1' });
    expect(logSystemEvent).toHaveBeenCalledWith(expect.objectContaining({
      level: 'info',
      message: '[unknown] User logged in',
    }));
  });
});
