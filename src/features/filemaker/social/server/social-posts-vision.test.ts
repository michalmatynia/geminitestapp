import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SocialPublishingImageAddon } from '@/shared/contracts/social-publishing-image-addons';

const mocks = vi.hoisted(() => ({
  resolveBrainExecutionConfigMock: vi.fn(),
  runBrainChatCompletionMock: vi.fn(),
  supportsBrainJsonModeMock: vi.fn(),
  inferBrainModelVendorMock: vi.fn(),
  getDiskPathFromPublicPathMock: vi.fn(),
  isHttpFilepathMock: vi.fn(),
  findSocialPublishingImageAddonsByIdsMock: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('@/shared/lib/ai-brain/server', () => ({
  resolveBrainExecutionConfigForCapability: (...args: unknown[]) =>
    mocks.resolveBrainExecutionConfigMock(...args),
}));

vi.mock('@/shared/lib/ai-brain/server-runtime-client', () => ({
  runBrainChatCompletion: (...args: unknown[]) => mocks.runBrainChatCompletionMock(...args),
  supportsBrainJsonMode: (...args: unknown[]) => mocks.supportsBrainJsonModeMock(...args),
}));

vi.mock('@/shared/lib/ai-brain/model-vendor', () => ({
  inferBrainModelVendor: (...args: unknown[]) => mocks.inferBrainModelVendorMock(...args),
}));

vi.mock('@/features/files/server', () => ({
  getDiskPathFromPublicPath: (...args: unknown[]) =>
    mocks.getDiskPathFromPublicPathMock(...args),
  isHttpFilepath: (...args: unknown[]) => mocks.isHttpFilepathMock(...args),
}));

vi.mock('./social-image-addons-repository', () => ({
  findSocialPublishingImageAddonsByIds: (...args: unknown[]) =>
    mocks.findSocialPublishingImageAddonsByIdsMock(...args),
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: { logInfo: vi.fn(), captureException: vi.fn() },
}));

import { analyzeSocialPublishingVisuals } from './social-posts-vision';

const makeAddon = (overrides: Partial<SocialPublishingImageAddon> = {}): SocialPublishingImageAddon => ({
  id: 'addon-1',
  title: 'Test Addon',
  description: '',
  sourceUrl: 'https://example.com',
  sourceLabel: 'Test',
  imageAsset: {
    id: 'img-1',
    url: '/uploads/test.png',
    filepath: '/uploads/test.png',
    filename: 'test.png',
  },
  presetId: null,
  previousAddonId: null,
  playwrightRunId: null,
  playwrightArtifact: null,
  createdBy: null,
  updatedBy: null,
  ...overrides,
});

const defaultBrainConfig = {
  modelId: 'gpt-4o',
  temperature: 0.2,
  maxTokens: 900,
  systemPrompt: 'You are a visual analyst.',
};

describe('analyzeSocialPublishingVisuals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveBrainExecutionConfigMock.mockResolvedValue(defaultBrainConfig);
    mocks.supportsBrainJsonModeMock.mockReturnValue(true);
    mocks.inferBrainModelVendorMock.mockReturnValue('openai');
    mocks.isHttpFilepathMock.mockReturnValue(false);
    mocks.findSocialPublishingImageAddonsByIdsMock.mockResolvedValue([]);
    mocks.runBrainChatCompletionMock.mockResolvedValue({
      text: JSON.stringify({
        summary: 'Visual summary of the UI.',
        highlights: ['New button added', 'Layout updated'],
      }),
      vendor: 'openai',
      modelId: 'gpt-4o',
    });
  });

  it('returns empty analysis when no image addons provided', async () => {
    const result = await analyzeSocialPublishingVisuals({ imageAddons: [] });

    expect(result).toEqual({ summary: '', highlights: [] });
    expect(mocks.runBrainChatCompletionMock).not.toHaveBeenCalled();
  });

  it('calls Brain with the override model when provided', async () => {
    const addon = makeAddon();

    await analyzeSocialPublishingVisuals({
      imageAddons: [addon],
      modelId: 'gemma3:latest',
    });

    expect(mocks.resolveBrainExecutionConfigMock).toHaveBeenCalledWith(
      'social_publishing.visual_analysis',
      expect.objectContaining({ defaultModelId: 'gemma3:latest' })
    );
  });

  it('parses structured JSON response into analysis', async () => {
    const addon = makeAddon();

    const result = await analyzeSocialPublishingVisuals({ imageAddons: [addon] });

    expect(result.summary).toBe('Visual summary of the UI.');
    expect(result.highlights).toEqual(['New button added', 'Layout updated']);
  });

  it('does not inject documentation context and forbids non-visual proposals in the prompt', async () => {
    const addon = makeAddon();

    await analyzeSocialPublishingVisuals({ imageAddons: [addon] });

    const callArgs = mocks.runBrainChatCompletionMock.mock.calls[0]?.[0];
    const systemMessage = callArgs?.messages?.[0];
    const userMessage = callArgs?.messages?.[1];
    const userText =
      Array.isArray(userMessage?.content)
        ? userMessage.content.find((p: { type?: string; text?: string }) => p.type === 'text')?.text
        : userMessage?.content;

    expect(systemMessage?.content).toContain(
      'Do not write marketing copy, social post drafts, publishing recommendations, release notes, documentation update proposals, communication narratives, or future work suggestions.'
    );
    expect(systemMessage?.content).toContain('Only describe what is directly visible in the screenshots.');
    expect(systemMessage?.content).toContain(
      'Return a JSON object with keys: summary and highlights.'
    );
    expect(systemMessage?.content).toContain('Return raw JSON only. Do not wrap the JSON in markdown fences.');
    expect(userText).not.toContain('Documentation context:');
    expect(userText).not.toContain('Additional notes:');
    expect(userText).toContain('Captured screenshots:');
  });

  it('uses raw text as summary when JSON parsing fails', async () => {
    mocks.runBrainChatCompletionMock.mockResolvedValue({
      text: 'The UI shows a navigation bar with links.',
      vendor: 'openai',
      modelId: 'gpt-4o',
    });
    const addon = makeAddon();

    const result = await analyzeSocialPublishingVisuals({ imageAddons: [addon] });

    expect(result.summary).toBe('The UI shows a navigation bar with links.');
    expect(result.highlights).toEqual([]);
  });

  it('drops non-visual narrative sections from raw fallback text', async () => {
    mocks.runBrainChatCompletionMock.mockResolvedValue({
      text: `Okay, I've reviewed the provided text and images. Here's a summary of the key information. The screenshots show a Polish-localized navigation, updated lesson labels, and refreshed card styling across the app.

**Potential Documentation/Communication Narrative**
Here's a draft you could use for release notes.
`,
      vendor: 'ollama',
      modelId: 'gemma3:12b',
    });

    const result = await analyzeSocialPublishingVisuals({ imageAddons: [makeAddon()] });

    expect(result.summary).toBe(
      'The screenshots show a Polish-localized navigation, updated lesson labels, and refreshed card styling across the app.'
    );
    expect(result.highlights).toEqual([]);
  });

  it('throws when no model is configured', async () => {
    mocks.resolveBrainExecutionConfigMock.mockResolvedValue({
      ...defaultBrainConfig,
      modelId: '',
    });

    await expect(
      analyzeSocialPublishingVisuals({ imageAddons: [makeAddon()], modelId: '' })
    ).rejects.toThrow(/model is missing/i);
  });

  it('throws for unsupported vendor', async () => {
    mocks.inferBrainModelVendorMock.mockReturnValue('anthropic');

    await expect(
      analyzeSocialPublishingVisuals({ imageAddons: [makeAddon()] })
    ).rejects.toThrow(/OpenAI or Ollama/);
  });

  it('resolves previous addons for before/after comparison', async () => {
    const previousAddon = makeAddon({
      id: 'addon-prev',
      title: 'Previous capture',
      imageAsset: {
        id: 'img-prev',
        url: '/uploads/prev.png',
        filepath: '/uploads/prev.png',
        filename: 'prev.png',
      },
    });
    const currentAddon = makeAddon({
      id: 'addon-current',
      previousAddonId: 'addon-prev',
      presetId: 'home-hero',
    });

    mocks.findSocialPublishingImageAddonsByIdsMock.mockResolvedValue([previousAddon]);

    await analyzeSocialPublishingVisuals({ imageAddons: [currentAddon] });

    expect(mocks.findSocialPublishingImageAddonsByIdsMock).toHaveBeenCalledWith(['addon-prev']);
    // The system prompt should include before/after instructions
    const callArgs = mocks.runBrainChatCompletionMock.mock.calls[0]?.[0];
    const systemMessage = callArgs?.messages?.[0];
    expect(systemMessage?.content).toContain('BEFORE/AFTER');
  });

  it('does not fetch previous addons when none have previousAddonId', async () => {
    const addon = makeAddon({ previousAddonId: null });

    await analyzeSocialPublishingVisuals({ imageAddons: [addon] });

    expect(mocks.findSocialPublishingImageAddonsByIdsMock).not.toHaveBeenCalled();
  });

  it('keeps the user prompt limited to screenshot context', async () => {
    const addon = makeAddon();

    await analyzeSocialPublishingVisuals({ imageAddons: [addon] });

    const callArgs = mocks.runBrainChatCompletionMock.mock.calls[0]?.[0];
    const userMessage = callArgs?.messages?.[1];
    const textPart =
      Array.isArray(userMessage?.content)
        ? userMessage.content.find((p: any) => p.type === 'text')?.text
        : userMessage?.content;
    expect(textPart).toContain('Captured screenshots:');
    expect(textPart).not.toContain('Additional notes:');
  });

  it('skips Ollama guard limits for Ollama vendor', async () => {
    mocks.inferBrainModelVendorMock.mockReturnValue('ollama');
    mocks.resolveBrainExecutionConfigMock.mockResolvedValue({
      ...defaultBrainConfig,
      modelId: 'gemma3:latest',
    });

    const addon = makeAddon();
    await analyzeSocialPublishingVisuals({ imageAddons: [addon] });

    // Should still call Brain chat completion successfully
    expect(mocks.runBrainChatCompletionMock).toHaveBeenCalled();
  });
});
