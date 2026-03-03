import { describe, expect, it } from 'vitest';

import { isAppError } from '@/shared/errors/app-error';

import { normalizeAgentPersonas } from '../utils/personas';

describe('normalizeAgentPersonas', () => {
  it('rejects deprecated capability model snapshot fields', () => {
    try {
      normalizeAgentPersonas([
        {
          id: 'persona-1',
          name: 'Legacy Persona',
          settings: {
            executorModel: 'gpt-4o',
          },
        },
      ]);
      throw new Error('Expected normalizeAgentPersonas to throw.');
    } catch (error) {
      expect(isAppError(error)).toBe(true);
    }
  });

  it('keeps canonical persona settings fields only', () => {
    const normalized = normalizeAgentPersonas([
      {
        id: 'persona-2',
        name: 'Canonical Persona',
        settings: {
          customInstructions: 'Stay concise',
          modelId: 'gpt-4.1',
          temperature: 0.2,
          maxTokens: 1200,
        },
      },
    ]);

    expect(normalized).toHaveLength(1);
    expect(normalized[0]?.settings).toEqual({
      customInstructions: 'Stay concise',
      modelId: 'gpt-4.1',
      temperature: 0.2,
      maxTokens: 1200,
    });
  });
});
