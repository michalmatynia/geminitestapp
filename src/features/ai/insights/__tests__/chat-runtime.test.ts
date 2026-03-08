import { beforeEach, describe, expect, it, vi } from 'vitest';

const { runBrainChatCompletionMock } = vi.hoisted(() => ({
  runBrainChatCompletionMock: vi.fn(),
}));

vi.mock('@/shared/lib/ai-brain/server-runtime-client', () => ({
  runBrainChatCompletion: runBrainChatCompletionMock,
}));

import { callInsightChatModel } from '../generator/chat-runtime';

describe('ai insights chat runtime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('routes insight prompts through the shared Brain runtime', async () => {
    runBrainChatCompletionMock.mockResolvedValue({
      text: 'Root cause analysis',
      vendor: 'openai',
      modelId: 'gpt-4o-mini',
    });

    const result = await callInsightChatModel({
      model: 'openai:gpt-4o-mini',
      messages: [
        {
          id: 'sys-1',
          sessionId: 'insights',
          role: 'system',
          content: 'You are a production reliability analyst reviewing system and error logs.',
          timestamp: '2026-03-08T00:00:00.000Z',
        },
        {
          id: 'user-1',
          sessionId: 'insights',
          role: 'user',
          content: 'Interpret this log entry.',
          timestamp: '2026-03-08T00:00:00.000Z',
        },
      ],
    });

    expect(result).toBe('Root cause analysis');
    expect(runBrainChatCompletionMock).toHaveBeenCalledWith({
      modelId: 'openai:gpt-4o-mini',
      temperature: 0.7,
      maxTokens: 1000,
      messages: [
        {
          role: 'system',
          content: 'You are a production reliability analyst reviewing system and error logs.',
        },
        {
          role: 'user',
          content: 'Interpret this log entry.',
        },
      ],
    });
  });

  it('rejects unsupported chat roles before invoking the Brain runtime', async () => {
    await expect(
      callInsightChatModel({
        model: 'openai:gpt-4o-mini',
        messages: [
          {
            id: 'tool-1',
            sessionId: 'insights',
            role: 'tool',
            content: 'Unsupported tool message.',
            timestamp: '2026-03-08T00:00:00.000Z',
          },
        ],
      })
    ).rejects.toThrow('Unsupported AI Insights message role: tool');

    expect(runBrainChatCompletionMock).not.toHaveBeenCalled();
  });
});
