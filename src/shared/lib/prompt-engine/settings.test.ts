/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { logClientCatchMock } = vi.hoisted(() => ({
  logClientCatchMock: vi.fn(),
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientCatch: (...args: unknown[]) => logClientCatchMock(...args),
}));

import {
  defaultPromptEngineSettings,
  defaultPromptValidationRules,
  parsePromptEngineSettings,
  parsePromptValidationRules,
} from './settings';

describe('prompt-engine settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns defaults for empty, invalid, or schema-mismatched settings payloads', () => {
    expect(parsePromptEngineSettings(undefined)).toBe(defaultPromptEngineSettings);
    expect(parsePromptEngineSettings(null)).toBe(defaultPromptEngineSettings);
    expect(parsePromptEngineSettings('')).toBe(defaultPromptEngineSettings);
    expect(parsePromptEngineSettings('{"version":2}')).toBe(defaultPromptEngineSettings);

    expect(parsePromptEngineSettings('{not-json')).toBe(defaultPromptEngineSettings);
    expect(logClientCatchMock).toHaveBeenCalledWith(
      expect.any(SyntaxError),
      expect.objectContaining({
        source: 'prompt-engine.settings',
        action: 'normalizePromptEngineSettings',
      })
    );
  });

  it('injects missing autofix metadata and appends any default rules missing from storage', () => {
    const baseRule = defaultPromptValidationRules.find((rule) => rule.id === 'params.object');
    expect(baseRule).toBeDefined();

    const stored = JSON.stringify({
      version: 1,
      promptValidation: {
        enabled: false,
        rules: [
          {
            ...baseRule,
            autofix: undefined,
          },
        ],
      },
    });

    const parsed = parsePromptEngineSettings(stored);

    expect(parsed.promptValidation.enabled).toBe(false);
    expect(parsed.promptValidation.learnedRules).toEqual([]);
    expect(parsed.promptValidation.rules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'params.object',
          autofix: baseRule?.autofix,
        }),
      ])
    );
    expect(parsed.promptValidation.rules).toHaveLength(defaultPromptValidationRules.length);
  });

  it('preserves stored autofix payloads when the storage already contains autofix metadata', () => {
    const baseRule = defaultPromptValidationRules.find((rule) => rule.id === 'params.object');
    expect(baseRule).toBeDefined();

    const stored = JSON.stringify({
      version: 1,
      promptValidation: {
        enabled: true,
        rules: [
          {
            ...baseRule,
            autofix: {
              enabled: true,
              operations: [],
            },
          },
        ],
        learnedRules: [],
      },
    });

    const parsed = parsePromptEngineSettings(stored);
    const parsedRule = parsed.promptValidation.rules.find((rule) => rule.id === 'params.object');

    expect(parsedRule).toEqual(
      expect.objectContaining({
        autofix: {
          enabled: true,
          operations: [],
        },
      })
    );
  });

  it('parses rules JSON, validates shape, and backfills missing autofix operations when needed', () => {
    const paramsRule = defaultPromptValidationRules.find((rule) => rule.id === 'params.object');
    expect(paramsRule).toBeDefined();

    const merged = parsePromptValidationRules(
      JSON.stringify([
        {
          ...paramsRule,
          autofix: undefined,
        },
      ])
    );
    expect(merged).toEqual({
      ok: true,
      rules: [
        expect.objectContaining({
          id: 'params.object',
          autofix: paramsRule?.autofix,
        }),
      ],
    });

    const preserved = parsePromptValidationRules(
      JSON.stringify([
        {
          ...paramsRule,
          autofix: {
            enabled: true,
            operations: [],
          },
        },
      ])
    );
    expect(preserved).toEqual({
      ok: true,
      rules: [
        expect.objectContaining({
          id: 'params.object',
          autofix: {
            enabled: true,
            operations: [],
          },
        }),
      ],
    });

    expect(parsePromptValidationRules('{"not":"an-array"}')).toEqual({
      ok: false,
      error: 'Invalid rules shape. Expected an array of rule objects.',
    });

    expect(parsePromptValidationRules('{bad-json')).toEqual({
      ok: false,
      error: 'Invalid JSON.',
    });
    expect(logClientCatchMock).toHaveBeenCalledWith(
      expect.any(SyntaxError),
      expect.objectContaining({
        source: 'prompt-engine.settings',
        action: 'parsePromptValidationRules',
      })
    );
  });
});
