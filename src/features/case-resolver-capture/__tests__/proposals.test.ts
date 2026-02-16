import { describe, expect, it } from 'vitest';

import {
  buildCaseResolverCaptureProposalState,
  stripCapturedAddressLinesFromText,
} from '@/features/case-resolver-capture/proposals';
import {
  DEFAULT_CASE_RESOLVER_CAPTURE_SETTINGS,
  type CaseResolverCaptureSettings,
} from '@/features/case-resolver-capture/settings';
import type { FilemakerDatabase } from '@/features/filemaker/types';
import type {
  PromptExploderCaseResolverPartyBundle,
  PromptExploderCaseResolverPartyCandidate,
} from '@/features/prompt-exploder/bridge';

const createDatabase = (): FilemakerDatabase => ({
  version: 2,
  persons: [
    {
      id: 'p-1',
      firstName: 'Michał',
      lastName: 'Matynia',
      street: 'Fioletowa',
      streetNumber: '71/2',
      city: 'Szczecin',
      postalCode: '70-781',
      country: 'Poland',
      countryId: 'country-pl',
      addressId: 'addr-1',
      nip: '',
      regon: '',
      phoneNumbers: [],
      createdAt: '2026-02-16T00:00:00.000Z',
      updatedAt: '2026-02-16T00:00:00.000Z',
    },
  ],
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
      addressId: 'addr-2',
      createdAt: '2026-02-16T00:00:00.000Z',
      updatedAt: '2026-02-16T00:00:00.000Z',
    },
  ],
  addresses: [
    {
      id: 'addr-1',
      street: 'Fioletowa',
      streetNumber: '71/2',
      city: 'Szczecin',
      postalCode: '70-781',
      country: 'Poland',
      countryId: 'country-pl',
      createdAt: '2026-02-16T00:00:00.000Z',
      updatedAt: '2026-02-16T00:00:00.000Z',
    },
    {
      id: 'addr-2',
      street: 'Dąbskiego',
      streetNumber: '5',
      city: 'Gryfice',
      postalCode: '72-300',
      country: 'Poland',
      countryId: 'country-pl',
      createdAt: '2026-02-16T00:00:00.000Z',
      updatedAt: '2026-02-16T00:00:00.000Z',
    },
  ],
});

const createAddresserCandidate = (): PromptExploderCaseResolverPartyCandidate => ({
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
});

const createSettings = (): CaseResolverCaptureSettings => ({
  ...DEFAULT_CASE_RESOLVER_CAPTURE_SETTINGS,
  roleMappings: {
    addresser: { ...DEFAULT_CASE_RESOLVER_CAPTURE_SETTINGS.roleMappings.addresser },
    addressee: { ...DEFAULT_CASE_RESOLVER_CAPTURE_SETTINGS.roleMappings.addressee },
  },
});

describe('case-resolver-capture proposals', () => {
  it('maps captured addresser to filemaker person + address by default', () => {
    const payload: PromptExploderCaseResolverPartyBundle = {
      addresser: createAddresserCandidate(),
    };

    const state = buildCaseResolverCaptureProposalState(
      payload,
      'file-1',
      createDatabase(),
      createSettings()
    );

    expect(state?.addresser?.sourceRole).toBe('addresser');
    expect(state?.addresser?.action).toBe('database');
    expect(state?.addresser?.existingReference).toEqual({ kind: 'person', id: 'p-1' });
    expect(state?.addresser?.existingAddressId).toBe('addr-1');
    expect(state?.addressee).toBeNull();
  });

  it('supports role remapping and default action override', () => {
    const payload: PromptExploderCaseResolverPartyBundle = {
      addresser: createAddresserCandidate(),
    };

    const settings = createSettings();
    settings.roleMappings.addresser.targetRole = 'addressee';
    settings.roleMappings.addresser.defaultAction = 'text';
    settings.roleMappings.addresser.autoMatchPartyReference = false;
    settings.roleMappings.addresser.autoMatchAddress = false;

    const state = buildCaseResolverCaptureProposalState(
      payload,
      'file-1',
      createDatabase(),
      settings
    );

    expect(state?.addresser).toBeNull();
    expect(state?.addressee?.sourceRole).toBe('addresser');
    expect(state?.addressee?.role).toBe('addressee');
    expect(state?.addressee?.action).toBe('text');
    expect(state?.addressee?.existingReference).toBeNull();
    expect(state?.addressee?.existingAddressId).toBeNull();
  });

  it('returns null when capture pipeline is disabled', () => {
    const payload: PromptExploderCaseResolverPartyBundle = {
      addresser: createAddresserCandidate(),
    };

    const settings = createSettings();
    settings.enabled = false;

    expect(
      buildCaseResolverCaptureProposalState(
        payload,
        'file-1',
        createDatabase(),
        settings
      )
    ).toBeNull();
  });

  it('removes captured address lines from exploded text for mapped parties', () => {
    const payload: PromptExploderCaseResolverPartyBundle = {
      addresser: createAddresserCandidate(),
    };
    const state = buildCaseResolverCaptureProposalState(
      payload,
      'file-1',
      createDatabase(),
      createSettings()
    );
    const sourceText = [
      'Michał Matynia',
      'Fioletowa 71/2',
      '70-781 Szczecin',
      'Poland',
      '',
      'Wniosek o ponowne rozpatrzenie sprawy',
    ].join('\n');

    expect(stripCapturedAddressLinesFromText(sourceText, state)).toBe([
      'Michał Matynia',
      '',
      'Wniosek o ponowne rozpatrzenie sprawy',
    ].join('\n'));
  });

  it('keeps exploded text unchanged when role action is ignore', () => {
    const payload: PromptExploderCaseResolverPartyBundle = {
      addresser: createAddresserCandidate(),
    };
    const settings = createSettings();
    settings.roleMappings.addresser.defaultAction = 'ignore';
    const state = buildCaseResolverCaptureProposalState(
      payload,
      'file-1',
      createDatabase(),
      settings
    );
    const sourceText = [
      'Michał Matynia',
      'Fioletowa 71/2',
      '70-781 Szczecin',
      'Poland',
      '',
      'Wniosek o ponowne rozpatrzenie sprawy',
    ].join('\n');

    expect(stripCapturedAddressLinesFromText(sourceText, state)).toBe(sourceText);
  });
});
