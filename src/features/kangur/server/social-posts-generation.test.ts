import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  resolveBrainExecutionConfigMock: vi.fn(),
  runBrainChatCompletionMock: vi.fn(),
  supportsBrainJsonModeMock: vi.fn(),
}));

vi.mock('@/shared/lib/ai-brain/server', () => ({
  resolveBrainExecutionConfigForCapability: (...args: unknown[]) =>
    mocks.resolveBrainExecutionConfigMock(...args),
}));

vi.mock('@/shared/lib/ai-brain/server-runtime-client', () => ({
  runBrainChatCompletion: (...args: unknown[]) => mocks.runBrainChatCompletionMock(...args),
  supportsBrainJsonMode: (...args: unknown[]) => mocks.supportsBrainJsonModeMock(...args),
}));

import { generateKangurSocialPostDraft } from './social-posts-generation';

describe('generateKangurSocialPostDraft', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveBrainExecutionConfigMock.mockResolvedValue({
      modelId: 'brain-default-model',
      temperature: 0.6,
      maxTokens: 900,
      systemPrompt: '',
    });
    mocks.supportsBrainJsonModeMock.mockReturnValue(true);
    mocks.runBrainChatCompletionMock.mockResolvedValue({
      text: JSON.stringify({
        titlePl: 'Tytul',
        titleEn: 'Title',
        bodyPl: 'Tresc',
        bodyEn: 'Body',
      }),
      vendor: 'openai',
      modelId: 'override-model',
    });
  });

  it('uses the model override when provided', async () => {
    const result = await generateKangurSocialPostDraft({
      docReferences: ['overview'],
      modelId: 'override-model',
    });

    expect(mocks.resolveBrainExecutionConfigMock).toHaveBeenCalledWith(
      'kangur_social.post_generation',
      expect.objectContaining({ defaultModelId: 'override-model' })
    );
    expect(mocks.runBrainChatCompletionMock).toHaveBeenCalledWith(
      expect.objectContaining({ modelId: 'override-model' })
    );
    expect(result.titlePl).toBe('Tytul');
    expect(result.titleEn).toBe('Title');
  });
});
