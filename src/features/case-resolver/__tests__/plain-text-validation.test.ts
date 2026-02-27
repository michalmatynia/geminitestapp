import { describe, expect, it } from 'vitest';

import { parseValidatorPatternLists } from '@/shared/contracts/validator';
import { parsePromptEngineSettings } from '@/shared/lib/prompt-engine/settings';
import { DEFAULT_CASE_RESOLVER_NODE_META } from '@/shared/contracts/case-resolver';

import { applyCaseResolverPlainTextValidation } from '../plain-text-validation';

describe('case resolver plain text validation runtime', () => {
  const patternLists = parseValidatorPatternLists(null);
  const promptEngineSettings = parsePromptEngineSettings(null);

  it('converts html to plain text when validation and formatter are enabled', () => {
    const output = applyCaseResolverPlainTextValidation({
      input: '<p>Hello&nbsp;<strong>World</strong></p>',
      nodeMeta: {
        ...DEFAULT_CASE_RESOLVER_NODE_META,
        plainTextValidationEnabled: true,
        plainTextFormatterEnabled: true,
      },
      patternLists,
      promptEngineSettings,
    });

    expect(output).toBe('Hello World');
  });

  it('keeps source text when formatter is disabled', () => {
    const input = '<p>Hello&nbsp;<strong>World</strong></p>';
    const output = applyCaseResolverPlainTextValidation({
      input,
      nodeMeta: {
        ...DEFAULT_CASE_RESOLVER_NODE_META,
        plainTextValidationEnabled: true,
        plainTextFormatterEnabled: false,
      },
      patternLists,
      promptEngineSettings,
    });

    expect(output).toBe(input);
  });

  it('keeps source text when validation is disabled', () => {
    const input = '<p>Hello&nbsp;<strong>World</strong></p>';
    const output = applyCaseResolverPlainTextValidation({
      input,
      nodeMeta: {
        ...DEFAULT_CASE_RESOLVER_NODE_META,
        plainTextValidationEnabled: false,
        plainTextFormatterEnabled: false,
      },
      patternLists,
      promptEngineSettings,
    });

    expect(output).toBe(input);
  });
});

