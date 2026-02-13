import { describe, expect, it } from 'vitest';

import {
  createLogicalCondition,
  LOGICAL_OPERATOR_OPTIONS,
  LOGICAL_COMPARATOR_OPTIONS,
  LOGICAL_JOIN_OPTIONS,
  isLogicalComparator,
  isLogicalJoin,
  normalizeLogicalOperatorText,
  normalizeLogicalComparatorText,
  parseLogicalValueText,
  formatLogicalValueText,
  parseSubsectionConditionText,
  buildSubsectionConditionText,
} from '@/features/prompt-exploder/helpers/logical-conditions';

describe('createLogicalCondition', () => {
  it('creates default condition with no args', () => {
    const condition = createLogicalCondition();
    expect(condition.id).toBeTruthy();
    expect(condition.paramPath).toBe('');
    expect(condition.comparator).toBe('truthy');
    expect(condition.value).toBeNull();
    expect(condition.joinWithPrevious).toBeNull();
  });

  it('uses provided values', () => {
    const condition = createLogicalCondition({
      id: 'test-id',
      paramPath: '  foo.bar  ',
      comparator: 'equals',
      value: 42,
      joinWithPrevious: 'and',
    });
    expect(condition.id).toBe('test-id');
    expect(condition.paramPath).toBe('foo.bar');
    expect(condition.comparator).toBe('equals');
    expect(condition.value).toBe(42);
    expect(condition.joinWithPrevious).toBe('and');
  });
});

describe('option constants', () => {
  it('LOGICAL_OPERATOR_OPTIONS has 5 entries', () => {
    expect(LOGICAL_OPERATOR_OPTIONS).toHaveLength(5);
    expect(LOGICAL_OPERATOR_OPTIONS[0]!.value).toBe('none');
  });

  it('LOGICAL_COMPARATOR_OPTIONS has 9 entries', () => {
    expect(LOGICAL_COMPARATOR_OPTIONS).toHaveLength(9);
  });

  it('LOGICAL_JOIN_OPTIONS has 2 entries', () => {
    expect(LOGICAL_JOIN_OPTIONS).toHaveLength(2);
  });
});

describe('isLogicalComparator', () => {
  it('returns true for valid comparators', () => {
    expect(isLogicalComparator('truthy')).toBe(true);
    expect(isLogicalComparator('equals')).toBe(true);
    expect(isLogicalComparator('contains')).toBe(true);
  });

  it('returns false for invalid values', () => {
    expect(isLogicalComparator('invalid')).toBe(false);
    expect(isLogicalComparator('')).toBe(false);
  });
});

describe('isLogicalJoin', () => {
  it('returns true for and/or', () => {
    expect(isLogicalJoin('and')).toBe(true);
    expect(isLogicalJoin('or')).toBe(true);
  });

  it('returns false for other values', () => {
    expect(isLogicalJoin('xor')).toBe(false);
  });
});

describe('normalizeLogicalOperatorText', () => {
  it('normalizes operator strings', () => {
    expect(normalizeLogicalOperatorText('if')).toBe('if');
    expect(normalizeLogicalOperatorText('only if')).toBe('only_if');
    expect(normalizeLogicalOperatorText('unless')).toBe('unless');
    expect(normalizeLogicalOperatorText('when')).toBe('when');
  });

  it('is case-insensitive', () => {
    expect(normalizeLogicalOperatorText('IF')).toBe('if');
    expect(normalizeLogicalOperatorText('Only If')).toBe('only_if');
  });

  it('returns null for invalid operators', () => {
    expect(normalizeLogicalOperatorText('while')).toBeNull();
    expect(normalizeLogicalOperatorText('')).toBeNull();
  });
});

describe('normalizeLogicalComparatorText', () => {
  it('normalizes comparator strings', () => {
    expect(normalizeLogicalComparatorText('=')).toBe('equals');
    expect(normalizeLogicalComparatorText('==')).toBe('equals');
    expect(normalizeLogicalComparatorText('!=')).toBe('not_equals');
    expect(normalizeLogicalComparatorText('>')).toBe('gt');
    expect(normalizeLogicalComparatorText('>=')).toBe('gte');
    expect(normalizeLogicalComparatorText('<')).toBe('lt');
    expect(normalizeLogicalComparatorText('<=')).toBe('lte');
    expect(normalizeLogicalComparatorText('contains')).toBe('contains');
  });

  it('returns null for null/undefined/empty', () => {
    expect(normalizeLogicalComparatorText(null)).toBeNull();
    expect(normalizeLogicalComparatorText(undefined)).toBeNull();
    expect(normalizeLogicalComparatorText('')).toBeNull();
  });
});

describe('parseLogicalValueText', () => {
  it('parses booleans', () => {
    expect(parseLogicalValueText('true')).toBe(true);
    expect(parseLogicalValueText('false')).toBe(false);
    expect(parseLogicalValueText('TRUE')).toBe(true);
  });

  it('parses null', () => {
    expect(parseLogicalValueText('null')).toBeNull();
  });

  it('parses numbers', () => {
    expect(parseLogicalValueText('42')).toBe(42);
    expect(parseLogicalValueText('-3.14')).toBe(-3.14);
  });

  it('strips quotes from strings', () => {
    expect(parseLogicalValueText('"hello"')).toBe('hello');
    expect(parseLogicalValueText('\'world\'')).toBe('world');
  });

  it('returns plain text as-is', () => {
    expect(parseLogicalValueText('some text')).toBe('some text');
  });

  it('returns null for empty/null/undefined', () => {
    expect(parseLogicalValueText('')).toBeNull();
    expect(parseLogicalValueText(null)).toBeNull();
    expect(parseLogicalValueText(undefined)).toBeNull();
  });
});

describe('formatLogicalValueText', () => {
  it('formats strings', () => {
    expect(formatLogicalValueText('hello')).toBe('hello');
  });

  it('formats numbers and booleans', () => {
    expect(formatLogicalValueText(42)).toBe('42');
    expect(formatLogicalValueText(true)).toBe('true');
  });

  it('formats null/undefined as "null"', () => {
    expect(formatLogicalValueText(null)).toBe('null');
    expect(formatLogicalValueText(undefined)).toBe('null');
  });
});

describe('parseSubsectionConditionText', () => {
  it('parses simple truthy condition', () => {
    const result = parseSubsectionConditionText('If enabled:');
    expect(result).toEqual({
      operator: 'if',
      paramPath: 'enabled',
      comparator: 'truthy',
      value: null,
    });
  });

  it('parses equals condition', () => {
    const result = parseSubsectionConditionText('When mode=advanced:');
    expect(result).toEqual({
      operator: 'when',
      paramPath: 'mode',
      comparator: 'equals',
      value: 'advanced',
    });
  });

  it('parses unless as falsy', () => {
    const result = parseSubsectionConditionText('Unless disabled:');
    expect(result).toEqual({
      operator: 'unless',
      paramPath: 'disabled',
      comparator: 'falsy',
      value: null,
    });
  });

  it('strips params. prefix', () => {
    const result = parseSubsectionConditionText('If params.enabled:');
    expect(result?.paramPath).toBe('enabled');
  });

  it('returns null for invalid conditions', () => {
    expect(parseSubsectionConditionText('')).toBeNull();
    expect(parseSubsectionConditionText(null)).toBeNull();
    expect(parseSubsectionConditionText('random text')).toBeNull();
  });
});

describe('buildSubsectionConditionText', () => {
  it('builds truthy condition', () => {
    expect(
      buildSubsectionConditionText({
        operator: 'if',
        paramPath: 'enabled',
        comparator: 'truthy',
        value: null,
      })
    ).toBe('If enabled:');
  });

  it('builds equals condition', () => {
    expect(
      buildSubsectionConditionText({
        operator: 'when',
        paramPath: 'mode',
        comparator: 'equals',
        value: 'advanced',
      })
    ).toBe('When mode=advanced:');
  });

  it('builds only_if condition', () => {
    expect(
      buildSubsectionConditionText({
        operator: 'only_if',
        paramPath: 'flag',
        comparator: 'truthy',
        value: null,
      })
    ).toBe('Only if flag:');
  });

  it('returns null for missing operator or path', () => {
    expect(
      buildSubsectionConditionText({
        operator: null,
        paramPath: 'test',
        comparator: 'truthy',
        value: null,
      })
    ).toBeNull();
    expect(
      buildSubsectionConditionText({
        operator: 'if',
        paramPath: '',
        comparator: 'truthy',
        value: null,
      })
    ).toBeNull();
  });
});
