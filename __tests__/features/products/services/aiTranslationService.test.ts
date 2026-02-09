import OpenAI from 'openai';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { translateProduct } from '@/features/products/services/aiTranslationService';

// Mock OpenAI
vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    name: 'Translated Name',
                    description: 'Translated Description',
                  }),
                },
              },
            ],
          }),
        },
      },
    })),
  };
});

// Mock getSettingValue from aiDescriptionService
vi.mock('@/features/products/services/aiDescriptionService', () => ({
  getSettingValue: vi.fn().mockResolvedValue('mocked-value'),
}));

describe('aiTranslationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully translate product data to target languages', async () => {
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
    
    const mockedOpenAI = vi.mocked(OpenAI);
    expect(mockedOpenAI).toHaveBeenCalled();
  });

  it('should skip target language if it matches source language', async () => {
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
  });

  it('should throw error if no translations succeeded', async () => {
    // Force translation failure by returning empty content
    vi.mocked(OpenAI).mockImplementationOnce(() => ({
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [],
          }),
        },
      },
    } as any));

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
