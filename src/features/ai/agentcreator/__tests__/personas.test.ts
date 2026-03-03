import { describe, expect, it } from 'vitest';

import { normalizeAgentPersonas } from '../utils/personas';

describe('normalizeAgentPersonas', () => {
  it('strips deprecated capability model snapshot fields', () => {
    const normalized = normalizeAgentPersonas([
      {
        id: 'persona-1',
        name: 'Legacy Persona',
        settings: {
          executorModel: 'gpt-4o',
        },
      },
    ]);

    expect(normalized).toHaveLength(1);
    expect(normalized[0]?.settings).toEqual({});
  });

  it('strips deprecated top-level persona model snapshot fields', () => {
    const normalized = normalizeAgentPersonas([
      {
        id: 'persona-top-level',
        name: 'Legacy Top Level Persona',
        modelId: 'gpt-4.1',
      },
    ]);

    expect(normalized).toHaveLength(1);
    expect(normalized[0]?.settings).toEqual({});
  });

  it('strips deprecated persona model snapshot settings', () => {
    const normalized = normalizeAgentPersonas([
      {
        id: 'persona-2',
        name: 'Legacy Persona Settings',
        settings: {
          modelId: 'gpt-4.1',
          temperature: 0.2,
          maxTokens: 1200,
        },
      },
    ]);

    expect(normalized).toHaveLength(1);
    expect(normalized[0]?.settings).toEqual({});
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
