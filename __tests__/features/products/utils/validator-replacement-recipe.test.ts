import { describe, expect, it } from 'vitest';

import {
  encodeDynamicReplacementRecipe,
  evaluateDynamicReplacementRecipe,
  evaluateStringCondition,
  parseDynamicReplacementRecipe,
} from '@/shared/lib/products/utils/validator-replacement-recipe';

describe('validator-replacement-recipe', () => {
  it('increments SKU from latest product value for auto-sequence flow', () => {
    const recipe = parseDynamicReplacementRecipe(
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
        resultAssembly: 'source_replace_match',
        targetApply: 'replace_whole_field',
      })
    );

    expect(recipe).not.toBeNull();
    const result = evaluateDynamicReplacementRecipe(recipe!, {
      pattern: {
        regex: '^KEYCHA\\d{3}$',
        flags: null,
      },
      fieldValue: 'KEYCHA000',
      formValues: {},
      latestProductValues: { sku: 'KEYCHA001' },
    });

    expect(result).toBe('KEYCHA002');
  });

  it('returns null when requested capture group is missing', () => {
    const recipe = parseDynamicReplacementRecipe(
      encodeDynamicReplacementRecipe({
        version: 1,
        sourceMode: 'latest_product_field',
        sourceField: 'sku',
        sourceRegex: '(\\d+)$',
        sourceFlags: null,
        sourceMatchGroup: 2,
        mathOperation: 'add',
        mathOperand: 1,
        resultAssembly: 'source_replace_match',
        targetApply: 'replace_whole_field',
      })
    );

    const result = evaluateDynamicReplacementRecipe(recipe!, {
      pattern: {
        regex: '^KEYCHA\\d{3}$',
        flags: null,
      },
      fieldValue: 'KEYCHA000',
      formValues: {},
      latestProductValues: { sku: 'KEYCHA001' },
    });

    expect(result).toBeNull();
  });

  it('evaluates launch regex condition with flags', () => {
    const matches = evaluateStringCondition({
      operator: 'regex',
      value: 'keycha000',
      operand: '^KEYCHA\\d+$',
      flags: 'i',
    });
    const notMatches = evaluateStringCondition({
      operator: 'regex',
      value: 'ABC-001',
      operand: '^KEYCHA\\d+$',
      flags: 'i',
    });

    expect(matches).toBe(true);
    expect(notMatches).toBe(false);
  });
});
