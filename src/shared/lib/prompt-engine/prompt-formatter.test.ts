/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { recordPromptValidationTimingMock, logClientCatchMock, logClientErrorMock } = vi.hoisted(() => ({
  recordPromptValidationTimingMock: vi.fn(),
  logClientCatchMock: vi.fn(),
  logClientErrorMock: vi.fn(),
}));

vi.mock('@/shared/lib/prompt-core/runtime-observability', () => ({
  recordPromptValidationTiming: (...args: unknown[]) => recordPromptValidationTimingMock(...args),
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientCatch: (...args: unknown[]) => logClientCatchMock(...args),
  logClientError: (...args: unknown[]) => logClientErrorMock(...args),
}));

import type {
  PromptValidationRule,
  PromptValidationSettings,
} from '@/shared/contracts/prompt-engine';

import { formatProgrammaticPrompt } from './prompt-formatter';

const createRegexRule = (
  overrides: Partial<PromptValidationRule> = {}
): PromptValidationRule =>
  ({
    kind: 'regex',
    id: 'regex-rule',
    enabled: true,
    severity: 'warning',
    title: 'Regex Rule',
    description: null,
    message: 'Regex mismatch',
    pattern: '^expected$',
    flags: '',
    similar: [],
    ...overrides,
  }) as PromptValidationRule;

const createParamsRule = (
  overrides: Partial<PromptValidationRule> = {}
): PromptValidationRule =>
  ({
    kind: 'params_object',
    id: 'params-rule',
    enabled: true,
    severity: 'error',
    title: 'Params Rule',
    description: null,
    message: 'Missing params',
    similar: [],
    ...overrides,
  }) as PromptValidationRule;

const buildSettings = (rules: PromptValidationRule[]): PromptValidationSettings => ({
  enabled: true,
  rules,
  learnedRules: [],
});

describe('prompt-formatter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('skips formatting when validation finds no issues', () => {
    const result = formatProgrammaticPrompt(
      'expected',
      buildSettings([createRegexRule({ pattern: '^expected$' })])
    );

    expect(result).toEqual({
      prompt: 'expected',
      changed: false,
      applied: [],
      issuesBefore: 0,
      issuesAfter: 0,
    });
    expect(recordPromptValidationTimingMock).toHaveBeenCalledWith(
      'formatter_ms',
      expect.any(Number),
      expect.objectContaining({ changed: '0', mode: 'skip' })
    );
  });

  it('applies params autofixes and falls back to full validation for wide-impact repairs', () => {
    const result = formatProgrammaticPrompt(
      'param = { foo: \'bar\' }',
      buildSettings([
        createParamsRule({
          autofix: {
            enabled: true,
            operations: [
              {
                kind: 'replace',
                pattern: '\\bparam\\s*[:=]\\s*\\{',
                flags: 'i',
                replacement: 'params = {',
                comment: null,
              },
              {
                kind: 'params_json',
                comment: null,
              },
            ],
          },
        }),
      ])
    );

    expect(result.changed).toBe(true);
    expect(result.prompt).toContain('params = {');
    expect(result.prompt).toContain('"foo"');
    expect(result.prompt).toContain('"bar"');
    expect(result.applied).toEqual([
      { ruleId: 'params-rule', operationKind: 'replace' },
      { ruleId: 'params-rule', operationKind: 'params_json' },
    ]);
    expect(result.issuesBefore).toBe(1);
    expect(result.issuesAfter).toBe(0);
    expect(recordPromptValidationTimingMock).toHaveBeenLastCalledWith(
      'formatter_ms',
      expect.any(Number),
      expect.objectContaining({ changed: '1', mode: 'full' })
    );
  });

  it('applies suggestion replacements and uses incremental validation when the impact is narrow', () => {
    const result = formatProgrammaticPrompt(
      'teh',
      buildSettings([
        createRegexRule({
          pattern: '^the$',
          similar: [
            {
              pattern: 'teh',
              flags: 'i',
              suggestion: 'Use `the`.',
              comment: null,
            },
          ],
        }),
      ])
    );

    expect(result).toEqual({
      prompt: 'the',
      changed: true,
      applied: [{ ruleId: 'regex-rule', operationKind: 'replace' }],
      issuesBefore: 1,
      issuesAfter: 0,
    });
    expect(recordPromptValidationTimingMock).toHaveBeenLastCalledWith(
      'formatter_ms',
      expect.any(Number),
      expect.objectContaining({ changed: '1', mode: 'incremental' })
    );
  });

  it('respects sequence-group stop-on-replace behavior and pass-through boundaries', () => {
    const result = formatProgrammaticPrompt(
      'alpha',
      buildSettings([
        createRegexRule({
          id: 'first',
          pattern: '^done$',
          message: 'Need done',
          sequenceGroupId: 'group-1',
          chainMode: 'stop_on_replace',
          similar: [
            {
              pattern: 'alpha',
              flags: '',
              suggestion: 'Use `done`.',
              comment: null,
            },
          ],
        }),
        createRegexRule({
          id: 'second',
          pattern: '^blocked$',
          message: 'Need blocked',
          sequenceGroupId: 'group-1',
          passOutputToNext: false,
          similar: [
            {
              pattern: 'done',
              flags: '',
              suggestion: 'Use `blocked`.',
              comment: null,
            },
          ],
        }),
      ])
    );

    expect(result.prompt).toBe('done');
    expect(result.applied).toEqual([{ ruleId: 'first', operationKind: 'replace' }]);
    expect(result.issuesAfter).toBe(1);
  });

  it('logs invalid autofix and suggestion regex patterns without mutating the prompt', () => {
    const result = formatProgrammaticPrompt(
      'bad',
      buildSettings([
        createRegexRule({
          pattern: '^ok$',
          autofix: {
            enabled: true,
            operations: [
              {
                kind: 'replace',
                pattern: '[',
                flags: '',
                replacement: 'ok',
                comment: null,
              },
            ],
          },
          similar: [
            {
              pattern: '[',
              flags: '',
              suggestion: 'Use `ok`.',
              comment: null,
            },
          ],
        }),
      ])
    );

    expect(result).toEqual({
      prompt: 'bad',
      changed: false,
      applied: [],
      issuesBefore: 1,
      issuesAfter: 1,
    });
    expect(logClientCatchMock).toHaveBeenCalledTimes(2);
  });
});
