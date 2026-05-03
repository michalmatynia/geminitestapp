import { describe, expect, it, vi } from 'vitest';

import type { OrganizationAdvancedFilterGroup } from '../filemaker-organization-advanced-filters';

vi.mock('server-only', () => ({}));

import { buildOrganizationAdvancedFilter } from './filemaker-organization-advanced-filter-query';

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const hasFieldValueFilter = (field: string) => ({
  [field]: { $exists: true, $nin: ['', null] },
});

const hasNoFieldValueFilter = (field: string) => ({
  $or: [{ [field]: { $exists: false } }, { [field]: '' }, { [field]: null }],
});

const buildFilter = (group: OrganizationAdvancedFilterGroup | string) =>
  buildOrganizationAdvancedFilter({
    advancedFilter: typeof group === 'string' ? group : JSON.stringify(group),
    escapeRegex,
    hasFieldValueFilter,
    hasNoFieldValueFilter,
  });

describe('buildOrganizationAdvancedFilter', () => {
  it('builds nested string, set, and boolean organization filters', () => {
    const filter = buildFilter({
      combinator: 'and',
      id: 'group-1',
      not: false,
      rules: [
        {
          field: 'name',
          id: 'rule-name',
          operator: 'contains',
          type: 'condition',
          value: 'Acme',
        },
        {
          field: 'city',
          id: 'rule-city',
          operator: 'in',
          type: 'condition',
          value: ['Warsaw', 'Krakow'],
        },
        {
          field: 'hasAddress',
          id: 'rule-address',
          operator: 'eq',
          type: 'condition',
          value: true,
        },
      ],
      type: 'group',
    });

    expect(filter).toEqual({
      $and: [
        { name: /Acme/i },
        { city: { $in: [/^Warsaw$/i, /^Krakow$/i] } },
        {
          $or: [
            { legacyDefaultAddressUuid: { $exists: true, $nin: ['', null] } },
            { addressId: { $exists: true, $nin: ['', null] } },
          ],
        },
      ],
    });
  });

  it('builds negated nested groups and empty-field conditions', () => {
    const filter = buildFilter({
      combinator: 'or',
      id: 'group-1',
      not: true,
      rules: [
        {
          field: 'taxId',
          id: 'rule-tax',
          operator: 'isEmpty',
          type: 'condition',
        },
        {
          combinator: 'and',
          id: 'nested',
          not: false,
          rules: [
            {
              field: 'hasBank',
              id: 'rule-bank',
              operator: 'neq',
              type: 'condition',
              value: true,
            },
          ],
          type: 'group',
        },
      ],
      type: 'group',
    });

    expect(filter).toEqual({
      $nor: [
        {
          $or: [
            {
              $or: [
                { taxId: { $exists: false } },
                { taxId: '' },
                { taxId: null },
              ],
            },
            {
              $and: [
                {
                  $or: [
                    { legacyDefaultBankAccountUuid: { $exists: false } },
                    { legacyDefaultBankAccountUuid: '' },
                    { legacyDefaultBankAccountUuid: null },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });
  });

  it('returns an empty filter for empty or invalid payloads', () => {
    expect(buildFilter('')).toEqual({});
    expect(buildFilter('{bad-json')).toEqual({});
    expect(
      buildFilter(
        JSON.stringify({
          combinator: 'and',
          id: 'group-1',
          not: false,
          rules: [],
          type: 'group',
        })
      )
    ).toEqual({});
  });
});
