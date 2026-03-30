import { describe, it, expect, vi, beforeEach } from 'vitest';

import * as api from '@/shared/lib/ai-paths/api';
import {
  handleAgent,
  handleLearnerAgent,
  pollAgentRun,
} from '@/shared/lib/ai-paths/core/runtime/handlers/agent';

import { createMockContext } from '../test-utils';

vi.mock('@/shared/lib/ai-paths/api', () => ({
  agentApi: {
    enqueue: vi.fn(),
    poll: vi.fn(),
  },
  learnerAgentsApi: {
    chat: vi.fn(),
  },
  settingsApi: {
    list: vi.fn(),
  },
}));

describe('Agent Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleAgent', () => {
    it('should enqueue agent run', async () => {
      vi.mocked(api.settingsApi.list).mockResolvedValue({ ok: true, data: [] } as any);
      vi.mocked(api.agentApi.enqueue).mockResolvedValue({
        ok: true,
        data: { runId: 'run-123', status: 'queued' },
      } as any);

      const ctx = createMockContext({
        node: {
          id: 'n1',
          type: 'agent',
          config: { agent: { waitForResult: false } },
        } as any,
        nodeInputs: { prompt: 'Do something' },
      });
      const result = await handleAgent(ctx);
      expect(result['jobId']).toBe('run-123');
      expect(api.agentApi.enqueue).toHaveBeenCalled();
    });
  });

  describe('handleLearnerAgent', () => {
    it('should chat with learner agent', async () => {
      vi.mocked(api.learnerAgentsApi.chat).mockResolvedValue({
        ok: true,
        data: { message: 'Agent response', sources: [] },
      } as any);

      const ctx = createMockContext({
        node: {
          id: 'n1',
          type: 'learner_agent',
          config: { learnerAgent: { agentId: 'agent-1' } },
        } as any,
        nodeInputs: { prompt: 'Question' },
      });
      const result = await handleLearnerAgent(ctx);
      expect(result['result']).toBe('Agent response');
      expect(api.learnerAgentsApi.chat).toHaveBeenCalledWith({
        agentId: 'agent-1',
        messages: [
          expect.objectContaining({
            role: 'user',
            content: 'Question',
            id: expect.stringMatching(/^msg_/),
            sessionId: 'test-run-id',
            timestamp: expect.any(String),
          }),
        ],
      });
    });

    it('blocks when learner agent id is missing', async () => {
      const ctx = createMockContext({
        node: {
          id: 'n1',
          type: 'learner_agent',
          config: { learnerAgent: { agentId: '   ' } },
        } as any,
        nodeInputs: { prompt: 'Question' },
      });

      const result = await handleLearnerAgent(ctx);

      expect(result['status']).toBe('blocked');
      expect(result['skipReason']).toBe('missing_agent_id');
      expect(api.learnerAgentsApi.chat).not.toHaveBeenCalled();
    });

    it('reuses previous outputs when the payload hash is unchanged', async () => {
      const prevOutputs = { payloadHash: 'same-hash', result: 'old-result' };
      const hashSpy = vi.spyOn(await import('@/shared/lib/ai-paths/core/utils'), 'hashRuntimeValue');
      hashSpy.mockReturnValue('same-hash');

      const ctx = createMockContext({
        node: {
          id: 'n1',
          type: 'learner_agent',
          config: { learnerAgent: { agentId: 'agent-1' } },
        } as any,
        nodeInputs: { prompt: 'Question' },
        prevOutputs,
      });

      const result = await handleLearnerAgent(ctx);

      expect(result).toBe(prevOutputs);
      expect(api.learnerAgentsApi.chat).not.toHaveBeenCalled();
      hashSpy.mockRestore();
    });
  });

  describe('pollAgentRun', () => {
    it('returns when the polled run reaches waiting_human', async () => {
      vi.mocked(api.agentApi.poll)
        .mockResolvedValueOnce({
          ok: true,
          data: { run: { id: 'run-1', status: 'queued' } },
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          data: { run: { id: 'run-1', status: 'waiting_human' } },
        } as any);

      await expect(pollAgentRun('run-1', { intervalMs: 0, maxAttempts: 2 })).resolves.toEqual({
        run: { id: 'run-1', status: 'waiting_human' },
        status: 'waiting_human',
      });
    });

    it('throws when the agent poll reports a failed run', async () => {
      vi.mocked(api.agentApi.poll).mockResolvedValueOnce({
        ok: true,
        data: { run: { id: 'run-1', status: 'failed', errorMessage: 'broken' } },
      } as any);

      await expect(pollAgentRun('run-1', { intervalMs: 0, maxAttempts: 1 })).rejects.toThrow(
        'broken'
      );
    });
  });
});
