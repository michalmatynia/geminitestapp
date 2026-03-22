import { beforeEach, describe, expect, it, vi } from 'vitest';

const { runBrainChatCompletionMock } = vi.hoisted(() => ({
  runBrainChatCompletionMock: vi.fn(),
}));

vi.mock('@/shared/lib/ai-brain/server-runtime-client', () => ({
  runBrainChatCompletion: runBrainChatCompletionMock,
}));

import { runChatbotModel } from '@/shared/lib/ai/chatbot/server-model-runtime';

describe('runChatbotModel', () => {
  beforeEach(() => {
    runBrainChatCompletionMock.mockReset();
    process.env['NEXT_PUBLIC_APP_URL'] = 'https://kangur.example/';
  });

  it('normalizes messages and image payloads before delegating to the brain runtime', async () => {
    runBrainChatCompletionMock.mockResolvedValue({
      text: '  Final answer  ',
      modelId: 'gpt-4.1-mini',
      vendor: 'openai',
    });

    const result = await runChatbotModel({
      modelId: 'gpt-4.1-mini',
      temperature: 0.3,
      maxTokens: 400,
      systemPrompt: '  Keep answers short.  ',
      messages: [
        { role: 'unknown', content: 'Explain this', images: ['/uploads/item.png', 'YWJj'] },
        { role: 'assistant', content: 'Previous reply', images: [] },
        { role: 'system', content: 'Secondary instruction', images: [] },
        { role: 'user', content: '   ', images: [] },
      ],
    });

    expect(runBrainChatCompletionMock).toHaveBeenCalledWith({
      modelId: 'gpt-4.1-mini',
      temperature: 0.3,
      maxTokens: 400,
      messages: [
        {
          role: 'system',
          content: 'Keep answers short.',
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Explain this' },
            {
              type: 'image_url',
              image_url: { url: 'https://kangur.example/uploads/item.png' },
            },
            {
              type: 'image_url',
              image_url: { url: 'data:image/jpeg;base64,YWJj' },
            },
          ],
        },
        {
          role: 'assistant',
          content: 'Previous reply',
        },
        {
          role: 'system',
          content: 'Secondary instruction',
        },
      ],
    });
    expect(result).toEqual({
      message: 'Final answer',
      modelId: 'gpt-4.1-mini',
      provider: 'openai',
    });
  });
});
