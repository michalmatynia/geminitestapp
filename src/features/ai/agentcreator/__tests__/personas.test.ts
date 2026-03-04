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

  it('strips deprecated settings snapshot keys in migration mode', () => {
    const normalized = normalizeAgentPersonas(
      [
        {
          id: 'persona-legacy-settings',
          name: 'Legacy Settings Persona',
          settings: {
            modelId: 'gpt-4.1',
            temperature: 0.2,
            maxTokens: 1200,
            customInstructions: 'Keep concise',
          },
        },
      ],
      { stripDeprecatedSnapshotKeys: true }
    );

    expect(normalized).toHaveLength(1);
    expect(normalized[0]?.settings).toEqual({
      customInstructions: 'Keep concise',
    });
  });

  it('strips deprecated top-level snapshot keys in migration mode', () => {
    const normalized = normalizeAgentPersonas(
      [
        {
          id: 'persona-legacy-top-level',
          name: 'Legacy Top Level Persona',
          modelId: 'gpt-4.1',
          temperature: 0.2,
          maxTokens: 1200,
          settings: {
            customInstructions: 'Use factual style',
          },
        },
      ],
      { stripDeprecatedSnapshotKeys: true }
    );

    expect(normalized).toHaveLength(1);
    expect(normalized[0]?.settings).toEqual({
      customInstructions: 'Use factual style',
    });
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
