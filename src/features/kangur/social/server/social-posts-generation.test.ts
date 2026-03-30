import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  resolveBrainExecutionConfigMock: vi.fn(),
  runBrainChatCompletionMock: vi.fn(),
  supportsBrainJsonModeMock: vi.fn(),
  analyzeKangurSocialVisualsMock: vi.fn(),
}));

vi.mock('@/shared/lib/ai-brain/server', () => ({
  resolveBrainExecutionConfigForCapability: (...args: unknown[]) =>
    mocks.resolveBrainExecutionConfigMock(...args),
}));

vi.mock('@/shared/lib/ai-brain/server-runtime-client', () => ({
  runBrainChatCompletion: (...args: unknown[]) => mocks.runBrainChatCompletionMock(...args),
  supportsBrainJsonMode: (...args: unknown[]) => mocks.supportsBrainJsonModeMock(...args),
}));

vi.mock('./social-posts-vision', () => ({
  analyzeKangurSocialVisuals: (...args: unknown[]) =>
    mocks.analyzeKangurSocialVisualsMock(...args),
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
    mocks.analyzeKangurSocialVisualsMock.mockResolvedValue({
      summary: 'Visual summary',
      highlights: ['Highlight'],
    });
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
      projectUrl: 'https://studiq.example.com/project',
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

  it('extracts JSON drafts wrapped in markdown fences', async () => {
    mocks.runBrainChatCompletionMock.mockResolvedValue({
      text: [
        '```json',
        JSON.stringify({
          titlePl: 'Ogrodzenie',
          titleEn: 'Fence',
          bodyPl: 'Polski wpis',
          bodyEn: 'English post',
        }),
        '```',
      ].join('\n'),
      vendor: 'openai',
      modelId: 'brain-default-model',
    });

    const result = await generateKangurSocialPostDraft({
      docReferences: ['overview'],
      projectUrl: 'https://studiq.example.com/project',
    });

    expect(result.titlePl).toBe('Ogrodzenie');
    expect(result.titleEn).toBe('Fence');
    expect(result.bodyPl).toBe('Polski wpis');
    expect(result.bodyEn).toBe('English post');
  });

  it('recovers structured fields from truncated JSON-like draft responses', async () => {
    mocks.runBrainChatCompletionMock.mockResolvedValue({
      text: [
        '{',
        '  "titlePl": "Nowe funkcje w Kangur i StudiQ",',
        '  "titleEn": "New Features in Kangur & StudiQ",',
        '  "bodyPl": "🚀 Wprowadziliśmy nowe funkcje.\\n\\n- Widoczny pasek postępu\\n- Lepszy dashboard rodzica",',
        '  "bodyEn": "🚀 We shipped new features.\\n\\n- Visible progress bar\\n- Better parent dashboard',
      ].join('\n'),
      vendor: 'openai',
      modelId: 'brain-default-model',
    });

    const result = await generateKangurSocialPostDraft({
      docReferences: ['overview'],
      projectUrl: 'https://studiq.example.com/project',
    });

    expect(result.titlePl).toBe('Nowe funkcje w Kangur i StudiQ');
    expect(result.titleEn).toBe('New Features in Kangur & StudiQ');
    expect(result.bodyPl).toContain('Widoczny pasek postępu');
    expect(result.bodyPl).not.toContain('"titlePl"');
    expect(result.bodyEn).toContain('We shipped new features.');
  });

  it('reuses prefetched visual analysis and requires it to be mentioned in the prompt', async () => {
    await generateKangurSocialPostDraft({
      docReferences: ['overview'],
      projectUrl: 'https://studiq.example.com/project',
      prefetchedVisualAnalysis: {
        summary: 'The hero now shows a larger classroom card.',
        highlights: ['Larger classroom card'],
      },
      requireVisualAnalysisInBody: true,
    });

    expect(mocks.analyzeKangurSocialVisualsMock).not.toHaveBeenCalled();
    expect(mocks.runBrainChatCompletionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'system',
            content: expect.stringContaining(
              'Treat the visual analysis as descriptive input only and consolidate it with the current documentation context to write the update.'
            ),
          }),
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining(
              'Both the Polish and English post bodies must explicitly mention the visual analysis findings or visible UI changes.'
            ),
          }),
        ]),
      })
    );
    const callArgs = mocks.runBrainChatCompletionMock.mock.calls[0]?.[0];
    const userMessage = callArgs?.messages?.find((entry: { role?: string }) => entry.role === 'user');
    expect(userMessage?.content).toContain(
      'Use only this public Project URL for any CTA, redirect, or link: https://studiq.example.com/project'
    );
    expect(userMessage?.content).toContain('Visual analysis summary from the prior image-only pass:');
    expect(userMessage?.content).not.toContain('Documentation updates suggested from visuals:');
  });

  it('sanitizes legacy prefetched visual analysis before building the generation prompt', async () => {
    await generateKangurSocialPostDraft({
      docReferences: ['overview'],
      projectUrl: 'https://studiq.example.com/project',
      prefetchedVisualAnalysis: {
        summary: `Okay, I've reviewed the provided text and images. Here's a summary of the key information. The screenshots show a Polish-localized navigation and refreshed lesson cards.

**Potential Documentation/Communication Narrative**
Here's a draft you could use for release notes.
`,
        highlights: [
          'Polish-localized navigation labels',
          'Documentation update proposal for the homepage docs',
        ],
      },
    });

    const callArgs = mocks.runBrainChatCompletionMock.mock.calls[0]?.[0];
    const userMessage = callArgs?.messages?.find((entry: { role?: string }) => entry.role === 'user');
    expect(userMessage?.content).toContain(
      'The screenshots show a Polish-localized navigation and refreshed lesson cards.'
    );
    expect(userMessage?.content).toContain('- Polish-localized navigation labels');
    expect(userMessage?.content).not.toContain('Potential Documentation/Communication Narrative');
    expect(userMessage?.content).not.toContain("Here's a draft you could use");
    expect(userMessage?.content).not.toContain('Documentation update proposal');
  });

  it('fails when the Project URL is missing or localhost-only', async () => {
    await expect(
      generateKangurSocialPostDraft({
        docReferences: ['overview'],
      })
    ).rejects.toThrow('Set Settings Project URL before generating social posts.');

    await expect(
      generateKangurSocialPostDraft({
        docReferences: ['overview'],
        projectUrl: 'http://localhost:3000',
      })
    ).rejects.toThrow(
      'Settings Project URL must be a valid public URL. Localhost, loopback, and private network URLs are not allowed.'
    );
  });
});
