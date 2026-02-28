import { describe, expect, it } from 'vitest';

import {
  aiBrainAssignmentSchema,
  aiBrainCapabilityKeySchema,
  aiBrainFeatureSchema,
  brainModelsResponseSchema,
} from '@/shared/contracts/ai-brain';

describe('ai-brain contract runtime', () => {
  it('accepts chatbot as a valid brain feature', () => {
    expect(aiBrainFeatureSchema.parse('chatbot')).toBe('chatbot');
  });

  it('accepts agent runtime capability keys', () => {
    expect(aiBrainCapabilityKeySchema.parse('agent_runtime.planner')).toBe('agent_runtime.planner');
  });

  it('keeps systemPrompt on assignment parsing', () => {
    const assignment = aiBrainAssignmentSchema.parse({
      enabled: true,
      provider: 'model',
      modelId: 'gpt-4o-mini',
      systemPrompt: 'Be concise.',
    });

    expect(assignment.systemPrompt).toBe('Be concise.');
  });

  it('parses the canonical brain models response shape', () => {
    const payload = brainModelsResponseSchema.parse({
      models: ['gpt-4o-mini'],
      descriptors: {
        'gpt-4o-mini': {
          id: 'gpt-4o-mini',
          family: 'chat',
          modality: 'text',
          vendor: 'openai',
          supportsStreaming: true,
          supportsJsonMode: true,
        },
      },
      warning: {
        code: 'OLLAMA_UNAVAILABLE',
        message: 'fallback',
      },
      sources: {
        modelPresets: ['gpt-4o-mini'],
        paidModels: [],
        configuredOllamaModels: ['llama3.2'],
        liveOllamaModels: [],
      },
    });

    expect(payload.models).toEqual(['gpt-4o-mini']);
    expect(payload.descriptors?.['gpt-4o-mini']?.family).toBe('chat');
    expect(payload.sources?.configuredOllamaModels).toEqual(['llama3.2']);
  });
});
