import { describe, expect, it } from 'vitest';

import { normalizeAgentPersonas } from '../utils/personas';

describe('normalizeAgentPersonas', () => {
  it('rejects unsupported capability model snapshot fields', () => {
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
    ).toThrowError(/includes unsupported keys: executorModel/i);
  });

  it('rejects unsupported top-level persona model snapshot fields', () => {
    expect(() =>
      normalizeAgentPersonas([
        {
          id: 'persona-top-level',
          name: 'Legacy Top Level Persona',
          modelId: 'gpt-4.1',
        },
      ])
    ).toThrowError(/includes unsupported keys: modelId/i);
  });

  it('rejects unsupported persona model snapshot settings', () => {
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
    ).toThrowError(/includes unsupported keys: modelId, temperature, maxTokens/i);
  });

  it('rejects invalid non-array persona payloads', () => {
    expect(() => normalizeAgentPersonas({})).toThrowError(/invalid agent personas payload/i);
  });

  it('rejects unsupported agent persona settings keys', () => {
    expect(() =>
      normalizeAgentPersonas([
        {
          id: 'persona-unsupported-settings',
          name: 'Unsupported Settings Persona',
          settings: {
            unknownField: 'value',
          },
        },
      ])
    ).toThrowError(/invalid agent persona settings payload/i);
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
