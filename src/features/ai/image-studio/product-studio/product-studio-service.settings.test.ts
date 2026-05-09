import { beforeEach, describe, expect, it, vi } from 'vitest';

import { configurationError } from '@/shared/errors/app-error';

const mocks = vi.hoisted(() => ({
  resolveBrainExecutionConfigForCapability: vi.fn(),
}));

vi.mock('@/shared/lib/ai-brain/server', () => ({
  resolveBrainExecutionConfigForCapability: mocks.resolveBrainExecutionConfigForCapability,
}));

import { resolveProductStudioBrainModel } from './product-studio-service.settings';

describe('resolveProductStudioBrainModel', () => {
  beforeEach(() => {
    mocks.resolveBrainExecutionConfigForCapability.mockReset();
  });

  it('returns the trimmed Image Studio Brain model id', async () => {
    mocks.resolveBrainExecutionConfigForCapability.mockResolvedValue({
      assignment: {
        apiKey: ' route-openai-key ',
      },
      modelId: ' gpt-image-1 ',
    });

    await expect(resolveProductStudioBrainModel()).resolves.toEqual({
      apiKeyOverrideConfigured: true,
      modelId: 'gpt-image-1',
      warning: null,
    });
    expect(mocks.resolveBrainExecutionConfigForCapability).toHaveBeenCalledWith(
      'image_studio.general',
      { runtimeKind: 'image_generation' }
    );
  });

  it('turns a missing Image Studio Brain model into a read-only warning', async () => {
    const error = configurationError(
      'Image Studio Image Generation has no model assigned in AI Brain.'
    );
    mocks.resolveBrainExecutionConfigForCapability.mockRejectedValue(error);

    await expect(resolveProductStudioBrainModel()).resolves.toEqual({
      apiKeyOverrideConfigured: false,
      modelId: '',
      warning: error.message,
    });
  });

  it('rethrows non-Brain configuration errors', async () => {
    mocks.resolveBrainExecutionConfigForCapability.mockRejectedValue(
      configurationError('MONGODB_LOCAL_URI is not configured.')
    );

    await expect(resolveProductStudioBrainModel()).rejects.toThrow(
      'MONGODB_LOCAL_URI is not configured.'
    );
  });
});
