import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  readBrainProviderCredential: vi.fn(),
  resolveProductStudioBrainModel: vi.fn(),
}));

vi.mock('@/shared/lib/ai-brain/provider-credentials', () => ({
  readBrainProviderCredential: mocks.readBrainProviderCredential,
}));

vi.mock('./product-studio-service.settings', () => ({
  resolveProductStudioBrainModel: mocks.resolveProductStudioBrainModel,
}));

import { assertProductStudioGenerationConfigurationReady } from './product-studio-service.generation-config';

describe('Product Studio generation configuration preflight', () => {
  beforeEach(() => {
    mocks.readBrainProviderCredential.mockReset();
    mocks.resolveProductStudioBrainModel.mockReset();
    mocks.resolveProductStudioBrainModel.mockResolvedValue({
      apiKeyOverrideConfigured: false,
      modelId: 'gpt-image-2',
      warning: null,
    });
    mocks.readBrainProviderCredential.mockResolvedValue({
      apiKey: 'openai-key',
      source: 'brain',
      sourceKey: 'openai_api_key',
    });
  });

  it('passes when the Image Studio model and OpenAI credential are configured', async () => {
    await expect(assertProductStudioGenerationConfigurationReady()).resolves.toBeUndefined();
  });

  it('passes when the Image Studio route has an API key override', async () => {
    mocks.resolveProductStudioBrainModel.mockResolvedValue({
      apiKeyOverrideConfigured: true,
      modelId: 'gpt-image-2',
      warning: null,
    });
    mocks.readBrainProviderCredential.mockResolvedValue({
      apiKey: null,
      source: 'missing',
      sourceKey: null,
    });

    await expect(assertProductStudioGenerationConfigurationReady()).resolves.toBeUndefined();
    expect(mocks.readBrainProviderCredential).not.toHaveBeenCalled();
  });

  it('links to AI Brain routing when the image generation model is missing', async () => {
    mocks.resolveProductStudioBrainModel.mockResolvedValue({
      apiKeyOverrideConfigured: false,
      modelId: '',
      warning: 'Image Studio Image Generation has no model assigned in AI Brain.',
    });

    await expect(assertProductStudioGenerationConfigurationReady()).rejects.toMatchObject({
      message: expect.stringContaining('/admin/brain?tab=routing'),
    });
  });

  it('links to AI Brain providers when the OpenAI key is missing', async () => {
    mocks.readBrainProviderCredential.mockResolvedValue({
      apiKey: null,
      source: 'missing',
      sourceKey: null,
    });

    await expect(assertProductStudioGenerationConfigurationReady()).rejects.toMatchObject({
      message: expect.stringContaining('/admin/brain?tab=providers'),
      meta: {
        settingsLinks: ['/admin/brain?tab=routing', '/admin/brain?tab=providers'],
      },
    });
  });
});
