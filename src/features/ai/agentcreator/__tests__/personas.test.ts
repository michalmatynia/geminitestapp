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

  it('rejects deprecated top-level persona model snapshot fields', () => {
    expect(() =>
      normalizeAgentPersonas([
        {
          id: 'persona-top-level',
          name: 'Legacy Top Level Persona',
          modelId: 'gpt-4.1',
        },
      ])
    ).toThrowError(/Legacy Agent Persona model snapshot fields are no longer supported/i);
  });

  it('rejects deprecated persona model snapshot settings', () => {
    expect(() =>
      normalizeAgentPersonas([
        {
          id: 'persona-2',
          name: 'Legacy Persona Settings',
          settings: {
            modelId: 'gpt-4.1',
            temperature: 0.2,
            maxTokens: 1200,
          },
        },
      ])
    ).toThrowError(/Invalid Agent Persona settings payload/i);
  });

  it('keeps canonical persona settings fields only', () => {
    const normalized = normalizeAgentPersonas([
      {
        id: 'persona-3',
        name: 'Canonical Persona',
        settings: {
          customInstructions: 'Stay concise',
        },
      },
    ]);

    expect(normalized).toHaveLength(1);
    expect(normalized[0]?.settings).toEqual({
      customInstructions: 'Stay concise',
    });
  });
});
