import { describe, expect, it } from 'vitest';

import type {
  FilemakerAudienceCondition,
  FilemakerAudienceConditionGroup,
  FilemakerEmail,
  FilemakerOrganization,
  FilemakerPerson,
} from '@/shared/contracts/filemaker';

import {
  buildDefaultAudienceConditionGroup,
  evaluateAudienceCondition,
  evaluateAudienceConditionGroup,
  foldLegacyFieldsIntoConditionGroup,
  normalizeAudienceConditionGroup,
} from '@/features/filemaker/settings/campaign-audience-conditions';
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
      children: [
        { field: 'organization.name', operator: 'equals', value: 'A' },
        { field: 'BOGUS_FIELD', operator: 'equals', value: 'X' },
        { nested: 'broken' },
      ],
    });
    expect(group.combinator).toBe('or');
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
