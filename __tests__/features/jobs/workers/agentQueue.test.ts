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
import legacySqlClient from '@/shared/lib/db/legacy-sql-client';

vi.mock('@/shared/lib/db/legacy-sql-client', () => {
  const mockChatbotAgentRun = {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  };
  return {
    default: new Proxy(
      {},
      {
        get: (_target, prop) => {
          if (prop === 'chatbotAgentRun') return mockChatbotAgentRun;
          return undefined;
        },
        has: (_target, prop) => prop === 'chatbotAgentRun',
      }
    ),
  };
});

vi.mock('@/features/ai/agent-runtime/server', () => ({
  runAgentControlLoop: vi.fn(),
  logAgentAudit: vi.fn(),
}));

describe('Agent Queue Worker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stopAgentQueue();
    vi.mocked(legacySqlClient.chatbotAgentRun.findMany).mockResolvedValue([]);
    vi.mocked(legacySqlClient.chatbotAgentRun.findFirst).mockResolvedValue(null);
    vi.mocked(legacySqlClient.chatbotAgentRun.update).mockResolvedValue({} as any);
  });

  afterEach(() => {
    stopAgentQueue();
  });

  it('processes a queued agent run', async () => {
    const mockRun = { id: 'run-1', status: 'queued', createdAt: new Date() };
    vi.mocked(legacySqlClient.chatbotAgentRun.findFirst).mockResolvedValue(mockRun as any);
    vi.mocked(runAgentControlLoop).mockResolvedValue(undefined);

    await processNextQueuedAgentRun();

    expect(legacySqlClient.chatbotAgentRun.findFirst).toHaveBeenCalled();
    expect(legacySqlClient.chatbotAgentRun.update).toHaveBeenCalledWith(
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
    vi.mocked(legacySqlClient.chatbotAgentRun.findMany).mockResolvedValue([stuckRun] as any);

    await processNextQueuedAgentRun();

    expect(legacySqlClient.chatbotAgentRun.update).toHaveBeenCalledWith(
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
    vi.mocked(legacySqlClient.chatbotAgentRun.findFirst).mockResolvedValue(mockRun as any);
    vi.mocked(runAgentControlLoop).mockRejectedValue(new Error('Agent Crash'));

    await processNextQueuedAgentRun();

    expect(logAgentAudit).toHaveBeenCalledWith(
      'run-fail',
      'error',
      expect.any(String),
      expect.any(Object)
    );
    expect(legacySqlClient.chatbotAgentRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'run-fail' },
        data: expect.objectContaining({ status: 'failed', errorMessage: 'Agent Crash' }),
      })
    );
  });
});
