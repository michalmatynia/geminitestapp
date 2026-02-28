import { describe, it, expect, vi, beforeEach } from 'vitest';

import { generateProductAiDescription } from '@/features/products/services/aiDescriptionService';

// Mock brain server
vi.mock('@/shared/lib/ai-brain/server', () => ({
  resolveBrainExecutionConfigForCapability: vi.fn().mockResolvedValue({
    modelId: 'gpt-4o',
    temperature: 0.7,
    maxTokens: 800,
    systemPrompt: 'You are an assistant',
    brainApplied: { enforced: true },
  }),
}));

// Mock chatbot runtime
vi.mock('@/features/ai/chatbot/server-model-runtime', () => ({
  runChatbotModel: vi.fn().mockResolvedValue({
    message: 'Mocked AI Response',
    modelId: 'gpt-4o',
    provider: 'openai',
  }),
}));

// Mock ErrorSystem
vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: vi.fn(),
  },
}));

describe('aiDescriptionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate a description using mocked AI', async () => {
    const result = await generateProductAiDescription({
      productId: 'p1',
      images: [],
      visionInputPrompt: 'Analyze this',
      generationInputPrompt: 'Write desc',
    });

    expect(result).toBeDefined();
    expect(result.description).toBe('Mocked AI Response');
    expect(result.analysisInitial).toBe('Mocked AI Response');
  });

  it('should work with default prompts if not provided', async () => {
    const result = await generateProductAiDescription({
      productId: 'p1',
      images: [],
    });

    expect(result.description).toBe('Mocked AI Response');
  });

  it('should handle images', async () => {
    const images = ['https://example.com/img.jpg'];

    const result = await generateProductAiDescription({
      productId: 'p1',
      images,
    });

    expect(result.description).toBe('Mocked AI Response');
  });
});
