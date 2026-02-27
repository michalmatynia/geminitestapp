import { describe, it, expect, vi, beforeEach } from 'vitest';

import * as api from '@/shared/lib/ai-paths/api';
import { 
  handleAgent, 
  handleLearnerAgent 
} from '@/shared/lib/ai-paths/core/runtime/handlers/agent';

import { createMockContext } from '../../test-utils';

vi.mock('@/features/ai/ai-paths/lib/api', () => ({
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
        data: { runId: 'run-123', status: 'queued' }
      } as any);

      const ctx = createMockContext({
        node: {
          id: 'n1',
          type: 'agent',
          config: { agent: { waitForResult: false } }
        } as any,
        nodeInputs: { prompt: 'Do something' }
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
        data: { message: 'Agent response', sources: [] }
      } as any);

      const ctx = createMockContext({
        node: {
          id: 'n1',
          type: 'learner_agent',
          config: { learnerAgent: { agentId: 'agent-1' } }
        } as any,
        nodeInputs: { prompt: 'Question' }
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
  });
});
