import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  describeDynamicReplacementRecipe,
  encodeDynamicReplacementRecipe,
  evaluateDynamicReplacementRecipe,
  evaluateStringCondition,
  getPatternReplacementPreview,
  getStaticReplacementValue,
  isDynamicReplacementValue,
  parseDynamicReplacementRecipe,
} from '@/shared/lib/products/utils/validator-replacement-recipe';

const { logClientErrorMock } = vi.hoisted(() => ({
  logClientErrorMock: vi.fn(),
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientError: (error: unknown) => logClientErrorMock(error),
}));

describe('validator-replacement-recipe.shared-lib', () => {
  beforeEach(() => {
    logClientErrorMock.mockReset();
  });

  it('parses valid recipes, rejects invalid recipe shapes, and distinguishes static replacements', () => {
    const validRecipe = encodeDynamicReplacementRecipe({
      version: 1,
      sourceMode: 'current_field',
      sourceField: null,
      sourceRegex: null,
      sourceFlags: null,
      sourceMatchGroup: null,
      mathOperation: 'none',
      mathOperand: null,
      roundMode: 'none',
      padLength: null,
      padChar: null,
      logicOperator: 'none',
      logicOperand: null,
      logicFlags: null,
      logicWhenTrueAction: 'keep',
      logicWhenTrueValue: null,
      logicWhenFalseAction: 'keep',
      logicWhenFalseValue: null,
      resultAssembly: 'segment_only',
      targetApply: 'replace_matched_segment',
    });

    expect(parseDynamicReplacementRecipe(validRecipe)).not.toBeNull();
    expect(isDynamicReplacementValue(validRecipe)).toBe(true);
    expect(getStaticReplacementValue(validRecipe)).toBeNull();
    expect(getStaticReplacementValue('PLAIN')).toBe('PLAIN');
    expect(getStaticReplacementValue(undefined)).toBeNull();
    expect(isDynamicReplacementValue('PLAIN')).toBe(false);

    expect(parseDynamicReplacementRecipe('__recipe__:')).toBeNull();
    expect(parseDynamicReplacementRecipe('__recipe__:{bad-json')).toBeNull();
    expect(logClientErrorMock).toHaveBeenCalledTimes(1);

    expect(
      parseDynamicReplacementRecipe(
        encodeDynamicReplacementRecipe({
          version: 1,
          sourceMode: 'form_field',
          sourceField: null,
          sourceRegex: null,
          sourceFlags: null,
          sourceMatchGroup: null,
          mathOperation: 'none',
          mathOperand: null,
          roundMode: 'none',
          padLength: null,
          padChar: null,
          logicOperator: 'none',
          logicOperand: null,
          logicFlags: null,
          logicWhenTrueAction: 'keep',
          logicWhenTrueValue: null,
          logicWhenFalseAction: 'keep',
          logicWhenFalseValue: null,
          resultAssembly: 'segment_only',
          targetApply: 'replace_matched_segment',
        })
      )
    ).toBeNull();

    const normalized = parseDynamicReplacementRecipe(
      encodeDynamicReplacementRecipe({
        version: 1,
        sourceMode: 'latest_product_field',
        sourceField: 'sku',
        sourceRegex: '',
        sourceFlags: '',
        sourceMatchGroup: -1,
        mathOperation: 'invalid',
        mathOperand: Number.NaN,
        roundMode: 'invalid',
        padLength: 'bad' as any,
        padChar: '',
        logicOperator: 'invalid',
        logicOperand: 9 as any,
        logicFlags: '',
        logicWhenTrueAction: 'invalid',
        logicWhenTrueValue: 10 as any,
        logicWhenFalseAction: 'invalid',
        logicWhenFalseValue: 11 as any,
        resultAssembly: 'invalid',
        targetApply: 'invalid',
      })
    );

    expect(normalized).toEqual({
      version: 1,
      sourceMode: 'latest_product_field',
      sourceField: 'sku',
      sourceRegex: null,
      sourceFlags: null,
      sourceMatchGroup: null,
      mathOperation: 'none',
      mathOperand: null,
      roundMode: 'none',
      padLength: null,
      padChar: null,
      logicOperator: 'none',
      logicOperand: null,
      logicFlags: null,
      logicWhenTrueAction: 'keep',
      logicWhenTrueValue: null,
      logicWhenFalseAction: 'keep',
      logicWhenFalseValue: null,
      resultAssembly: 'segment_only',
      targetApply: 'replace_matched_segment',
    });
  });

  it('describes recipes with source, capture, math, logic, and target metadata', () => {
    const recipe = parseDynamicReplacementRecipe(
      encodeDynamicReplacementRecipe({
        version: 1,
        sourceMode: 'latest_product_field',
        sourceField: 'sku',
        sourceRegex: '(\\d+)$',
        sourceFlags: 'i',
        sourceMatchGroup: 1,
        mathOperation: 'subtract',
        mathOperand: 2,
        roundMode: 'none',
        padLength: 4,
        padChar: '0',
        logicOperator: 'equals',
        logicOperand: '7',
        logicFlags: null,
        logicWhenTrueAction: 'set_value',
        logicWhenTrueValue: 'fallback',
        logicWhenFalseAction: 'clear',
        logicWhenFalseValue: null,
        resultAssembly: 'source_replace_match',
        targetApply: 'replace_whole_field',
      })
    );

    expect(describeDynamicReplacementRecipe(recipe)).toBe(
      'latest_product_field:sku /(\\d+)$/i group#1 subtract 2 if equals 7 ? set_value : clear -> source_replace_match -> replace_whole_field'
    );
    expect(describeDynamicReplacementRecipe(null)).toBe('n/a');
  });

  it('covers all string condition operators including invalid regex and numeric failures', () => {
    expect(evaluateStringCondition({ operator: 'none', value: 'x', operand: null, flags: null })).toBe(true);
    expect(
      evaluateStringCondition({ operator: 'equals', value: 'Alpha', operand: 'Alpha', flags: null })
    ).toBe(true);
    expect(
      evaluateStringCondition({ operator: 'not_equals', value: 'Alpha', operand: 'Beta', flags: null })
    ).toBe(true);
    expect(
      evaluateStringCondition({ operator: 'contains', value: 'keychain', operand: 'cha', flags: null })
    ).toBe(true);
    expect(
      evaluateStringCondition({ operator: 'starts_with', value: 'KEYCHA002', operand: 'KEY', flags: null })
    ).toBe(true);
    expect(
      evaluateStringCondition({ operator: 'ends_with', value: 'KEYCHA002', operand: '002', flags: null })
    ).toBe(true);
    expect(
      evaluateStringCondition({ operator: 'regex', value: 'keycha000', operand: '^KEYCHA\\d+$', flags: 'i' })
    ).toBe(true);
    expect(
      evaluateStringCondition({ operator: 'regex', value: 'Alpha', operand: '[broken', flags: null })
    ).toBe(false);
    expect(
      evaluateStringCondition({ operator: 'gt', value: '11', operand: '10', flags: null })
    ).toBe(true);
    expect(
      evaluateStringCondition({ operator: 'gte', value: '10', operand: '10', flags: null })
    ).toBe(true);
    expect(
      evaluateStringCondition({ operator: 'lt', value: '9', operand: '10', flags: null })
    ).toBe(true);
    expect(
      evaluateStringCondition({ operator: 'lte', value: '10', operand: '10', flags: null })
    ).toBe(true);
    expect(
      evaluateStringCondition({ operator: 'gt', value: 'abc', operand: '10', flags: null })
    ).toBe(false);
    expect(
      evaluateStringCondition({ operator: 'is_empty', value: '   ', operand: null, flags: null })
    ).toBe(true);
    expect(
      evaluateStringCondition({ operator: 'is_not_empty', value: 'ok', operand: null, flags: null })
    ).toBe(true);
    expect(logClientErrorMock).toHaveBeenCalledTimes(1);
  });

  it('evaluates current, form, and latest-product source modes with math, padding, logic, and target application branches', () => {
    const latestRecipe = parseDynamicReplacementRecipe(
      encodeDynamicReplacementRecipe({
        version: 1,
        sourceMode: 'latest_product_field',
        sourceField: 'sku',
        sourceRegex: '(\\d+)$',
        sourceFlags: null,
        sourceMatchGroup: 1,
        mathOperation: 'add',
        mathOperand: 1,
        roundMode: 'none',
        padLength: 3,
        padChar: '0',
        logicOperator: 'none',
        logicOperand: null,
        logicFlags: null,
        logicWhenTrueAction: 'keep',
        logicWhenTrueValue: null,
        logicWhenFalseAction: 'keep',
        logicWhenFalseValue: null,
        resultAssembly: 'source_replace_match',
        targetApply: 'replace_whole_field',
      })
    );

    expect(
      evaluateDynamicReplacementRecipe(latestRecipe!, {
        pattern: { regex: '^KEYCHA\\d{3}$', flags: null },
        fieldValue: 'KEYCHA000',
        formValues: {},
        latestProductValues: { sku: 'KEYCHA001' },
      })
    ).toBe('KEYCHA002');

    const formRecipe = parseDynamicReplacementRecipe(
      encodeDynamicReplacementRecipe({
        version: 1,
        sourceMode: 'form_field',
        sourceField: 'seed',
        sourceRegex: '(\\d+)$',
        sourceFlags: null,
        sourceMatchGroup: 1,
        mathOperation: 'multiply',
        mathOperand: 2,
        roundMode: 'ceil',
        padLength: 3,
        padChar: '0',
        logicOperator: 'equals',
        logicOperand: '010',
        logicFlags: null,
        logicWhenTrueAction: 'set_value',
        logicWhenTrueValue: '777',
        logicWhenFalseAction: 'abort',
        logicWhenFalseValue: null,
        resultAssembly: 'segment_only',
        targetApply: 'replace_matched_segment',
      })
    );

    expect(
      evaluateDynamicReplacementRecipe(formRecipe!, {
        pattern: { regex: '\\d{3}$', flags: null },
        fieldValue: 'SKU-001',
        formValues: { seed: 'A-5' },
        latestProductValues: null,
      })
    ).toBe('SKU-777');

    const currentRecipe = parseDynamicReplacementRecipe(
      encodeDynamicReplacementRecipe({
        version: 1,
        sourceMode: 'current_field',
        sourceField: null,
        sourceRegex: '(\\d+)$',
        sourceFlags: null,
        sourceMatchGroup: 1,
        mathOperation: 'none',
        mathOperand: null,
        roundMode: 'none',
        padLength: null,
        padChar: null,
        logicOperator: 'equals',
        logicOperand: '001',
        logicFlags: null,
        logicWhenTrueAction: 'clear',
        logicWhenTrueValue: null,
        logicWhenFalseAction: 'keep',
        logicWhenFalseValue: null,
        resultAssembly: 'segment_only',
        targetApply: 'replace_matched_segment',
      })
    );

    expect(
      evaluateDynamicReplacementRecipe(currentRecipe!, {
        pattern: { regex: '\\d+$', flags: null },
        fieldValue: 'SKU001',
        formValues: {},
        latestProductValues: null,
      })
    ).toBe('SKU');
  });

  it('covers null-return branches for missing source data, regex failures, missing matches, invalid math, and invalid target replacement', () => {
    const missingLatestRecipe = parseDynamicReplacementRecipe(
      encodeDynamicReplacementRecipe({
        version: 1,
        sourceMode: 'latest_product_field',
        sourceField: 'sku',
        sourceRegex: null,
        sourceFlags: null,
        sourceMatchGroup: null,
        mathOperation: 'none',
        mathOperand: null,
        roundMode: 'none',
        padLength: null,
        padChar: null,
        logicOperator: 'none',
        logicOperand: null,
        logicFlags: null,
        logicWhenTrueAction: 'keep',
        logicWhenTrueValue: null,
        logicWhenFalseAction: 'keep',
        logicWhenFalseValue: null,
        resultAssembly: 'segment_only',
        targetApply: 'replace_whole_field',
      })
    );
    expect(
      evaluateDynamicReplacementRecipe(missingLatestRecipe!, {
        pattern: { regex: '^SKU\\d+$', flags: null },
        fieldValue: 'SKU000',
        formValues: {},
        latestProductValues: {},
      })
    ).toBeNull();

    const invalidSourceRegexRecipe = parseDynamicReplacementRecipe(
      encodeDynamicReplacementRecipe({
        version: 1,
        sourceMode: 'current_field',
        sourceField: null,
        sourceRegex: '[broken',
        sourceFlags: null,
        sourceMatchGroup: null,
        mathOperation: 'none',
        mathOperand: null,
        roundMode: 'none',
        padLength: null,
        padChar: null,
        logicOperator: 'none',
        logicOperand: null,
        logicFlags: null,
        logicWhenTrueAction: 'keep',
        logicWhenTrueValue: null,
        logicWhenFalseAction: 'keep',
        logicWhenFalseValue: null,
        resultAssembly: 'segment_only',
        targetApply: 'replace_whole_field',
      })
    );
    expect(
      evaluateDynamicReplacementRecipe(invalidSourceRegexRecipe!, {
        pattern: { regex: '^SKU\\d+$', flags: null },
        fieldValue: 'SKU000',
        formValues: {},
        latestProductValues: null,
      })
    ).toBeNull();

    const missingMatchRecipe = parseDynamicReplacementRecipe(
      encodeDynamicReplacementRecipe({
        version: 1,
        sourceMode: 'current_field',
        sourceField: null,
        sourceRegex: '(\\d+)$',
        sourceFlags: null,
        sourceMatchGroup: 2,
        mathOperation: 'add',
        mathOperand: 1,
        roundMode: 'none',
        padLength: null,
        padChar: null,
        logicOperator: 'none',
        logicOperand: null,
        logicFlags: null,
        logicWhenTrueAction: 'keep',
        logicWhenTrueValue: null,
        logicWhenFalseAction: 'keep',
        logicWhenFalseValue: null,
        resultAssembly: 'source_replace_match',
        targetApply: 'replace_whole_field',
      })
    );
    expect(
      evaluateDynamicReplacementRecipe(missingMatchRecipe!, {
        pattern: { regex: '^KEYCHA\\d{3}$', flags: null },
        fieldValue: 'KEYCHA000',
        formValues: {},
        latestProductValues: null,
      })
    ).toBeNull();

    const invalidMathRecipe = parseDynamicReplacementRecipe(
      encodeDynamicReplacementRecipe({
        version: 1,
        sourceMode: 'current_field',
        sourceField: null,
        sourceRegex: null,
        sourceFlags: null,
        sourceMatchGroup: null,
        mathOperation: 'divide',
        mathOperand: 0,
        roundMode: 'none',
        padLength: null,
        padChar: null,
        logicOperator: 'none',
        logicOperand: null,
        logicFlags: null,
        logicWhenTrueAction: 'keep',
        logicWhenTrueValue: null,
        logicWhenFalseAction: 'keep',
        logicWhenFalseValue: null,
        resultAssembly: 'segment_only',
        targetApply: 'replace_whole_field',
      })
    );
    expect(
      evaluateDynamicReplacementRecipe(invalidMathRecipe!, {
        pattern: { regex: '^SKU\\d+$', flags: null },
        fieldValue: 'SKU000',
        formValues: {},
        latestProductValues: null,
      })
    ).toBeNull();

    const invalidTargetRecipe = parseDynamicReplacementRecipe(
      encodeDynamicReplacementRecipe({
        version: 1,
        sourceMode: 'current_field',
        sourceField: null,
        sourceRegex: '(\\d+)$',
        sourceFlags: null,
        sourceMatchGroup: 1,
        mathOperation: 'add',
        mathOperand: 1,
        roundMode: 'floor',
        padLength: 3,
        padChar: '0',
        logicOperator: 'none',
        logicOperand: null,
        logicFlags: null,
        logicWhenTrueAction: 'keep',
        logicWhenTrueValue: null,
        logicWhenFalseAction: 'keep',
        logicWhenFalseValue: null,
        resultAssembly: 'segment_only',
        targetApply: 'replace_matched_segment',
      })
    );
    expect(
      evaluateDynamicReplacementRecipe(invalidTargetRecipe!, {
        pattern: { regex: '\\d+$', flags: '[' },
        fieldValue: 'SKU001',
        formValues: {},
        latestProductValues: null,
      })
    ).toBeNull();

    expect(logClientErrorMock).toHaveBeenCalledTimes(2);
  });

  it('covers preview fallbacks for disabled, static, dynamic, and evaluation-failure patterns', () => {
    const dynamicPattern = {
      replacementEnabled: true,
      replacementValue: encodeDynamicReplacementRecipe({
        version: 1,
        sourceMode: 'current_field',
        sourceField: null,
        sourceRegex: '(\\d+)$',
        sourceFlags: null,
        sourceMatchGroup: 1,
        mathOperation: 'add',
        mathOperand: 2,
        roundMode: 'none',
        padLength: 3,
        padChar: '0',
        logicOperator: 'none',
        logicOperand: null,
        logicFlags: null,
        logicWhenTrueAction: 'keep',
        logicWhenTrueValue: null,
        logicWhenFalseAction: 'keep',
        logicWhenFalseValue: null,
        resultAssembly: 'segment_only',
        targetApply: 'replace_matched_segment',
      }),
      regex: '\\d{3}$',
      flags: null,
    } as any;

    expect(
      getPatternReplacementPreview(dynamicPattern, {
        pattern: { regex: '\\d{3}$', flags: null },
        fieldValue: 'SKU001',
        formValues: {},
        latestProductValues: null,
      })
    ).toBe('SKU003');

    expect(
      getPatternReplacementPreview(
        {
          replacementEnabled: true,
          replacementValue: 'STATIC',
          regex: '\\d+$',
          flags: null,
        } as any,
        {
          pattern: { regex: '\\d+$', flags: null },
          fieldValue: 'SKU001',
          formValues: {},
          latestProductValues: null,
        }
      )
    ).toBe('STATIC');

    expect(
      getPatternReplacementPreview(
        {
          replacementEnabled: false,
          replacementValue: 'STATIC',
          regex: '\\d+$',
          flags: null,
        } as any,
        {
          pattern: { regex: '\\d+$', flags: null },
          fieldValue: 'SKU001',
          formValues: {},
          latestProductValues: null,
        }
      )
    ).toBeNull();

    expect(
      getPatternReplacementPreview(
        {
          replacementEnabled: true,
          replacementValue: dynamicPattern.replacementValue,
          regex: '\\d+$',
          flags: '[',
        } as any,
        {
          pattern: { regex: '\\d+$', flags: '[' },
          fieldValue: 'SKU001',
          formValues: {},
          latestProductValues: null,
        }
      )
    ).toBeNull();
  });
});
