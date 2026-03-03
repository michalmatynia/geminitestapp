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

  it('parses legacy provider catalog pool arrays when canonical entries are missing', () => {
    const parsed = parseBrainProviderCatalog(
      JSON.stringify({
        modelPresets: ['gpt-4o-mini'],
        paidModels: ['gpt-4.1'],
        ollamaModels: ['llama3.1'],
        agentModels: [],
        deepthinkingAgents: [],
        playwrightPersonas: [],
      })
    );

    expect(parsed.entries).toEqual([
      { pool: 'modelPresets', value: 'gpt-4o-mini' },
      { pool: 'paidModels', value: 'gpt-4.1' },
      { pool: 'ollamaModels', value: 'llama3.1' },
    ]);
    expect(parsed.modelPresets).toEqual(['gpt-4o-mini']);
    expect(parsed.paidModels).toEqual(['gpt-4.1']);
    expect(parsed.ollamaModels).toEqual(['llama3.1']);
  });

  it('prefers canonical provider catalog entries when legacy arrays are also present', () => {
    const parsed = parseBrainProviderCatalog(
      JSON.stringify({
        entries: [
          { pool: 'paidModels', value: 'gpt-4.1' },
          { pool: 'modelPresets', value: 'gpt-4o-mini' },
        ],
        modelPresets: ['legacy-ignored'],
        paidModels: ['legacy-ignored'],
      })
    );

    expect(parsed.entries).toEqual([
      { pool: 'paidModels', value: 'gpt-4.1' },
      { pool: 'modelPresets', value: 'gpt-4o-mini' },
    ]);
    expect(parsed.modelPresets).toEqual(['gpt-4o-mini']);
    expect(parsed.paidModels).toEqual(['gpt-4.1']);
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
    expect(parsed.paidModels).toEqual(['gpt-4.1']);
    expect(parsed.modelPresets).toEqual(['gpt-4o-mini']);
  });

  it('sanitizes provider entries and emits both entries and arrays', () => {
    const sanitized = sanitizeBrainProviderCatalog({
      entries: [
        { pool: 'modelPresets', value: ' gpt-4o-mini ' },
        { pool: 'modelPresets', value: 'gpt-4o-mini' },
        { pool: 'paidModels', value: 'gpt-4.1' },
      ],
      modelPresets: ['legacy'],
      paidModels: ['legacy'],
      ollamaModels: [],
      agentModels: [],
      deepthinkingAgents: [],
      playwrightPersonas: [],
    });

    expect(sanitized.entries).toEqual([
      { pool: 'modelPresets', value: 'gpt-4o-mini' },
      { pool: 'paidModels', value: 'gpt-4.1' },
    ]);
    expect(sanitized.modelPresets).toEqual(['gpt-4o-mini']);
    expect(sanitized.paidModels).toEqual(['gpt-4.1']);
  });

  it('serializes provider catalogs using canonical entry-only persisted shape', () => {
    const persisted = toPersistedBrainProviderCatalog(
      sanitizeBrainProviderCatalog({
        entries: [{ pool: 'modelPresets', value: 'gpt-4o-mini' }],
        modelPresets: ['legacy'],
        paidModels: ['legacy'],
        ollamaModels: [],
        agentModels: [],
        deepthinkingAgents: [],
        playwrightPersonas: [],
      })
    ) as Record<string, unknown>;

    expect(persisted).toEqual({
      entries: [{ pool: 'modelPresets', value: 'gpt-4o-mini' }],
    });
    expect('modelPresets' in persisted).toBe(false);
    expect('paidModels' in persisted).toBe(false);
  });
});
