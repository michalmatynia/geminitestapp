import { afterEach, describe, expect, it, vi } from 'vitest';

const { runBrainChatCompletionMock, agentAuditLogCreateMock } = vi.hoisted(() => ({
  runBrainChatCompletionMock: vi.fn(),
  agentAuditLogCreateMock: vi.fn(),
}));

vi.mock('@/shared/lib/ai-brain/server-runtime-client', () => ({
  runBrainChatCompletion: runBrainChatCompletionMock,
}));

vi.mock('@/shared/lib/db/prisma', () => ({
  default: {
    agentAuditLog: {
      create: agentAuditLogCreateMock,
    },
  },
}));

import { buildSearchQueryWithLLM } from '@/features/ai/agent-runtime/tools/llm';

describe('agent runtime llm transport', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    runBrainChatCompletionMock.mockReset();
    agentAuditLogCreateMock.mockReset();
  });

  it('routes structured helper calls through the Brain runtime client', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    runBrainChatCompletionMock.mockResolvedValue({
      text: '{"query":"best product catalog","intent":"search"}',
      vendor: 'anthropic',
      modelId: 'claude-3-5-sonnet',
    });

    const result = await buildSearchQueryWithLLM(
      {
        model: 'anthropic:claude-3-5-sonnet',
        runId: 'run-1',
      },
      'find a product catalog'
    );

    expect(result).toBe('best product catalog');
    expect(runBrainChatCompletionMock).toHaveBeenCalledWith({
      modelId: 'anthropic:claude-3-5-sonnet',
      temperature: 0.2,
      jsonMode: true,
      messages: [
        {
          role: 'system',
          content: 'You craft concise web search queries. Return only JSON with keys: query, intent.',
        },
        {
          role: 'user',
          content: JSON.stringify({ prompt: 'find a product catalog' }),
        },
      ],
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
