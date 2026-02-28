import { describe, it, expect, vi, beforeEach } from 'vitest';

import { translateProduct } from '@/features/products/services/aiTranslationService';
import { resolveBrainExecutionConfigForCapability } from '@/shared/lib/ai-brain/server';
import { runBrainChatCompletion } from '@/shared/lib/ai-brain/server-runtime-client';

// Mock AI Brain functions
vi.mock('@/shared/lib/ai-brain/server', () => ({
  resolveBrainExecutionConfigForCapability: vi.fn(),
}));

vi.mock('@/shared/lib/ai-brain/server-runtime-client', () => ({
  runBrainChatCompletion: vi.fn(),
  supportsBrainJsonMode: vi.fn().mockReturnValue(true),
}));

// Mock observability
vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    logInfo: vi.fn().mockResolvedValue(undefined),
    logWarning: vi.fn().mockResolvedValue(undefined),
    captureException: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('aiTranslationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default brain config
    vi.mocked(resolveBrainExecutionConfigForCapability).mockResolvedValue({
      modelId: 'test-model',
      temperature: 0.3,
      maxTokens: 1200,
      systemPrompt: 'You are a professional translator.',
      brainApplied: {},
    } as any);
  });

  it('should successfully translate product data to target languages', async () => {
    vi.mocked(runBrainChatCompletion).mockResolvedValue({
      text: JSON.stringify({
        name: 'Translated Name',
        description: 'Translated Description',
      }),
      vendor: 'openai',
      modelId: 'test-model',
    });

    const params = {
      productId: '123',
      sourceLanguage: 'English',
      targetLanguages: ['Polish', 'German'],
      productName: 'Original Name',
      productDescription: 'Original Description',
    };

    const result = await translateProduct(params);

    expect(result).toBeDefined();
    expect(result.translations['polish']).toEqual({
      name: 'Translated Name',
      description: 'Translated Description',
    });
    expect(result.translations['german']).toEqual({
      name: 'Translated Name',
      description: 'Translated Description',
    });
    expect(runBrainChatCompletion).toHaveBeenCalledTimes(2);
  });

  it('should skip target language if it matches source language', async () => {
    vi.mocked(runBrainChatCompletion).mockResolvedValue({
      text: JSON.stringify({ name: 'TN', description: 'TD' }),
      vendor: 'openai',
      modelId: 'test-model',
    });

    const params = {
      productId: '123',
      sourceLanguage: 'English',
      targetLanguages: ['English', 'Polish'],
      productName: 'Original Name',
      productDescription: 'Original Description',
    };

    const result = await translateProduct(params);

    expect(result.translations['english']).toBeUndefined();
    expect(result.translations['polish']).toBeDefined();
    expect(runBrainChatCompletion).toHaveBeenCalledTimes(1);
  });

  it('should throw error if no translations succeeded', async () => {
    vi.mocked(runBrainChatCompletion).mockResolvedValue({
      text: '', // Empty response
      vendor: 'openai',
      modelId: 'test-model',
    });

    const params = {
      productId: '123',
      sourceLanguage: 'English',
      targetLanguages: ['Polish'],
      productName: 'Original Name',
      productDescription: 'Original Description',
    };

    await expect(translateProduct(params)).rejects.toThrow('Translation failed');
  });
});
