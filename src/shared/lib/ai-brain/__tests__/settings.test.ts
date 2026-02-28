import { describe, expect, it } from 'vitest';

import {
  defaultBrainSettings,
  getBrainCapabilityDefinition,
  resolveBrainCapabilityAssignment,
  sanitizeBrainAssignment,
  sanitizeBrainAssignmentForProviders,
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
});
