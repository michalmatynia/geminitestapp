import { describe, expect, it } from 'vitest';

import type { PromptExploderCaseResolverPartyCandidate } from '@/shared/contracts/prompt-exploder';
import type { CountryOption } from '@/shared/contracts/internationalization';

import {
  composeCandidateStreetNumber,
  findExistingFilemakerAddressId,
  findExistingFilemakerPartyReference,
  normalizeCaseResolverComparable,
  resolveCountryFromCandidateValue,
} from '../party-matching';

import type { FilemakerDatabase } from '@/features/filemaker/types';

const NOW = '2026-02-16T00:00:00.000Z';

const createDatabase = (): FilemakerDatabase => ({
  version: 2,
  persons: [
    {
      id: 'person-1',
      firstName: 'Michał',
      lastName: 'Matynia',
      street: 'ul. Fioletowa',
      streetNumber: '71/2',
      city: 'Szczecin',
      postalCode: '70-781',
      country: 'Poland',
      countryId: 'country-pl',
      addressId: 'address-1',
      nip: '',
      regon: '',
      phoneNumbers: [],
      createdAt: NOW,
      updatedAt: NOW,
    },
  ],
  events: [],
  organizations: [
    {
      id: 'org-1',
      name: 'Inspektorat ZUS w Gryficach',
      street: 'Dąbskiego',
      streetNumber: '5',
      city: 'Gryfice',
      postalCode: '72-300',
      country: 'Poland',
      countryId: 'country-pl',
      addressId: 'address-2',
      createdAt: NOW,
      updatedAt: NOW,
    },
  ],
  addresses: [
    {
      id: 'address-1',
      street: 'Fioletowa',
      streetNumber: '71/2',
      city: 'Szczecin',
      postalCode: '70-781',
      country: 'Poland',
      countryId: 'country-pl',
      createdAt: NOW,
      updatedAt: NOW,
    },
    {
      id: 'address-2',
      street: 'Dąbskiego',
      streetNumber: '5',
      city: 'Gryfice',
      postalCode: '72-300',
      country: 'Poland',
      countryId: 'country-pl',
      createdAt: NOW,
      updatedAt: NOW,
    },
  ],
  addressLinks: [
    {
      id: 'address-link-person-1',
      ownerKind: 'person',
      ownerId: 'person-1',
      addressId: 'address-1',
      isDefault: true,
      createdAt: NOW,
      updatedAt: NOW,
    },
    {
      id: 'address-link-org-1',
      ownerKind: 'organization',
      ownerId: 'org-1',
      addressId: 'address-2',
      isDefault: true,
      createdAt: NOW,
      updatedAt: NOW,
    },
  ],
  phoneNumbers: [],
  phoneNumberLinks: [],
  emails: [],
  emailLinks: [],
  eventOrganizationLinks: [],
});
const createCandidate = (
  patch: Partial<PromptExploderCaseResolverPartyCandidate>
): PromptExploderCaseResolverPartyCandidate => ({
  id: 'c-1',
  name: 'Candidate',
  score: 100,
  role: 'addresser',
  displayName: '',
  rawText: '',
  ...patch,
});

describe('case resolver party matching', () => {
  it('matches person references with normalized diacritics and address formatting', () => {
    const database = createDatabase();
    const candidate = createCandidate({
      role: 'addresser',
      kind: 'person',
      displayName: 'Michal Matynia',
      firstName: 'Michal',
      lastName: 'Matynia',
      street: 'Fioletowa',
      streetNumber: '71',
      houseNumber: '2',
      city: 'Szczecin',
      postalCode: '70 781',
      country: 'Polska',
    });

    expect(findExistingFilemakerPartyReference(database, candidate)).toEqual({
      kind: 'person',
      id: 'person-1',
      displayName: 'Michał Matynia',
    });
  });

  it('matches organization references with normalized organization names', () => {
    const database = createDatabase();
    const candidate = createCandidate({
      role: 'addressee',
      kind: 'organization',
      displayName: 'INSPEKTORAT ZUS W GRYFICACH',
      organizationName: 'Inspektorat ZUS w Gryficach',
      street: 'Dabskiego',
      streetNumber: '5',
      city: 'Gryfice',
      postalCode: '72-300',
      country: 'Poland',
    });

    expect(findExistingFilemakerPartyReference(database, candidate)).toEqual({
      kind: 'organization',
      id: 'org-1',
      displayName: 'Inspektorat ZUS w Gryficach',
    });
  });

  it('does not match when explicit candidate address conflicts with database values', () => {
    const database = createDatabase();
    const candidate = createCandidate({
      role: 'addressee',
      kind: 'organization',
      organizationName: 'Inspektorat ZUS w Gryficach',
      city: 'Szczecin',
      postalCode: '00-001',
    });

    expect(findExistingFilemakerPartyReference(database, candidate)).toBeNull();
  });

  it('reuses matching address records for normalized candidate addresses', () => {
    const database = createDatabase();
    expect(
      findExistingFilemakerAddressId(database, {
        street: 'ul. Fioletowa',
        streetNumber: '71/2',
        city: 'Szczecin',
        postalCode: '70781',
        country: 'Polska',
        countryId: '',
      })
    ).toBe('address-1');
  });

  it('resolves country ids from aliases and country code', () => {
    const countries: CountryOption[] = [
      {
        id: 'country-pl',
        name: 'Poland',
        code: 'PL',
        isActive: true,
        currencies: [],
        createdAt: NOW,
        updatedAt: NOW,
      },
    ];

    expect(resolveCountryFromCandidateValue('Polska', countries)).toEqual({
      country: 'Poland',
      countryId: 'country-pl',
    });
    expect(resolveCountryFromCandidateValue('PL', countries)).toEqual({
      country: 'Poland',
      countryId: 'country-pl',
    });
  });

  it('keeps helper utilities deterministic', () => {
    expect(normalizeCaseResolverComparable('Michał  Matynia')).toBe('michal matynia');
    expect(
      composeCandidateStreetNumber(
        createCandidate({
          streetNumber: '71',
          houseNumber: '2',
        })
      )
    ).toBe('71/2');
  });
});
