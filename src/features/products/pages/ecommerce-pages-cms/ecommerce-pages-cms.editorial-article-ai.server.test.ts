import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  processGraphModel: vi.fn(),
}));

vi.mock('@/features/products/workers/product-ai-processors', () => ({
  processGraphModel: mocks.processGraphModel,
}));

import { generateEcommercePagesCmsEditorialArticleWithAiPath } from './ecommerce-pages-cms.editorial-article-ai.server';

describe('ecommerce pages CMS editorial article AI generation', () => {
  beforeEach(() => {
    mocks.processGraphModel.mockReset();
  });

  it('runs a Gemma Vision graph model job and parses generated article fields', async () => {
    mocks.processGraphModel.mockResolvedValue({
      modelId: 'gemma3',
      result: JSON.stringify({
        title: 'Relics from the Gate',
        excerpt: 'A compact editorial summary.',
        body: 'First paragraph.\n\nSecond paragraph.',
      }),
    });

    const article = await generateEcommercePagesCmsEditorialArticleWithAiPath({
      draft: { tag: 'Universe Report', title: 'Existing title' },
      imageUrl: 'https://sparksofsindri.com/cms/stargater/logo/logo.png',
      prompt: 'Write about the new Stargater drop.',
    });

    expect(article).toEqual({
      body: 'First paragraph.\n\nSecond paragraph.',
      excerpt: 'A compact editorial summary.',
      modelId: 'gemma3',
      title: 'Relics from the Gate',
    });
    expect(mocks.processGraphModel).toHaveBeenCalledTimes(1);

    const job = mocks.processGraphModel.mock.calls[0]?.[0] as {
      payload: Record<string, unknown>;
    };
    expect(job.payload).toMatchObject({
      imageUrls: ['https://sparksofsindri.com/cms/stargater/logo/logo.png'],
      maxTokens: 1800,
      modelId: 'ollama:gemma3',
      source: 'ai_paths',
      vision: true,
    });
    expect(job.payload.prompt).toContain('Write about the new Stargater drop.');
    expect(job.payload.graph).toMatchObject({
      pathId: 'ecommerce-editorial-article-gemma-vision',
      requestedModelId: 'ollama:gemma3',
    });
  });

  it('extracts JSON from fenced model output', async () => {
    mocks.processGraphModel.mockResolvedValue({
      modelId: 'gemma3',
      result: '```json\n{"title":"Generated","excerpt":"","body":"Generated body"}\n```',
    });

    await expect(
      generateEcommercePagesCmsEditorialArticleWithAiPath({
        prompt: 'Use the image as context.',
      })
    ).resolves.toMatchObject({
      body: 'Generated body',
      excerpt: '',
      title: 'Generated',
    });
  });

  it('rejects empty prompts before running the model', async () => {
    await expect(
      generateEcommercePagesCmsEditorialArticleWithAiPath({ prompt: '   ' })
    ).rejects.toThrow('Article AI prompt is required');
    expect(mocks.processGraphModel).not.toHaveBeenCalled();
  });
});
