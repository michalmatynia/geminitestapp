import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('crypto', async (importOriginal) => {
  const actual = await importOriginal<typeof import('crypto')>();
  const mock = {
    ...actual,
    randomUUID: () => 'mock-uuid',
  };
  return {
    ...mock,
    default: mock,
  };
});

import { runAgentControlLoop, logAgentAudit } from '@/features/ai/agent-runtime/server';
import { processNextQueuedAgentRun } from '@/features/ai/agent-runtime/workers/agent-processor';
import { stopAgentQueue } from '@/features/ai/agent-runtime/workers/agentQueue';

const { chatbotAgentRunDelegate, agentAuditLogDelegate } = vi.hoisted(() => ({
  chatbotAgentRunDelegate: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  agentAuditLogDelegate: {
    create: vi.fn(),
  },
}));

vi.mock('@/features/ai/agent-runtime/store-delegates', () => ({
  getChatbotAgentRunDelegate: vi.fn(() => chatbotAgentRunDelegate),
  getAgentAuditLogDelegate: vi.fn(() => agentAuditLogDelegate),
}));

vi.mock('@/features/ai/agent-runtime/server', () => ({
  runAgentControlLoop: vi.fn(),
  logAgentAudit: vi.fn(),
}));

describe('Agent Queue Worker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stopAgentQueue();
    chatbotAgentRunDelegate.findMany.mockResolvedValue([]);
    chatbotAgentRunDelegate.findFirst.mockResolvedValue(null);
    chatbotAgentRunDelegate.update.mockResolvedValue({} as any);
  });

  afterEach(() => {
    stopAgentQueue();
  });

  it('processes a queued agent run', async () => {
    const mockRun = { id: 'run-1', status: 'queued', createdAt: new Date() };
    chatbotAgentRunDelegate.findFirst.mockResolvedValue(mockRun as any);
    vi.mocked(runAgentControlLoop).mockResolvedValue(undefined);

    await processNextQueuedAgentRun();

    expect(chatbotAgentRunDelegate.findFirst).toHaveBeenCalled();
    expect(chatbotAgentRunDelegate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'run-1' },
        data: expect.objectContaining({ status: 'running' }),
      })
    );
    expect(runAgentControlLoop).toHaveBeenCalledWith('run-1');
  });

  it('recovers stuck runs', async () => {
    const stuckRun = {
      id: 'run-stuck',
      status: 'running',
      updatedAt: new Date(Date.now() - 20 * 60 * 1000),
    };
    chatbotAgentRunDelegate.findMany.mockResolvedValue([stuckRun] as any);

    await processNextQueuedAgentRun();

    expect(chatbotAgentRunDelegate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'run-stuck' },
        data: expect.objectContaining({ status: 'queued' }),
      })
    );
    expect(logAgentAudit).toHaveBeenCalledWith(
      'run-stuck',
      'warning',
      expect.any(String),
      expect.any(Object)
    );
  });

  it('handles run failure', async () => {
    const mockRun = { id: 'run-fail', status: 'queued' };
    chatbotAgentRunDelegate.findFirst.mockResolvedValue(mockRun as any);
    vi.mocked(runAgentControlLoop).mockRejectedValue(new Error('Agent Crash'));

    await processNextQueuedAgentRun();

    expect(logAgentAudit).toHaveBeenCalledWith(
      'run-fail',
      'error',
      expect.any(String),
      expect.any(Object)
    );
    expect(chatbotAgentRunDelegate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'run-fail' },
        data: expect.objectContaining({ status: 'failed', errorMessage: 'Agent Crash' }),
      })
    );
  });
});
