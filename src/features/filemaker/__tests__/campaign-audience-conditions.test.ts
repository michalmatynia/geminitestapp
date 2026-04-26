import { describe, expect, it } from 'vitest';

import type {
  FilemakerAudienceCondition,
  FilemakerAudienceConditionGroup,
  FilemakerEmail,
  FilemakerOrganization,
  FilemakerPerson,
} from '@/shared/contracts/filemaker';

import {
  evaluateAudienceCondition,
  evaluateAudienceConditionGroup,
} from '@/features/filemaker/settings/campaign-audience-conditions';
import {
  buildDefaultAudienceConditionGroup,
  normalizeAudienceConditionGroup,
} from '@/features/filemaker/settings/campaign-audience-normalization.helpers';
import {
  foldLegacyFieldsIntoConditionGroup,
} from '@/features/filemaker/settings/campaign-audience-legacy.helpers';
import { normalizeCampaignAudienceRule } from '@/features/filemaker/settings/campaign-factories';

const orgFixture: FilemakerOrganization = {
  id: 'org-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  name: 'Acme Corporation',
  addressId: 'addr-1',
  street: 'Main Street',
  streetNumber: '10',
  city: 'Warsaw',
  postalCode: '00-001',
  country: 'PL',
  countryId: 'country-pl',
  taxId: '1234567890',
  krs: '0000987654',
  tradingName: 'Acme Widgets',
  cooperationStatus: 'Partner',
};

const personFixture: FilemakerPerson = {
  id: 'person-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  firstName: 'Jane',
  lastName: 'Doe',
  addressId: 'addr-2',
  street: 'Elm',
  streetNumber: '22',
  city: 'Krakow',
  postalCode: '30-002',
  country: 'PL',
  countryId: 'country-pl',
  nip: '',
  regon: '',
  phoneNumbers: ['+48 600 100 200', '+48 123 456 789'],
};

const emailFixture: FilemakerEmail = {
  id: 'email-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  email: 'jane@acme.example',
  status: 'active',
};

const buildCondition = (
  overrides: Partial<FilemakerAudienceCondition>
): FilemakerAudienceCondition => ({
  id: 'c1',
  type: 'condition',
  field: 'organization.name',
  operator: 'equals',
  value: '',
  ...overrides,
});

describe('evaluateAudienceCondition — operators', () => {
  it('equals / not_equals (case-insensitive)', () => {
    expect(
      evaluateAudienceCondition(
        buildCondition({ field: 'organization.name', operator: 'equals', value: 'acme corporation' }),
        { organization: orgFixture }
      )
    ).toBe(true);
    expect(
      evaluateAudienceCondition(
        buildCondition({ field: 'organization.name', operator: 'not_equals', value: 'OtherCo' }),
        { organization: orgFixture }
      )
    ).toBe(true);
  });

  it('contains / not_contains', () => {
    expect(
      evaluateAudienceCondition(
        buildCondition({ field: 'organization.name', operator: 'contains', value: 'ACME' }),
        { organization: orgFixture }
      )
    ).toBe(true);
    expect(
      evaluateAudienceCondition(
        buildCondition({ field: 'organization.name', operator: 'not_contains', value: 'foo' }),
        { organization: orgFixture }
      )
    ).toBe(true);
  });

  it('starts_with / ends_with', () => {
    expect(
      evaluateAudienceCondition(
        buildCondition({ field: 'person.lastName', operator: 'starts_with', value: 'D' }),
        { person: personFixture }
      )
    ).toBe(true);
    expect(
      evaluateAudienceCondition(
        buildCondition({ field: 'person.lastName', operator: 'ends_with', value: 'oe' }),
        { person: personFixture }
      )
    ).toBe(true);
  });

  it('filters by organization.tradingName', () => {
    expect(
      evaluateAudienceCondition(
        buildCondition({ field: 'organization.tradingName', operator: 'contains', value: 'widgets' }),
        { organization: orgFixture }
      )
    ).toBe(true);
    expect(
      evaluateAudienceCondition(
        buildCondition({ field: 'organization.tradingName', operator: 'equals', value: 'acme corporation' }),
        { organization: orgFixture }
      )
    ).toBe(false);
    expect(
      evaluateAudienceCondition(
        buildCondition({ field: 'organization.tradingName', operator: 'is_empty', value: '' }),
        { organization: { ...orgFixture, tradingName: undefined } }
      )
    ).toBe(true);
  });

  it('filters by organization.cooperationStatus', () => {
    expect(
      evaluateAudienceCondition(
        buildCondition({
          field: 'organization.cooperationStatus',
          operator: 'equals',
          value: 'partner',
        }),
        { organization: orgFixture }
      )
    ).toBe(true);
    expect(
      evaluateAudienceCondition(
        buildCondition({
          field: 'organization.cooperationStatus',
          operator: 'is_empty',
          value: '',
        }),
        { organization: { ...orgFixture, cooperationStatus: undefined } }
      )
    ).toBe(true);
  });

  it('is_empty / is_not_empty', () => {
    expect(
      evaluateAudienceCondition(
        buildCondition({ field: 'person.nip', operator: 'is_empty', value: '' }),
        { person: personFixture }
      )
    ).toBe(true);
    expect(
      evaluateAudienceCondition(
        buildCondition({ field: 'organization.taxId', operator: 'is_not_empty', value: '' }),
        { organization: orgFixture }
      )
    ).toBe(true);
  });

  it('array semantics for phoneNumbers: any-match for positive, all-match for negative', () => {
    expect(
      evaluateAudienceCondition(
        buildCondition({ field: 'person.phoneNumbers', operator: 'contains', value: '600' }),
        { person: personFixture }
      )
    ).toBe(true);
    expect(
      evaluateAudienceCondition(
        buildCondition({ field: 'person.phoneNumbers', operator: 'not_contains', value: '999' }),
        { person: personFixture }
      )
    ).toBe(true);
    expect(
      evaluateAudienceCondition(
        buildCondition({ field: 'person.phoneNumbers', operator: 'not_contains', value: '600' }),
        { person: personFixture }
      )
    ).toBe(false);
  });

  it('matches email.address and email.status', () => {
    expect(
      evaluateAudienceCondition(
        buildCondition({ field: 'email.address', operator: 'ends_with', value: '@acme.example' }),
        { email: emailFixture }
      )
    ).toBe(true);
    expect(
      evaluateAudienceCondition(
        buildCondition({ field: 'email.status', operator: 'equals', value: 'active' }),
        { email: emailFixture }
      )
    ).toBe(true);
  });

  it('matches organization demand values, legacy UUIDs, labels, and paths', () => {
    const demandContext = {
      organization: orgFixture,
      organizationDemandLabels: ['Market stalls', 'Food vendors'],
      organizationDemandLegacyValueUuids: ['LEGACY-DEMAND-ROOT', 'LEGACY-DEMAND-CHILD'],
      organizationDemandPaths: ['value-market>value-food', 'Market > Food vendors'],
      organizationDemandValueIds: ['value-market', 'value-food'],
    };

    expect(
      evaluateAudienceCondition(
        buildCondition({
          field: 'organization.demandValueId',
          operator: 'equals',
          value: 'value-food',
        }),
        demandContext
      )
    ).toBe(true);
    expect(
      evaluateAudienceCondition(
        buildCondition({
          field: 'organization.demandLegacyValueUuid',
          operator: 'equals',
          value: 'LEGACY-DEMAND-CHILD',
        }),
        demandContext
      )
    ).toBe(true);
    expect(
      evaluateAudienceCondition(
        buildCondition({
          field: 'organization.demandLabel',
          operator: 'contains',
          value: 'vendors',
        }),
        demandContext
      )
    ).toBe(true);
    expect(
      evaluateAudienceCondition(
        buildCondition({
          field: 'organization.demandPath',
          operator: 'equals',
          value: 'value-market>value-food',
        }),
        demandContext
      )
    ).toBe(true);
    expect(
      evaluateAudienceCondition(
        buildCondition({
          field: 'organization.demandValueId',
          operator: 'not_equals',
          value: 'value-missing',
        }),
        demandContext
      )
    ).toBe(true);
  });
});

describe('evaluateAudienceConditionGroup — AND/OR nesting', () => {
  it('empty group matches everything', () => {
    const group: FilemakerAudienceConditionGroup = buildDefaultAudienceConditionGroup();
    expect(evaluateAudienceConditionGroup(group, { organization: orgFixture })).toBe(true);
  });

  it('AND requires all children; OR requires any', () => {
    const andGroup: FilemakerAudienceConditionGroup = {
      id: 'g',
      type: 'group',
      combinator: 'and',
      children: [
        buildCondition({ field: 'organization.country', operator: 'equals', value: 'PL' }),
        buildCondition({ field: 'organization.name', operator: 'contains', value: 'acme' }),
      ],
    };
    expect(evaluateAudienceConditionGroup(andGroup, { organization: orgFixture })).toBe(true);
    const andGroupFails: FilemakerAudienceConditionGroup = {
      ...andGroup,
      children: [
        ...andGroup.children,
        buildCondition({ field: 'organization.country', operator: 'equals', value: 'DE' }),
      ],
    };
    expect(evaluateAudienceConditionGroup(andGroupFails, { organization: orgFixture })).toBe(false);

    const orGroup: FilemakerAudienceConditionGroup = {
      id: 'g2',
      type: 'group',
      combinator: 'or',
      children: [
        buildCondition({ field: 'organization.country', operator: 'equals', value: 'DE' }),
        buildCondition({ field: 'organization.name', operator: 'contains', value: 'acme' }),
      ],
    };
    expect(evaluateAudienceConditionGroup(orGroup, { organization: orgFixture })).toBe(true);
  });

  it('handles deeply nested groups', () => {
    const nested: FilemakerAudienceConditionGroup = {
      id: 'root',
      type: 'group',
      combinator: 'and',
      children: [
        buildCondition({ field: 'person.country', operator: 'equals', value: 'PL' }),
        {
          id: 'subOr',
          type: 'group',
          combinator: 'or',
          children: [
            buildCondition({ field: 'person.city', operator: 'equals', value: 'Warsaw' }),
            buildCondition({ field: 'person.city', operator: 'equals', value: 'Krakow' }),
          ],
        },
      ],
    };
    expect(evaluateAudienceConditionGroup(nested, { person: personFixture })).toBe(true);
  });

  it('negates a group when NOT is enabled', () => {
    const negated: FilemakerAudienceConditionGroup = {
      id: 'not-country',
      type: 'group',
      combinator: 'and',
      not: true,
      children: [
        buildCondition({ field: 'organization.country', operator: 'equals', value: 'PL' }),
      ],
    };
    expect(evaluateAudienceConditionGroup(negated, { organization: orgFixture })).toBe(false);
    expect(
      evaluateAudienceConditionGroup(negated, {
        organization: { ...orgFixture, country: 'DE' },
      })
    ).toBe(true);
  });
});

describe('normalizeAudienceConditionGroup', () => {
  it('returns a default empty-AND group for invalid input', () => {
    const group = normalizeAudienceConditionGroup(null);
    expect(group.combinator).toBe('and');
    expect(group.children).toEqual([]);
  });

  it('drops invalid children and keeps valid ones', () => {
    const group = normalizeAudienceConditionGroup({
      id: 'g',
      type: 'group',
      combinator: 'or',
      not: true,
      children: [
        { field: 'organization.name', operator: 'equals', value: 'A' },
        { field: 'BOGUS_FIELD', operator: 'equals', value: 'X' },
        { nested: 'broken' },
      ],
    });
    expect(group.combinator).toBe('or');
    expect(group.not).toBe(true);
    expect(group.children).toHaveLength(1);
    expect((group.children[0] as FilemakerAudienceCondition).field).toBe('organization.name');
  });
});

describe('foldLegacyFieldsIntoConditionGroup — migration', () => {
  it('no-op when no legacy fields present', () => {
    const group = buildDefaultAudienceConditionGroup();
    const folded = foldLegacyFieldsIntoConditionGroup(group, {
      organizationIds: [],
      eventIds: [],
      countries: [],
      cities: [],
    });
    expect(folded).toBe(group);
  });

  it('migrates a single country into a country OR group', () => {
    const folded = foldLegacyFieldsIntoConditionGroup(buildDefaultAudienceConditionGroup(), {
      organizationIds: [],
      eventIds: [],
      countries: ['PL'],
      cities: [],
    });
    expect(folded.children).toHaveLength(1);
    expect(folded.children[0]!.type).toBe('group');
  });

  it('normalizeCampaignAudienceRule folds all legacy fields and empties them', () => {
    const rule = normalizeCampaignAudienceRule({
      partyKinds: ['person'],
      emailStatuses: ['active'],
      includePartyReferences: [],
      excludePartyReferences: [],
      organizationIds: ['org-1'],
      eventIds: ['event-1'],
      countries: ['PL'],
      cities: ['Warsaw'],
      dedupeByEmail: true,
    });
    expect(rule.organizationIds).toEqual([]);
    expect(rule.eventIds).toEqual([]);
    expect(rule.countries).toEqual([]);
    expect(rule.cities).toEqual([]);
    expect(rule.conditionGroup.children.length).toBeGreaterThan(0);
  });
});
