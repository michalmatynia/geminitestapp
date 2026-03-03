import { describe, expect, it } from 'vitest';

import {
  buildFilemakerPartyOptions,
  decodeFilemakerPartyReference,
  encodeFilemakerPartyReference,
  extractFilemakerEmailsFromText,
  getFilemakerAddressById,
  getFilemakerAddressLinksForOwner,
  getFilemakerAddressesForOwner,
  getFilemakerDefaultAddressForOwner,
  getFilemakerEmailsForParty,
  getFilemakerEventsForOrganization,
  getFilemakerPhoneNumbersForParty,
  getFilemakerOrganizationsForEvent,
  getFilemakerPartiesForEmail,
  getFilemakerPartiesForPhoneNumber,
  linkFilemakerAddressToOwner,
  linkFilemakerEmailToParty,
  linkFilemakerEventToOrganization,
  linkFilemakerPhoneNumberToParty,
  parseFilemakerEmailParserRulesFromPromptSettings,
  parseFilemakerDatabase,
  parseAndUpsertFilemakerEmailsForParty,
  removeFilemakerEmail,
  removeFilemakerEvent,
  removeFilemakerOrganizationEventLinks,
  removeFilemakerPartyEmailLinks,
  removeFilemakerPartyPhoneNumberLinks,
  removeFilemakerPhoneNumber,
  resolveFilemakerPartyLabel,
  setFilemakerDefaultAddressForOwner,
  unlinkFilemakerAddressFromOwner,
  unlinkFilemakerEventFromOrganization,
  unlinkFilemakerEmailFromParty,
  unlinkFilemakerPhoneNumberFromParty,
  upsertFilemakerEmailsForParty,
  upsertFilemakerPhoneNumbersForParty,
  validateFilemakerPhoneNumber,
} from '@/features/filemaker/settings';
import { parseFilemakerPhoneValidationRulesFromPromptSettings } from '@/features/filemaker/filemaker-settings.validation';

const createPersonRecord = (overrides: Record<string, unknown> = {}) => ({
  id: 'p-1',
  firstName: 'Jane',
  lastName: 'Smith',
  addressId: '',
  street: '',
  streetNumber: '',
  city: '',
  postalCode: '',
  country: '',
  countryId: '',
  nip: '',
  regon: '',
  phoneNumbers: [],
  ...overrides,
});

const createOrganizationRecord = (overrides: Record<string, unknown> = {}) => ({
  id: 'o-1',
  name: 'Beta Ltd',
  addressId: '',
  street: '',
  streetNumber: '',
  city: '',
  postalCode: '',
  country: '',
  countryId: '',
  ...overrides,
});

const createEventRecord = (overrides: Record<string, unknown> = {}) => ({
  id: 'ev-1',
  eventName: 'Expo 2026',
  addressId: '',
  street: '',
  streetNumber: '',
  city: '',
  postalCode: '',
  country: '',
  countryId: '',
  ...overrides,
});

const emptyCanonicalRelations = {
  events: [],
  addresses: [],
  addressLinks: [],
  phoneNumbers: [],
  phoneNumberLinks: [],
  emails: [],
  emailLinks: [],
  eventOrganizationLinks: [],
};

describe('filemaker settings', () => {
  it('normalizes and deduplicates database entries', () => {
    const raw = JSON.stringify({
      version: 2,
      persons: [
        {
          id: 'p-1',
          firstName: 'John',
          lastName: 'Doe',
          addressId: 'a-1',
          street: '',
          streetNumber: '',
          city: '',
          postalCode: '',
          country: '',
          countryId: '',
          nip: '123',
          regon: '456',
          phoneNumbers: [],
        },
        {
          id: 'p-1',
          firstName: 'Duplicate',
          lastName: 'Person',
          addressId: '',
          street: '',
          streetNumber: '',
          city: '',
          postalCode: '',
          country: '',
          countryId: '',
          nip: '',
          regon: '',
          phoneNumbers: [],
        },
      ],
      organizations: [
        {
          id: 'o-1',
          name: 'Acme Corp',
          addressId: 'a-2',
          street: '',
          streetNumber: '',
          city: '',
          postalCode: '',
          country: '',
          countryId: '',
        },
      ],
      events: [],
      addresses: [
        {
          id: 'a-1',
          street: 'Main Street',
          streetNumber: '1',
          city: 'Warsaw',
          postalCode: '00-001',
          country: 'Poland',
          countryId: 'country-pl',
        },
        {
          id: 'a-2',
          street: 'Business Road',
          streetNumber: '2',
          city: 'Gdansk',
          postalCode: '80-001',
          country: 'Poland',
          countryId: 'country-pl',
        },
      ],
      addressLinks: [
        {
          id: 'l-1',
          ownerKind: 'person',
          ownerId: 'p-1',
          addressId: 'a-1',
          isDefault: true,
        },
        {
          id: 'l-2',
          ownerKind: 'organization',
          ownerId: 'o-1',
          addressId: 'a-2',
          isDefault: true,
        },
      ],
      phoneNumbers: [
        { id: 'ph-1', phoneNumber: '+48 123 456 789' },
        { id: 'ph-duplicate', phoneNumber: '+48123456789' },
      ],
      phoneNumberLinks: [{ id: 'phl-1', phoneNumberId: 'ph-1', partyKind: 'person', partyId: 'p-1' }],
      emails: [],
      emailLinks: [],
      eventOrganizationLinks: [],
    });

    const database = parseFilemakerDatabase(raw);
    expect(database.version).toBe(2);
    expect(database.persons).toHaveLength(1);
    expect(database.organizations).toHaveLength(1);
    expect(database.addresses).toHaveLength(2);
    expect(database.persons[0]?.phoneNumbers).toEqual(['+48123456789']);
    expect(database.phoneNumbers).toHaveLength(1);
    expect(database.phoneNumberLinks).toHaveLength(1);
    expect(database.persons[0]?.city).toBe('Warsaw');
    expect(database.organizations[0]?.country).toBe('Poland');
    expect(database.persons[0]?.addressId).toBe('a-1');
    expect(database.organizations[0]?.addressId).toBe('a-2');
    expect(getFilemakerAddressById(database, database.persons[0]?.addressId)?.country).toBe(
      'Poland'
    );
  });

  it('normalizes address links and enforces one default per owner', () => {
    const database = parseFilemakerDatabase(
      JSON.stringify({
        version: 2,
        persons: [
          {
            id: 'p-1',
            firstName: 'John',
            lastName: 'Doe',
            street: 'Main',
            streetNumber: '1',
            city: 'Warsaw',
            postalCode: '00-001',
            country: 'Poland',
            countryId: 'country-pl',
            addressId: 'a-1',
            nip: '',
            regon: '',
            phoneNumbers: [],
          },
        ],
        organizations: [],
        events: [],
        addresses: [
          {
            id: 'a-1',
            street: 'Main',
            streetNumber: '1',
            city: 'Warsaw',
            postalCode: '00-001',
            country: 'Poland',
            countryId: 'country-pl',
          },
          {
            id: 'a-2',
            street: 'Alt',
            streetNumber: '2',
            city: 'Krakow',
            postalCode: '30-001',
            country: 'Poland',
            countryId: 'country-pl',
          },
        ],
        addressLinks: [
          {
            id: 'l-1',
            ownerKind: 'person',
            ownerId: 'p-1',
            addressId: 'a-1',
            isDefault: true,
          },
          {
            id: 'l-2',
            ownerKind: 'person',
            ownerId: 'p-1',
            addressId: 'a-2',
            isDefault: true,
          },
        ],
      })
    );

    const links = getFilemakerAddressLinksForOwner(database, 'person', 'p-1');
    expect(links).toHaveLength(2);
    expect(links.filter((link) => link.isDefault)).toHaveLength(1);
    expect(getFilemakerDefaultAddressForOwner(database, 'person', 'p-1')?.id).toBe('a-1');
    expect(database.persons[0]?.addressId).toBe('a-1');
  });

  it('encodes and decodes party references', () => {
    expect(encodeFilemakerPartyReference({ kind: 'person', id: 'p-1' })).toBe('person:p-1');
    expect(decodeFilemakerPartyReference('organization:o-1')).toEqual({
      kind: 'organization',
      id: 'o-1',
      name: 'o-1',
    });
    expect(decodeFilemakerPartyReference('none')).toBeNull();
  });

  it('builds party labels and options', () => {
    const database = parseFilemakerDatabase(
      JSON.stringify({
        version: 2,
        persons: [
          {
            id: 'p-1',
            firstName: 'Jane',
            lastName: 'Smith',
            addressId: '',
            street: '',
            streetNumber: '',
            city: '',
            postalCode: '',
            country: '',
            countryId: '',
            nip: '',
            regon: '',
            phoneNumbers: [],
          },
        ],
        organizations: [
          {
            id: 'o-1',
            name: 'Beta Ltd',
            addressId: '',
            street: '',
            streetNumber: '',
            city: '',
            postalCode: '',
            country: '',
            countryId: '',
          },
        ],
        events: [],
        addresses: [],
        addressLinks: [],
        phoneNumbers: [],
        phoneNumberLinks: [],
        emails: [],
        emailLinks: [],
        eventOrganizationLinks: [],
      })
    );

    const options = buildFilemakerPartyOptions(database);
    expect(options.length).toBe(3);
    expect(resolveFilemakerPartyLabel(database, { kind: 'person', id: 'p-1' })).toBe('Jane Smith');
    expect(resolveFilemakerPartyLabel(database, { kind: 'organization', id: 'o-1' })).toBe(
      'Beta Ltd'
    );
  });

  it('rejects legacy version 1 database payloads', () => {
    expect(() =>
      parseFilemakerDatabase(
        JSON.stringify({
          version: 1,
          persons: [],
          organizations: [],
          events: [],
        })
      )
    ).toThrowError(/Legacy Filemaker database payloads are no longer supported/);
  });

  it('rejects deprecated fullAddress payloads', () => {
    expect(() =>
      parseFilemakerDatabase(
        JSON.stringify({
          version: 2,
          persons: [
            {
              id: 'p-deprecated',
              firstName: 'Deprecated',
              lastName: 'Person',
              addressId: '',
              street: '',
              streetNumber: '',
              city: '',
              postalCode: '',
              country: '',
              countryId: '',
              nip: '',
              regon: '',
              phoneNumbers: [],
              fullAddress: 'Main Street 1, Warsaw, 00-003, Poland',
            },
          ],
          organizations: [],
          events: [],
          addresses: [],
          addressLinks: [],
          phoneNumbers: [],
          phoneNumberLinks: [],
          emails: [],
          emailLinks: [],
          eventOrganizationLinks: [],
        })
      )
    ).toThrowError(/Legacy Filemaker fullAddress payloads are no longer supported/);
  });

  it('normalizes email records and email links', () => {
    const database = parseFilemakerDatabase(
      JSON.stringify({
        version: 2,
        persons: [createPersonRecord()],
        organizations: [createOrganizationRecord()],
        ...emptyCanonicalRelations,
        emails: [
          { id: 'e-1', email: 'JANE@EXAMPLE.COM', status: 'active' },
          { id: 'e-2', email: 'jane@example.com', status: 'inactive' },
          { id: 'e-3', email: 'invalid', status: 'bounced' },
        ],
        emailLinks: [
          { id: 'l-1', emailId: 'e-1', partyKind: 'person', partyId: 'p-1' },
          { id: 'l-2', emailId: 'e-1', partyKind: 'person', partyId: 'p-1' },
          { id: 'l-3', emailId: 'e-1', partyKind: 'organization', partyId: 'o-1' },
          { id: 'l-4', emailId: 'missing', partyKind: 'person', partyId: 'p-1' },
        ],
      })
    );

    expect(database.emails).toHaveLength(1);
    expect(database.emails[0]?.email).toBe('jane@example.com');
    expect(database.emailLinks).toHaveLength(2);
    expect(getFilemakerEmailsForParty(database, 'person', 'p-1')).toHaveLength(1);
    expect(getFilemakerPartiesForEmail(database, 'e-1').persons).toHaveLength(1);
    expect(getFilemakerPartiesForEmail(database, 'e-1').organizations).toHaveLength(1);
  });

  it('links and unlinks emails to parties', () => {
    const baseDatabase = parseFilemakerDatabase(
      JSON.stringify({
        version: 2,
        persons: [createPersonRecord()],
        organizations: [],
        ...emptyCanonicalRelations,
        emails: [{ id: 'e-1', email: 'jane@example.com', status: 'active' }],
      })
    );

    const linked = linkFilemakerEmailToParty(baseDatabase, {
      emailId: 'e-1',
      partyKind: 'person',
      partyId: 'p-1',
    });
    expect(linked.created).toBe(true);
    expect(linked.database.emailLinks).toHaveLength(1);

    const duplicate = linkFilemakerEmailToParty(linked.database, {
      emailId: 'e-1',
      partyKind: 'person',
      partyId: 'p-1',
    });
    expect(duplicate.created).toBe(false);
    expect(duplicate.database.emailLinks).toHaveLength(1);

    const unlinked = unlinkFilemakerEmailFromParty(linked.database, {
      emailId: 'e-1',
      partyKind: 'person',
      partyId: 'p-1',
    });
    expect(unlinked.emailLinks).toHaveLength(0);

    const relinked = linkFilemakerEmailToParty(baseDatabase, {
      emailId: 'e-1',
      partyKind: 'person',
      partyId: 'p-1',
    }).database;
    expect(removeFilemakerPartyEmailLinks(relinked, 'person', 'p-1').emailLinks).toHaveLength(0);
    expect(removeFilemakerEmail(relinked, 'e-1').emails).toHaveLength(0);
  });

  it('normalizes phone numbers and phone number links', () => {
    const database = parseFilemakerDatabase(
      JSON.stringify({
        version: 2,
        persons: [createPersonRecord()],
        organizations: [createOrganizationRecord()],
        ...emptyCanonicalRelations,
        phoneNumbers: [
          { id: 'ph-1', phoneNumber: '+1 (555) 555-5555' },
          { id: 'ph-2', phoneNumber: '+15555555555' },
          { id: 'ph-3', phoneNumber: 'invalid' },
        ],
        phoneNumberLinks: [
          { id: 'phl-1', phoneNumberId: 'ph-1', partyKind: 'person', partyId: 'p-1' },
          { id: 'phl-2', phoneNumberId: 'ph-1', partyKind: 'person', partyId: 'p-1' },
          { id: 'phl-3', phoneNumberId: 'ph-1', partyKind: 'organization', partyId: 'o-1' },
          { id: 'phl-4', phoneNumberId: 'missing', partyKind: 'person', partyId: 'p-1' },
        ],
      })
    );

    expect(database.phoneNumbers.map((entry) => entry.phoneNumber).sort()).toEqual([
      '+15555555555',
    ]);
    expect(database.phoneNumberLinks).toHaveLength(2);
    expect(getFilemakerPhoneNumbersForParty(database, 'person', 'p-1')).toHaveLength(1);
    expect(getFilemakerPhoneNumbersForParty(database, 'organization', 'o-1')).toHaveLength(1);
    expect(getFilemakerPartiesForPhoneNumber(database, 'ph-1').persons).toHaveLength(1);
  });

  it('links and unlinks phone numbers to parties', () => {
    const baseDatabase = parseFilemakerDatabase(
      JSON.stringify({
        version: 2,
        persons: [createPersonRecord()],
        organizations: [createOrganizationRecord()],
        ...emptyCanonicalRelations,
        phoneNumbers: [{ id: 'ph-1', phoneNumber: '+48123456789' }],
        phoneNumberLinks: [],
      })
    );

    const linked = linkFilemakerPhoneNumberToParty(baseDatabase, {
      phoneNumberId: 'ph-1',
      partyKind: 'person',
      partyId: 'p-1',
    });
    expect(linked.created).toBe(true);
    expect(linked.database.phoneNumberLinks).toHaveLength(1);

    const duplicate = linkFilemakerPhoneNumberToParty(linked.database, {
      phoneNumberId: 'ph-1',
      partyKind: 'person',
      partyId: 'p-1',
    });
    expect(duplicate.created).toBe(false);
    expect(duplicate.database.phoneNumberLinks).toHaveLength(1);

    const linkedOrganization = linkFilemakerPhoneNumberToParty(linked.database, {
      phoneNumberId: 'ph-1',
      partyKind: 'organization',
      partyId: 'o-1',
    });
    expect(linkedOrganization.created).toBe(true);
    expect(
      getFilemakerPartiesForPhoneNumber(linkedOrganization.database, 'ph-1').organizations
    ).toHaveLength(1);

    const unlinked = unlinkFilemakerPhoneNumberFromParty(linkedOrganization.database, {
      phoneNumberId: 'ph-1',
      partyKind: 'person',
      partyId: 'p-1',
    });
    expect(getFilemakerPhoneNumbersForParty(unlinked, 'person', 'p-1')).toHaveLength(0);

    const relinked = linkFilemakerPhoneNumberToParty(baseDatabase, {
      phoneNumberId: 'ph-1',
      partyKind: 'person',
      partyId: 'p-1',
    }).database;
    expect(
      removeFilemakerPartyPhoneNumberLinks(relinked, 'person', 'p-1').phoneNumberLinks
    ).toHaveLength(0);
    expect(removeFilemakerPhoneNumber(relinked, 'ph-1').phoneNumbers).toHaveLength(0);
  });

  it('links, switches, and unlinks addresses for owners', () => {
    const baseDatabase = parseFilemakerDatabase(
      JSON.stringify({
        version: 2,
        persons: [createPersonRecord({ addressId: 'a-1' })],
        organizations: [],
        events: [],
        addresses: [
          {
            id: 'a-1',
            street: 'Street',
            streetNumber: '1',
            city: 'Warsaw',
            postalCode: '00-002',
            country: 'Poland',
            countryId: 'country-pl',
          },
          {
            id: 'a-2',
            street: 'Street',
            streetNumber: '2',
            city: 'Warsaw',
            postalCode: '00-002',
            country: 'Poland',
            countryId: 'country-pl',
          },
        ],
        addressLinks: [
          {
            id: 'l-1',
            ownerKind: 'person',
            ownerId: 'p-1',
            addressId: 'a-1',
            isDefault: true,
          },
        ],
        phoneNumbers: [],
        phoneNumberLinks: [],
        emails: [],
        emailLinks: [],
        eventOrganizationLinks: [],
      })
    );

    const linked = linkFilemakerAddressToOwner(baseDatabase, {
      ownerKind: 'person',
      ownerId: 'p-1',
      addressId: 'a-2',
    });
    expect(linked.created).toBe(true);
    expect(getFilemakerAddressesForOwner(linked.database, 'person', 'p-1')).toHaveLength(2);

    const switched = setFilemakerDefaultAddressForOwner(linked.database, {
      ownerKind: 'person',
      ownerId: 'p-1',
      addressId: 'a-2',
    });
    expect(getFilemakerDefaultAddressForOwner(switched, 'person', 'p-1')?.id).toBe('a-2');
    expect(switched.persons[0]?.addressId).toBe('a-2');

    const unlinked = unlinkFilemakerAddressFromOwner(switched, {
      ownerKind: 'person',
      ownerId: 'p-1',
      addressId: 'a-2',
    });
    expect(getFilemakerAddressesForOwner(unlinked, 'person', 'p-1')).toHaveLength(1);
    expect(getFilemakerDefaultAddressForOwner(unlinked, 'person', 'p-1')?.id).toBe('a-1');
  });

  it('normalizes events and event-organization links', () => {
    const database = parseFilemakerDatabase(
      JSON.stringify({
        version: 2,
        persons: [],
        organizations: [createOrganizationRecord()],
        ...emptyCanonicalRelations,
        events: [createEventRecord(), createEventRecord({ id: 'ev-1', eventName: 'Duplicate' })],
        eventOrganizationLinks: [
          { id: 'eol-1', eventId: 'ev-1', organizationId: 'o-1' },
          { id: 'eol-2', eventId: 'ev-1', organizationId: 'o-1' },
          { id: 'eol-3', eventId: 'missing', organizationId: 'o-1' },
        ],
      })
    );

    expect(database.events).toHaveLength(1);
    expect(database.events[0]?.eventName).toBe('Expo 2026');
    expect(database.eventOrganizationLinks).toHaveLength(1);
    expect(getFilemakerOrganizationsForEvent(database, 'ev-1')).toHaveLength(1);
    expect(getFilemakerEventsForOrganization(database, 'o-1')).toHaveLength(1);
  });

  it('links and unlinks organizations to events', () => {
    const baseDatabase = parseFilemakerDatabase(
      JSON.stringify({
        version: 2,
        persons: [],
        organizations: [createOrganizationRecord()],
        ...emptyCanonicalRelations,
        events: [createEventRecord()],
        eventOrganizationLinks: [],
      })
    );

    const linked = linkFilemakerEventToOrganization(baseDatabase, {
      eventId: 'ev-1',
      organizationId: 'o-1',
    });
    expect(linked.created).toBe(true);
    expect(linked.database.eventOrganizationLinks).toHaveLength(1);

    const duplicate = linkFilemakerEventToOrganization(linked.database, {
      eventId: 'ev-1',
      organizationId: 'o-1',
    });
    expect(duplicate.created).toBe(false);
    expect(duplicate.database.eventOrganizationLinks).toHaveLength(1);

    const unlinked = unlinkFilemakerEventFromOrganization(linked.database, {
      eventId: 'ev-1',
      organizationId: 'o-1',
    });
    expect(unlinked.eventOrganizationLinks).toHaveLength(0);

    expect(
      removeFilemakerOrganizationEventLinks(linked.database, 'o-1').eventOrganizationLinks
    ).toHaveLength(0);
    expect(removeFilemakerEvent(linked.database, 'ev-1').events).toHaveLength(0);
  });

  it('extracts emails from free text using default parser rules', () => {
    const result = extractFilemakerEmailsFromText(`
      Contact: mailto:John.Doe@Example.com
      Backup: <support@example.org>; "TEAM@example.org"
      Also team@example.org and invalid@ value.
    `);

    expect(result.emails).toEqual([
      'john.doe@example.com',
      'support@example.org',
      'team@example.org',
    ]);
    expect(result.totalMatches).toBeGreaterThan(0);
  });

  it('parses custom filemaker email parser rules from prompt settings payload', () => {
    const rules = parseFilemakerEmailParserRulesFromPromptSettings(
      JSON.stringify({
        promptValidation: {
          rules: [
            {
              id: 'segment.filemaker.email_parser.custom_mailto',
              kind: 'regex',
              enabled: true,
              pattern: 'mailto:\\s*([A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,})',
              flags: 'gi',
              sequence: 15,
            },
            {
              id: 'segment.filemaker.email_parser.disabled',
              kind: 'regex',
              enabled: false,
              pattern: '([A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,})',
              flags: 'gi',
              sequence: 20,
            },
            {
              id: 'segment.other.scope',
              kind: 'regex',
              enabled: true,
              pattern: '([A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,})',
              flags: 'gi',
              sequence: 25,
            },
          ],
        },
      })
    );

    expect(rules).toHaveLength(1);
    expect(rules[0]).toMatchObject({
      id: 'segment.filemaker.email_parser.custom_mailto',
      sequence: 15,
    });
  });

  it('parses custom filemaker phone validation rules from prompt settings payload', () => {
    const rules = parseFilemakerPhoneValidationRulesFromPromptSettings(
      JSON.stringify({
        promptValidation: {
          rules: [
            {
              id: 'segment.filemaker.phone_number.e164_only',
              kind: 'regex',
              enabled: true,
              pattern: '^\\+[1-9]\\d{7,14}$',
              flags: '',
              sequence: 10,
            },
            {
              id: 'segment.filemaker.phone_number.disabled',
              kind: 'regex',
              enabled: false,
              pattern: '^\\d+$',
              flags: '',
              sequence: 20,
            },
            {
              id: 'segment.other.scope',
              kind: 'regex',
              enabled: true,
              pattern: '^\\d+$',
              flags: '',
              sequence: 25,
            },
          ],
        },
      })
    );

    expect(rules).toHaveLength(1);
    expect(rules[0]).toMatchObject({
      id: 'segment.filemaker.phone_number.e164_only',
      sequence: 10,
    });
  });

  it('upserts extracted emails for a party and remains idempotent', () => {
    const baseDatabase = parseFilemakerDatabase(
      JSON.stringify({
        version: 2,
        persons: [createPersonRecord()],
        organizations: [],
        ...emptyCanonicalRelations,
        emails: [{ id: 'e-1', email: 'existing@example.com', status: 'active' }],
        emailLinks: [],
      })
    );

    const first = upsertFilemakerEmailsForParty(baseDatabase, {
      partyKind: 'person',
      partyId: 'p-1',
      emails: ['existing@example.com', 'NEW@EXAMPLE.COM', 'invalid-email'],
      status: 'unverified',
    });

    expect(first.partyFound).toBe(true);
    expect(first.createdEmailCount).toBe(1);
    expect(first.linkedEmailCount).toBe(2);
    expect(first.invalidEmailCount).toBe(1);
    expect(
      getFilemakerEmailsForParty(first.database, 'person', 'p-1')
        .map((entry) => entry.email)
        .sort()
    ).toEqual(['existing@example.com', 'new@example.com']);

    const second = upsertFilemakerEmailsForParty(first.database, {
      partyKind: 'person',
      partyId: 'p-1',
      emails: ['existing@example.com', 'new@example.com'],
      status: 'unverified',
    });

    expect(second.createdEmailCount).toBe(0);
    expect(second.linkedEmailCount).toBe(0);
  });

  it('validates and upserts phone numbers for a party and remains idempotent', () => {
    const baseDatabase = parseFilemakerDatabase(
      JSON.stringify({
        version: 2,
        persons: [createPersonRecord()],
        organizations: [],
        ...emptyCanonicalRelations,
        phoneNumbers: [{ id: 'ph-1', phoneNumber: '+48111222333' }],
        phoneNumberLinks: [],
      })
    );

    expect(validateFilemakerPhoneNumber('+48 111-222-333').isValid).toBe(true);
    expect(validateFilemakerPhoneNumber('invalid').isValid).toBe(false);

    const first = upsertFilemakerPhoneNumbersForParty(baseDatabase, {
      partyKind: 'person',
      partyId: 'p-1',
      phoneNumbers: ['+48 111-222-333', '0048 999 888 777', 'invalid'],
    });

    expect(first.partyFound).toBe(true);
    expect(first.createdPhoneNumberCount).toBe(1);
    expect(first.linkedPhoneNumberCount).toBe(2);
    expect(first.invalidPhoneNumberCount).toBe(1);
    expect(
      getFilemakerPhoneNumbersForParty(first.database, 'person', 'p-1')
        .map((entry) => entry.phoneNumber)
        .sort()
    ).toEqual(['+48111222333', '+48999888777']);

    const second = upsertFilemakerPhoneNumbersForParty(first.database, {
      partyKind: 'person',
      partyId: 'p-1',
      phoneNumbers: ['+48 111 222 333', '+48 999 888 777'],
    });

    expect(second.createdPhoneNumberCount).toBe(0);
    expect(second.linkedPhoneNumberCount).toBe(0);
  });

  it('parses and upserts emails in one step', () => {
    const baseDatabase = parseFilemakerDatabase(
      JSON.stringify({
        version: 2,
        persons: [
          createPersonRecord({
            id: 'p-2',
            firstName: 'Ada',
            lastName: 'Nowak',
          }),
        ],
        organizations: [],
        ...emptyCanonicalRelations,
        emails: [],
        emailLinks: [],
      })
    );

    const result = parseAndUpsertFilemakerEmailsForParty(baseDatabase, {
      partyKind: 'person',
      partyId: 'p-2',
      text: 'Reach me at mailto:ada.nowak@example.com and <office@example.com>.',
    });

    expect(result.appliedEmails).toEqual(['ada.nowak@example.com', 'office@example.com']);
    expect(result.createdEmailCount).toBe(2);
    expect(result.linkedEmailCount).toBe(2);
  });
});
