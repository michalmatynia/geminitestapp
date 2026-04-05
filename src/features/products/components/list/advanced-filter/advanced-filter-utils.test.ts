import { describe, expect, it, vi } from 'vitest';

import {
  appendConditionToGroup,
  appendGroupToGroup,
  buildConditionForBooleanValueChange,
  buildConditionForFieldChange,
  buildConditionForOperatorChange,
  buildConditionForValueChange,
  buildConditionForValueToChange,
  buildConditionValidationMessage,
  duplicateRuleInGroup,
  duplicateRuleWithNewIds,
  moveRuleInGroup,
  removeRuleFromGroup,
  replaceRuleInGroup,
  stripConditionValueTo,
  stripConditionValues,
} from './advanced-filter-utils';

describe('advanced-filter-utils', () => {
  it('removes value fields when stripping a condition', () => {
    expect(
      stripConditionValues({
        type: 'condition',
        id: 'rule-1',
        field: 'price',
        operator: 'between',
        value: 10,
        valueTo: 20,
      })
    ).toEqual({
      type: 'condition',
      id: 'rule-1',
      field: 'price',
      operator: 'between',
    });

    expect(
      stripConditionValueTo({
        type: 'condition',
        id: 'rule-2',
        field: 'price',
        operator: 'between',
        value: 10,
        valueTo: 20,
      })
    ).toEqual({
      type: 'condition',
      id: 'rule-2',
      field: 'price',
      operator: 'between',
      value: 10,
    });
  });

  it('duplicates nested rules with fresh ids', () => {
    const originalCrypto = globalThis.crypto;
    const randomUUIDMock = vi
      .fn()
      .mockReturnValueOnce('copy-group')
      .mockReturnValueOnce('copy-child-1')
      .mockReturnValueOnce('copy-child-2');

    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: {
        ...(globalThis.crypto ?? {}),
        randomUUID: randomUUIDMock,
      },
    });

    const duplicated = duplicateRuleWithNewIds({
      type: 'group',
      id: 'group-1',
      combinator: 'and',
      not: false,
      rules: [
        {
          type: 'condition',
          id: 'child-1',
          field: 'sku',
          operator: 'eq',
          value: 'SKU-1',
        },
        {
          type: 'condition',
          id: 'child-2',
          field: 'price',
          operator: 'gt',
          value: 10,
        },
      ],
    });

    expect(duplicated).toEqual({
      type: 'group',
      id: 'copy-group',
      combinator: 'and',
      not: false,
      rules: [
        {
          type: 'condition',
          id: 'copy-child-1',
          field: 'sku',
          operator: 'eq',
          value: 'SKU-1',
        },
        {
          type: 'condition',
          id: 'copy-child-2',
          field: 'price',
          operator: 'gt',
          value: 10,
        },
      ],
    });

    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: originalCrypto,
    });
  });

  it('updates group rule collections for replace, remove, move, and duplicate flows', () => {
    const originalCrypto = globalThis.crypto;
    const randomUUIDMock = vi
      .fn()
      .mockReturnValueOnce('duplicate-rule')
      .mockReturnValueOnce('fallback-rule');

    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: {
        ...(globalThis.crypto ?? {}),
        randomUUID: randomUUIDMock,
      },
    });

    const group = {
      type: 'group',
      id: 'group-1',
      combinator: 'and',
      not: false,
      rules: [
        {
          type: 'condition',
          id: 'rule-1',
          field: 'name',
          operator: 'contains',
          value: 'shoe',
        },
        {
          type: 'condition',
          id: 'rule-2',
          field: 'sku',
          operator: 'eq',
          value: 'SKU-1',
        },
      ],
    } as const;

    expect(
      replaceRuleInGroup(group, 'rule-2', {
        type: 'condition',
        id: 'rule-2',
        field: 'sku',
        operator: 'eq',
        value: 'SKU-2',
      })
    ).toMatchObject({
      rules: [
        { id: 'rule-1', value: 'shoe' },
        { id: 'rule-2', value: 'SKU-2' },
      ],
    });

    expect(moveRuleInGroup(group, 'rule-1', 1)).toMatchObject({
      rules: [{ id: 'rule-2' }, { id: 'rule-1' }],
    });
    expect(moveRuleInGroup(group, 'missing', 1)).toBeNull();

    expect(duplicateRuleInGroup(group, 'rule-2')).toMatchObject({
      rules: [
        { id: 'rule-1' },
        { id: 'rule-2', value: 'SKU-1' },
        { id: 'duplicate-rule', value: 'SKU-1' },
      ],
    });

    expect(
      removeRuleFromGroup(
        {
          type: 'group',
          id: 'group-single',
          combinator: 'and',
          not: false,
          rules: [group.rules[0]],
        },
        'rule-1'
      )
    ).toEqual({
      type: 'group',
      id: 'group-single',
      combinator: 'and',
      not: false,
      rules: [
        {
          type: 'condition',
          id: 'fallback-rule',
          field: 'name',
          operator: 'contains',
        },
      ],
    });

    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: originalCrypto,
    });
  });

  it('appends new condition and group rules with fresh ids', () => {
    const originalCrypto = globalThis.crypto;
    const randomUUIDMock = vi
      .fn()
      .mockReturnValueOnce('added-condition')
      .mockReturnValueOnce('added-group')
      .mockReturnValueOnce('added-group-child');

    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: {
        ...(globalThis.crypto ?? {}),
        randomUUID: randomUUIDMock,
      },
    });

    const group = {
      type: 'group',
      id: 'group-1',
      combinator: 'and',
      not: false,
      rules: [],
    } as const;

    expect(appendConditionToGroup(group)).toEqual({
      type: 'group',
      id: 'group-1',
      combinator: 'and',
      not: false,
      rules: [
        {
          type: 'condition',
          id: 'added-condition',
          field: 'name',
          operator: 'contains',
        },
      ],
    });

    expect(appendGroupToGroup(group)).toEqual({
      type: 'group',
      id: 'group-1',
      combinator: 'and',
      not: false,
      rules: [
        {
          type: 'group',
          id: 'added-group',
          combinator: 'and',
          not: false,
          rules: [
            {
              type: 'condition',
              id: 'added-group-child',
              field: 'name',
              operator: 'contains',
            },
          ],
        },
      ],
    });

    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: originalCrypto,
    });
  });

  it('validates multi-value, scalar, and range conditions by field kind', () => {
    expect(
      buildConditionValidationMessage({
        type: 'condition',
        id: 'rule-empty',
        field: 'sku',
        operator: 'in',
        value: [],
      })
    ).toBe('At least one value is required.');

    expect(
      buildConditionValidationMessage({
        type: 'condition',
        id: 'rule-number',
        field: 'price',
        operator: 'eq',
        value: 'ten',
      } as never)
    ).toBe('Value must be a number.');

    expect(
      buildConditionValidationMessage({
        type: 'condition',
        id: 'rule-between',
        field: 'price',
        operator: 'between',
        value: 10,
      })
    ).toBe('Second value is required.');

    expect(
      buildConditionValidationMessage({
        type: 'condition',
        id: 'rule-valid',
        field: 'published',
        operator: 'eq',
        value: true,
      })
    ).toBeNull();
  });

  it('rebuilds condition state for field and operator transitions', () => {
    expect(
      buildConditionForFieldChange(
        {
          type: 'condition',
          id: 'rule-field',
          field: 'published',
          operator: 'eq',
          value: true,
        },
        'price'
      )
    ).toEqual({
      type: 'condition',
      id: 'rule-field',
      field: 'price',
      operator: 'eq',
    });

    expect(
      buildConditionForOperatorChange({
        type: 'condition',
        id: 'rule-operator',
        field: 'sku',
        operator: 'eq',
        value: 'SKU-1',
        valueTo: 'unused',
      }, 'in')
    ).toEqual({
      type: 'condition',
      id: 'rule-operator',
      field: 'sku',
      operator: 'in',
      value: ['SKU-1'],
    });

    expect(
      buildConditionForOperatorChange({
        type: 'condition',
        id: 'rule-between',
        field: 'price',
        operator: 'between',
        value: [10, 20],
        valueTo: 50,
      } as never, 'eq')
    ).toEqual({
      type: 'condition',
      id: 'rule-between',
      field: 'price',
      operator: 'eq',
      value: 10,
    });
  });

  it('rebuilds condition values for text, boolean, and range inputs', () => {
    expect(
      buildConditionForValueChange(
        {
          type: 'condition',
          id: 'rule-values',
          field: 'price',
          operator: 'in',
        },
        'number',
        '10, 20'
      )
    ).toEqual({
      type: 'condition',
      id: 'rule-values',
      field: 'price',
      operator: 'in',
      value: [10, 20],
    });

    expect(
      buildConditionForBooleanValueChange(
        {
          type: 'condition',
          id: 'rule-bool',
          field: 'published',
          operator: 'eq',
        },
        'true'
      )
    ).toEqual({
      type: 'condition',
      id: 'rule-bool',
      field: 'published',
      operator: 'eq',
      value: true,
    });

    expect(
      buildConditionForValueToChange(
        {
          type: 'condition',
          id: 'rule-range',
          field: 'price',
          operator: 'between',
          value: 10,
        },
        'number',
        '25'
      )
    ).toEqual({
      type: 'condition',
      id: 'rule-range',
      field: 'price',
      operator: 'between',
      value: 10,
      valueTo: 25,
    });
  });
});
