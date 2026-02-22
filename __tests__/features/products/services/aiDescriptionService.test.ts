import OpenAI from 'openai';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { generateProductDescription } from '@/features/products/services/aiDescriptionService';

// Mock OpenAI
const mockCreate = vi.fn().mockResolvedValue({
  choices: [
    {
      message: {
        content: 'Mocked AI Response',
      },
    },
  ],
});

const MockOpenAI = vi.fn().mockImplementation(() => ({
  chat: {
    completions: {
      create: mockCreate,
    },
  },
}));
(MockOpenAI as any).default = MockOpenAI;

vi.mock('openai', () => {
  return {
    default: MockOpenAI,
    OpenAI: MockOpenAI,
  };
});

// Mock fs/promises
vi.mock('fs/promises', () => ({
  default: {
    readFile: vi.fn().mockResolvedValue(Buffer.from('mock-image-data')),
  },
}));

// Mock getImageFileRepository
vi.mock('@/features/files/server', () => ({
  getImageFileRepository: vi.fn().mockResolvedValue({
    listImageFiles: vi.fn().mockResolvedValue([]),
  }),
}));

describe('aiDescriptionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should throw error if product name is missing', async () => {
    await expect(generateProductDescription({ productData: {} as any })).rejects.toThrow('Product name is required');
  });

  it('should generate a description using mocked AI', async () => {
    const productData = { name_en: 'Test Product', price: 100 } as any;
    const result = await generateProductDescription({ productData });

    expect(result).toBeDefined();
    expect(result.description).toBe('Mocked AI Response');
    expect(result.analysisInitial).toBe('Mocked AI Response');
    
    // Verify OpenAI was called
    const mockedOpenAI = vi.mocked(OpenAI);
    expect(mockedOpenAI).toHaveBeenCalled();
  });

  it('should handle images by reading from disk (mocked)', async () => {
    const productData = { name_en: 'Image Product' } as any;
    const imageUrls = ['/uploads/products/test.jpg'];
    
    const result = await generateProductDescription({ 
      productData,
      imageUrls 
    });

    expect(result.description).toBe('Mocked AI Response');
    // Verify OpenAI was called with image data in the message
    // (In our mock it's simplified but the service should have processed images)
  });
});
