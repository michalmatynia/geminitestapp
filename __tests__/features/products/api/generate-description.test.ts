/**
 * @vitest-environment node
 */

import { NextRequest } from 'next/server';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import { POST } from '@/app/api/generate-description/route';
import {
  resolveBrainExecutionConfigForCapability,
  type BrainExecutionConfig,
} from '@/shared/lib/ai-brain/server';
import { runChatbotModel } from '@/features/ai/chatbot/server-model-runtime';

// Mock AI Brain functions
vi.mock('@/shared/lib/ai-brain/server', () => ({
  resolveBrainExecutionConfigForCapability: vi.fn(),
}));

vi.mock('@/features/ai/chatbot/server-model-runtime', () => ({
  runChatbotModel: vi.fn(),
}));

describe('AI Description Generation API', () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    // Default mock for brain config
    vi.mocked(resolveBrainExecutionConfigForCapability).mockResolvedValue({
      modelId: 'test-model',
      temperature: 0.7,
      maxTokens: 800,
      systemPrompt: 'You are a helpful assistant.',
      brainApplied: {
        modelId: 'test-model',
        temperature: 0.7,
        maxTokens: 800,
      },
    } as unknown as BrainExecutionConfig);
  });

  it('should return a generated description', async () => {
    vi.mocked(runChatbotModel).mockResolvedValue({
      message: 'This is a test description.',
      modelId: 'test-model',
      provider: 'ollama',
    });

    const req = new NextRequest('http://localhost/api/generate-description', {
      method: 'POST',
      body: JSON.stringify({
        productId: 'p1',
        imageUrls: [],
        visionInputPrompt: 'Analyze',
        generationInputPrompt: 'Generate',
      }),
    });

    const res = await POST(req);
    const data = (await res.json()) as { description: string };

    expect(res.status).toBe(200);
    expect(data.description).toBe('This is a test description.');
    expect(runChatbotModel).toHaveBeenCalled();
  });

  it('should handle optional vision and generation', async () => {
    vi.mocked(runChatbotModel).mockResolvedValue({
      message: 'Result',
      modelId: 'test-model',
      provider: 'ollama',
    });

    const req = new NextRequest('http://localhost/api/generate-description', {
      method: 'POST',
      body: JSON.stringify({
        productId: 'p1',
        visionEnabled: false,
        generationInputPrompt: 'Generate',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    // Should only call for generation
    expect(runChatbotModel).toHaveBeenCalledTimes(1);
  });
});
