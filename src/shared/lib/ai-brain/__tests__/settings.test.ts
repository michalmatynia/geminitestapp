import { describe, expect, it } from 'vitest';

import {
  defaultBrainSettings,
  getDefaultCapabilityForFeature,
  getBrainCapabilityDefinition,
  getBrainCapabilityModelFamilies,
  parseBrainSettings,
  parseBrainProviderCatalog,
  resolveBrainCapabilityAssignment,
  sanitizeBrainProviderCatalog,
  sanitizeBrainAssignment,
  sanitizeBrainAssignmentForProviders,
  toPersistedBrainProviderCatalog,
} from '../settings';

describe('ai-brain settings helpers', () => {
  it('falls back from capability assignment to feature assignment', () => {
    const settings = {
      ...defaultBrainSettings,
      assignments: {
        ...defaultBrainSettings.assignments,
        products: {
          ...defaultBrainSettings.defaults,
          modelId: 'gpt-4.1-mini',
          temperature: 0.4,
        },
      },
      capabilities: {
        ...defaultBrainSettings.capabilities,
      },
    };

    const resolved = resolveBrainCapabilityAssignment(settings, 'product.translation');

    expect(resolved.modelId).toBe('gpt-4.1-mini');
    expect(resolved.temperature).toBe(0.4);
  });

  it('treats a disabled feature as authoritative over enabled capability overrides', () => {
    const settings = {
      ...defaultBrainSettings,
      assignments: {
        ...defaultBrainSettings.assignments,
        prompt_engine: {
          ...defaultBrainSettings.defaults,
          enabled: false,
          modelId: 'feature-off-model',
        },
      },
      capabilities: {
        ...defaultBrainSettings.capabilities,
        'prompt_engine.prompt_exploder': {
          ...defaultBrainSettings.defaults,
          enabled: true,
          modelId: 'capability-model',
        },
      },
    };

    const resolved = resolveBrainCapabilityAssignment(settings, 'prompt_engine.prompt_exploder');

    expect(resolved.enabled).toBe(false);
    expect(resolved.modelId).toBe('capability-model');
  });

  it('trims system prompts during assignment sanitization', () => {
    const sanitized = sanitizeBrainAssignment({
      ...defaultBrainSettings.defaults,
      modelId: '  gpt-4o-mini  ',
      systemPrompt: '  Keep output strict.  ',
      notes: '  note  ',
    });

    expect(sanitized.modelId).toBe('gpt-4o-mini');
    expect(sanitized.systemPrompt).toBe('Keep output strict.');
    expect(sanitized.notes).toBe('note');
  });

  it('classifies image studio general as image generation', () => {
    expect(getBrainCapabilityDefinition('image_studio.general').modelFamily).toBe(
      'image_generation'
    );
  });

  it('maps prompt engine to the dedicated prompt exploder capability', () => {
    expect(getDefaultCapabilityForFeature('prompt_engine')).toBe('prompt_engine.prompt_exploder');
    expect(getBrainCapabilityDefinition('prompt_engine.prompt_exploder').feature).toBe(
      'prompt_engine'
    );
  });

  it('exposes a dedicated Kangur tutor drawing analysis capability', () => {
    expect(getDefaultCapabilityForFeature('kangur_ai_tutor')).toBe('kangur_ai_tutor.chat');
    expect(getBrainCapabilityDefinition('kangur_ai_tutor.drawing_analysis')).toMatchObject({
      feature: 'kangur_ai_tutor',
      modelFamily: 'vision_extract',
    });
  });

  it('exposes a dedicated Amazon scan candidate match capability', () => {
    expect(getBrainCapabilityDefinition('product.scan.amazon_candidate_match')).toMatchObject({
      feature: 'products',
      modelFamily: 'vision_extract',
    });
    expect(getBrainCapabilityModelFamilies('product.scan.amazon_candidate_match')).toEqual([
      'vision_extract',
    ]);
  });

  it('coerces invalid providers to the allowed provider set', () => {
    const sanitized = sanitizeBrainAssignmentForProviders(
      {
        ...defaultBrainSettings.defaults,
        provider: 'agent',
      },
      ['model']
    );

    expect(sanitized.provider).toBe('model');
  });

  it('allows AI Paths to surface chat and compatible multimodal model families', () => {
    expect(getBrainCapabilityModelFamilies('ai_paths.model')).toEqual([
      'chat',
      'validation',
      'vision_extract',
      'ocr',
    ]);
    expect(getBrainCapabilityModelFamilies('chatbot.reply')).toEqual(['chat']);
  });

  it('rejects legacy snapshot keys in non-empty brain settings payloads', () => {
    expect(() =>
      parseBrainSettings(
        JSON.stringify({
          defaults: {
            ...defaultBrainSettings.defaults,
            fallbackModelId: 'legacy-model',
          },
          assignments: {},
          capabilities: {},
        })
      )
    ).toThrowError(/Invalid AI Brain settings payload/i);
  });

  it('rejects non-object brain settings payloads', () => {
    expect(() => parseBrainSettings(JSON.stringify(['legacy']))).toThrowError(
      /Invalid AI Brain settings payload/i
    );
  });

  it('rejects unknown provider catalog keys', () => {
    expect(() =>
      parseBrainProviderCatalog(
        JSON.stringify({
          roguePool: ['gpt-4o-mini'],
        })
      )
    ).toThrowError(/Invalid AI Brain provider catalog payload/i);
  });

  it('rejects deprecated provider catalog pool arrays and requires canonical entries', () => {
    expect(() =>
      parseBrainProviderCatalog(
        JSON.stringify({
          modelPresets: ['gpt-4o-mini'],
          paidModels: ['gpt-4.1'],
        })
      )
    ).toThrowError(/Invalid AI Brain provider catalog payload/i);
  });

  it('rejects mixed canonical entries with deprecated provider catalog pool arrays', () => {
    expect(() =>
      parseBrainProviderCatalog(
        JSON.stringify({
          entries: [{ pool: 'paidModels', value: 'gpt-4.1' }],
          modelPresets: ['gpt-4o-mini'],
        })
      )
    ).toThrowError(/Invalid AI Brain provider catalog payload/i);
  });

  it('parses canonical entry-only provider catalog payloads and preserves entry order', () => {
    const parsed = parseBrainProviderCatalog(
      JSON.stringify({
        entries: [
          { pool: 'paidModels', value: 'gpt-4.1' },
          { pool: 'modelPresets', value: 'gpt-4o-mini' },
        ],
      })
    );

    expect(parsed.entries).toEqual([
      { pool: 'paidModels', value: 'gpt-4.1' },
      { pool: 'modelPresets', value: 'gpt-4o-mini' },
    ]);
  });

  it('sanitizes provider entries without emitting deprecated pool arrays', () => {
    const sanitized = sanitizeBrainProviderCatalog({
      entries: [
        { pool: 'modelPresets', value: ' gpt-4o-mini ' },
        { pool: 'modelPresets', value: 'gpt-4o-mini' },
        { pool: 'paidModels', value: 'gpt-4.1' },
      ],
    });

    expect(sanitized.entries).toEqual([
      { pool: 'modelPresets', value: 'gpt-4o-mini' },
      { pool: 'paidModels', value: 'gpt-4.1' },
    ]);
  });

  it('serializes provider catalogs using canonical entry-only persisted shape', () => {
    const persisted = toPersistedBrainProviderCatalog(
      sanitizeBrainProviderCatalog({
        entries: [{ pool: 'modelPresets', value: 'gpt-4o-mini' }],
      })
    ) as Record<string, unknown>;

    expect(persisted).toEqual({
      entries: [{ pool: 'modelPresets', value: 'gpt-4o-mini' }],
    });
    expect('modelPresets' in persisted).toBe(false);
    expect('paidModels' in persisted).toBe(false);
  });
});
