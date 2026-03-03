import { describe, expect, it } from 'vitest';

import { normalizeAgentPersonas } from '../utils/personas';

describe('normalizeAgentPersonas', () => {
  it('rejects deprecated capability model snapshot fields', () => {
    expect(() =>
      normalizeAgentPersonas([
        {
          id: 'persona-1',
          name: 'Legacy Persona',
          settings: {
            executorModel: 'gpt-4o',
          },
        },
      ])
    ).toThrowError(/deprecated ai snapshot keys/i);
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
    ).toThrowError(/deprecated ai snapshot keys/i);
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
    ).toThrowError(/deprecated ai snapshot keys/i);
  });

  it('rejects invalid non-array persona payloads', () => {
    expect(() => normalizeAgentPersonas({})).toThrowError(/invalid agent personas payload/i);
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
