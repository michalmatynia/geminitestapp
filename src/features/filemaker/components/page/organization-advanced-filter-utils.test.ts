import { describe, expect, it, vi } from 'vitest';

import type { OrganizationAdvancedFilterGroup } from '../../filemaker-organization-advanced-filters';
import {
  appendConditionToOrganizationGroup,
  appendGroupToOrganizationGroup,
  buildOrganizationConditionForBooleanValueChange,
  buildOrganizationConditionForOperatorChange,
  buildOrganizationConditionForValueChange,
  buildOrganizationConditionForValueToChange,
  buildOrganizationConditionValidationMessage,
  cloneOrganizationAdvancedFilterGroup,
  duplicateRuleInOrganizationGroup,
  mapImportedOrganizationPresets,
  moveRuleInOrganizationGroup,
  parseOrganizationPresetImportPayload,
  removeRuleFromOrganizationGroup,
} from './organization-advanced-filter-utils';

describe('organization-advanced-filter-utils', () => {
  it('updates organization group rule collections for add, move, duplicate, and remove flows', () => {
    const originalCrypto = globalThis.crypto;
    const randomUUIDMock = vi
      .fn()
      .mockReturnValueOnce('added-condition')
      .mockReturnValueOnce('added-group')
      .mockReturnValueOnce('added-group-child')
      .mockReturnValueOnce('duplicate-rule')
      .mockReturnValueOnce('fallback-rule');

    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: {
        ...(globalThis.crypto ?? {}),
        randomUUID: randomUUIDMock,
      },
    });

    const group: OrganizationAdvancedFilterGroup = {
      combinator: 'and',
      id: 'group-1',
      not: false,
      rules: [
        {
          field: 'name',
          id: 'rule-1',
          operator: 'contains',
          type: 'condition',
          value: 'Acme',
        },
        {
          field: 'city',
          id: 'rule-2',
          operator: 'eq',
          type: 'condition',
          value: 'Warsaw',
        },
      ],
      type: 'group',
    };

    expect(appendConditionToOrganizationGroup({ ...group, rules: [] })).toMatchObject({
      rules: [{ field: 'name', id: 'added-condition', operator: 'contains' }],
    });
    expect(appendGroupToOrganizationGroup({ ...group, rules: [] })).toMatchObject({
      rules: [{ id: 'added-group', rules: [{ id: 'added-group-child' }] }],
    });
    expect(moveRuleInOrganizationGroup(group, 'rule-1', 1)).toMatchObject({
      rules: [{ id: 'rule-2' }, { id: 'rule-1' }],
    });
    expect(duplicateRuleInOrganizationGroup(group, 'rule-2')).toMatchObject({
      rules: [
        { id: 'rule-1' },
        { id: 'rule-2', value: 'Warsaw' },
        { id: 'duplicate-rule', value: 'Warsaw' },
      ],
    });
    expect(
      removeRuleFromOrganizationGroup({ ...group, id: 'single', rules: [group.rules[0]] }, 'rule-1')
    ).toEqual({
      combinator: 'and',
      id: 'single',
      not: false,
      rules: [
        {
          field: 'name',
          id: 'fallback-rule',
          operator: 'contains',
          type: 'condition',
        },
      ],
      type: 'group',
    });

    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: originalCrypto,
    });
  });

  it('rebuilds condition state for operator and value transitions', () => {
    expect(
      buildOrganizationConditionForOperatorChange(
        {
          field: 'city',
          id: 'rule-operator',
          operator: 'eq',
          type: 'condition',
          value: 'Warsaw',
          valueTo: 'unused',
        },
        'in'
      )
    ).toEqual({
      field: 'city',
      id: 'rule-operator',
      operator: 'in',
      type: 'condition',
      value: ['Warsaw'],
    });

    expect(
      buildOrganizationConditionForValueChange(
        {
          field: 'city',
          id: 'rule-values',
          operator: 'in',
          type: 'condition',
        },
        'string',
        'Warsaw, Krakow'
      )
    ).toMatchObject({ value: ['Warsaw', 'Krakow'] });

    expect(
      buildOrganizationConditionForBooleanValueChange(
        {
          field: 'hasAddress',
          id: 'rule-bool',
          operator: 'eq',
          type: 'condition',
        },
        'true'
      )
    ).toMatchObject({ value: true });

    expect(
      buildOrganizationConditionForValueToChange(
        {
          field: 'createdAt',
          id: 'rule-range',
          operator: 'between',
          type: 'condition',
          value: '2026-01-01',
        },
        'date',
        '2026-12-31'
      )
    ).toMatchObject({ valueTo: '2026-12-31' });
  });

  it('validates empty, scalar, and range organization conditions', () => {
    expect(
      buildOrganizationConditionValidationMessage({
        field: 'city',
        id: 'rule-empty-list',
        operator: 'in',
        type: 'condition',
        value: [],
      })
    ).toBe('At least one value is required.');
    expect(
      buildOrganizationConditionValidationMessage({
        field: 'hasBank',
        id: 'rule-bool',
        operator: 'eq',
        type: 'condition',
        value: 'true',
      })
    ).toBe('Value must be true or false.');
    expect(
      buildOrganizationConditionValidationMessage({
        field: 'createdAt',
        id: 'rule-between',
        operator: 'between',
        type: 'condition',
        value: '2026-01-01',
      })
    ).toBe('Second value is required.');
  });

  it('parses preset bundles and renames imported duplicate preset names', () => {
    const originalCrypto = globalThis.crypto;
    const randomUUIDMock = vi.fn().mockReturnValueOnce('imported-preset-id');
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: {
        ...(globalThis.crypto ?? {}),
        randomUUID: randomUUIDMock,
      },
    });

    const filter: OrganizationAdvancedFilterGroup = {
      combinator: 'and',
      id: 'group-1',
      not: false,
      rules: [
        {
          field: 'city',
          id: 'rule-1',
          operator: 'eq',
          type: 'condition',
          value: 'Warsaw',
        },
      ],
      type: 'group',
    };
    const imported = parseOrganizationPresetImportPayload({
      exportedAt: '2026-04-28T00:00:00.000Z',
      presets: [
        {
          createdAt: '2026-04-28T00:00:00.000Z',
          filter,
          id: 'source-preset',
          name: 'Warsaw',
          updatedAt: '2026-04-28T00:00:00.000Z',
        },
      ],
      version: 1,
    });

    expect(imported).toHaveLength(1);
    expect(
      (() => {
        const mapped = mapImportedOrganizationPresets(
          [
            {
              createdAt: '2026-04-28T00:00:00.000Z',
              filter,
              id: 'existing-preset',
              name: 'Warsaw',
              updatedAt: '2026-04-28T00:00:00.000Z',
            },
          ],
          imported ?? []
        );
        expect(mapped[0]?.filter).toEqual(filter);
        expect(mapped[0]?.filter).not.toBe(filter);
        return mapped;
      })()
    ).toMatchObject([{ id: 'imported-preset-id', name: 'Warsaw (copy 1)' }]);

    expect(cloneOrganizationAdvancedFilterGroup(filter)).toEqual(filter);
    expect(cloneOrganizationAdvancedFilterGroup(filter)).not.toBe(filter);

    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: originalCrypto,
    });
  });
});
