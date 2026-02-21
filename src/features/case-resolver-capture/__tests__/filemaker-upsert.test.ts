import { describe, expect, it } from 'vitest';

import { upsertFilemakerCaptureCandidate } from '@/features/case-resolver-capture/filemaker-upsert';
import type { FilemakerDatabase } from '@/features/filemaker/types';
import type { PromptExploderCaseResolverPartyCandidate } from '@/features/prompt-exploder/bridge';

const createDatabase = (): FilemakerDatabase => ({
  version: 2,
  persons: [
    {
      id: 'person-1',
      firstName: 'Michał',
      lastName: 'Matynia',
      street: 'Fioletowa',
      streetNumber: '71/2',
      city: 'Szczecin',
      postalCode: '70-781',
      country: 'Poland',
      countryId: '',
      addressId: 'address-1',
      nip: '',
      regon: '',
      phoneNumbers: [],
      createdAt: '2026-02-01T00:00:00.000Z',
      updatedAt: '2026-02-01T00:00:00.000Z',
    },
  ],
  organizations: [],
  addresses: [
    {
      id: 'address-1',
      street: 'Fioletowa',
      streetNumber: '71/2',
      city: 'Szczecin',
      postalCode: '70-781',
      country: 'Poland',
      countryId: '',
      createdAt: '2026-02-01T00:00:00.000Z',
      updatedAt: '2026-02-01T00:00:00.000Z',
    },
  ],
  emails: [],
  emailLinks: [],
});

describe('upsertFilemakerCaptureCandidate', () => {
  it('reuses existing matched record when candidate resolves to existing party', () => {
    const candidate: PromptExploderCaseResolverPartyCandidate = {
      role: 'addresser',
      displayName: 'Michał Matynia',
      rawText: 'Michał Matynia\nFioletowa 71/2\n70-781 Szczecin\nPoland',
      kind: 'person',
      firstName: 'Michał',
      lastName: 'Matynia',
      street: 'Fioletowa',
      streetNumber: '71',
      houseNumber: '2',
      city: 'Szczecin',
      postalCode: '70-781',
      country: 'Poland',
    };

    const result = upsertFilemakerCaptureCandidate(createDatabase(), candidate);

    expect(result.reference).toEqual({ kind: 'person', id: 'person-1' });
    expect(result.createdParty).toBe(false);
    expect(result.createdAddress).toBe(false);
    expect(result.database.persons).toHaveLength(1);
    expect(result.database.addresses).toHaveLength(1);
  });

  it('creates new filemaker organization and address when unmatched', () => {
    const candidate: PromptExploderCaseResolverPartyCandidate = {
      role: 'addressee',
      displayName: 'Urzad Miasta',
      rawText: 'Urzad Miasta\nNowa 7\n00-001 Warszawa\nPoland',
      kind: 'organization',
      organizationName: 'Urzad Miasta',
      street: 'Nowa',
      streetNumber: '7',
      city: 'Warszawa',
      postalCode: '00-001',
      country: 'Poland',
    };

    const result = upsertFilemakerCaptureCandidate(createDatabase(), candidate);

    expect(result.reference?.kind).toBe('organization');
    expect(result.createdParty).toBe(true);
    expect(result.createdAddress).toBe(true);
    expect(result.database.organizations).toHaveLength(1);
    expect(result.database.addresses).toHaveLength(2);
  });

  it('does not create record when candidate has no usable identity data', () => {
    const candidate: PromptExploderCaseResolverPartyCandidate = {
      role: 'addressee',
      displayName: '',
      rawText: '',
    };

    const result = upsertFilemakerCaptureCandidate(createDatabase(), candidate);

    expect(result.reference).toBeNull();
    expect(result.createdParty).toBe(false);
    expect(result.database.organizations).toHaveLength(0);
    expect(result.database.persons).toHaveLength(1);
  });
});
