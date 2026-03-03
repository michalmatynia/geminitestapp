import { describe, expect, it } from 'vitest';

import {
  buildImageStudioSequenceSnapshot,
  defaultImageStudioSettings,
  parseImageStudioSettings,
} from '@/features/ai/image-studio/utils/studio-settings';

describe('parseImageStudioSettings', () => {
  it('returns defaults for empty payloads', () => {
    expect(parseImageStudioSettings(null)).toEqual(defaultImageStudioSettings);
    expect(parseImageStudioSettings('')).toEqual(defaultImageStudioSettings);
  });

  it('accepts canonical settings without persisted Brain model snapshots', () => {
    const parsed = parseImageStudioSettings(
      JSON.stringify({
        version: 1,
        promptExtraction: {
          mode: 'hybrid',
          applyAutofix: true,
          autoApplyFormattedPrompt: true,
          showValidationSummary: true,
          gpt: {
            temperature: 0.2,
            top_p: null,
            max_output_tokens: 700,
          },
        },
        uiExtractor: {
          mode: 'both',
          temperature: 0.3,
          max_output_tokens: 900,
        },
        targetAi: {
          provider: 'openai',
          openai: {
            api: 'images',
            temperature: null,
            top_p: null,
            max_output_tokens: null,
            presence_penalty: null,
            frequency_penalty: null,
            seed: null,
            user: null,
            stream: false,
            reasoning_effort: null,
            response_format: 'text',
            tool_choice: null,
            image: {
              size: '1024x1024',
              quality: 'high',
              background: 'transparent',
              format: 'png',
              n: 2,
              moderation: null,
              output_compression: null,
              partial_images: null,
            },
            advanced_overrides: null,
          },
        },
      })
    );

    expect(parsed.promptExtraction.gpt.temperature).toBe(0.2);
    expect(parsed.uiExtractor.mode).toBe('both');
    expect(parsed.targetAi.openai.image.n).toBe(2);
  });

  it('strips deprecated persisted generation model fields', () => {
    const parsed = parseImageStudioSettings(
      JSON.stringify({
        ...defaultImageStudioSettings,
        targetAi: {
          ...defaultImageStudioSettings.targetAi,
          openai: {
            ...defaultImageStudioSettings.targetAi.openai,
            model: 'gpt-image-1',
          },
        },
      })
    );

    expect(parsed.targetAi.openai.api).toBe(defaultImageStudioSettings.targetAi.openai.api);
  });

  it('strips deprecated persisted prompt extractor model fields', () => {
    const parsed = parseImageStudioSettings(
      JSON.stringify({
        ...defaultImageStudioSettings,
        promptExtraction: {
          ...defaultImageStudioSettings.promptExtraction,
          gpt: {
            ...defaultImageStudioSettings.promptExtraction.gpt,
            model: 'gpt-4o-mini',
          },
        },
      })
    );

    expect(parsed.promptExtraction.gpt.max_output_tokens).toBe(
      defaultImageStudioSettings.promptExtraction.gpt.max_output_tokens
    );
  });

  it('strips deprecated persisted UI extractor model fields', () => {
    const parsed = parseImageStudioSettings(
      JSON.stringify({
        ...defaultImageStudioSettings,
        uiExtractor: {
          ...defaultImageStudioSettings.uiExtractor,
          model: 'gpt-4.1-mini',
        },
      })
    );

    expect(parsed.uiExtractor.mode).toBe(defaultImageStudioSettings.uiExtractor.mode);
  });

  it('strips deprecated persisted modelPresets fields', () => {
    const parsed = parseImageStudioSettings(
      JSON.stringify({
        ...defaultImageStudioSettings,
        targetAi: {
          ...defaultImageStudioSettings.targetAi,
          openai: {
            ...defaultImageStudioSettings.targetAi.openai,
            modelPresets: ['gpt-image-1'],
          },
        },
      })
    );

    expect(parsed.targetAi.openai.image.n).toBe(defaultImageStudioSettings.targetAi.openai.image.n);
  });

  it('still rejects unknown strict fields', () => {
    expect(() =>
      parseImageStudioSettings(
        JSON.stringify({
          ...defaultImageStudioSettings,
          targetAi: {
            ...defaultImageStudioSettings.targetAi,
            openai: {
              ...defaultImageStudioSettings.targetAi.openai,
              unknownSetting: true,
            },
          },
        })
      )
    ).toThrowError(/Invalid Image Studio settings payload/);
  });
});

describe('buildImageStudioSequenceSnapshot', () => {
  it('uses the Brain-resolved model id when provided', () => {
    const snapshot = buildImageStudioSequenceSnapshot(defaultImageStudioSettings, {
      modelId: 'gpt-image-1',
    });

    expect(snapshot.modelId).toBe('gpt-image-1');
  });
});
