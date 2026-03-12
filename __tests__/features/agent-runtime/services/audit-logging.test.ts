import { vi, describe, it, expect, beforeEach } from 'vitest';

const { agentAuditLogCreateMock, getAgentAuditLogDelegateMock } = vi.hoisted(() => ({
  agentAuditLogCreateMock: vi.fn(),
  getAgentAuditLogDelegateMock: vi.fn(),
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/features/ai/agent-runtime/store-delegates', () => ({
  getAgentAuditLogDelegate: getAgentAuditLogDelegateMock,
}));

import { logAgentAudit } from '@/features/ai/agent-runtime/audit/index';

describe('Agent Runtime - Audit Logging', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    agentAuditLogCreateMock.mockReset().mockResolvedValue(undefined);
    getAgentAuditLogDelegateMock.mockReturnValue({
      create: agentAuditLogCreateMock,
    });
  });

  it('should create an audit log entry with metadata', async () => {
    const metadata = {
      step: 'test',
      timestamp: new Date('2026-01-30T12:00:00Z'),
      big: BigInt(123),
    };

    await logAgentAudit('run-123', 'info', 'Test message', metadata);

    expect(agentAuditLogCreateMock).toHaveBeenCalledWith({
      data: {
        runId: 'run-123',
        level: 'info',
        message: 'Test message',
        metadata: {
          step: 'test',
          timestamp: '2026-01-30T12:00:00.000Z',
          big: '123',
        },
      },
    });
  });

  it('should handle missing metadata', async () => {
    await logAgentAudit('run-123', 'warning', 'Warning message');

    expect(agentAuditLogCreateMock).toHaveBeenCalledWith({
      data: {
        runId: 'run-123',
        level: 'warning',
        message: 'Warning message',
      },
    });
  });

  it('should gracefully handle database errors', async () => {
    agentAuditLogCreateMock.mockRejectedValue(new Error('DB Down'));

    // Should not throw
    await expect(logAgentAudit('run-1', 'error', 'Fail')).resolves.not.toThrow();
  });
});
