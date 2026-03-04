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
  parseFilemakerDatabaseForCaseResolver,
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
          createPersonRecord({
            id: 'p-1',
            firstName: 'John',
            lastName: 'Doe',
            addressId: 'a-1',
          }),
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
    expect(options.length).toBe(2);
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

  it('rejects malformed JSON payloads', () => {
    expect(() => parseFilemakerDatabase('{"version":2')).toThrowError(
      /Invalid Filemaker database JSON payload/
    );
  });

  it('rejects non-object JSON payloads', () => {
    expect(() => parseFilemakerDatabase('"invalid"')).toThrowError(
      /Invalid Filemaker database payload/
    );
    expect(() => parseFilemakerDatabase('[]')).toThrowError(/Invalid Filemaker database payload/);
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

  it('rejects inline address fields when canonical address links are missing', () => {
    expect(() =>
      parseFilemakerDatabase(
        JSON.stringify({
          version: 2,
          persons: [
            createPersonRecord({
              street: 'Main Street',
            }),
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
    ).toThrowError(/Legacy Filemaker inline address payloads are no longer supported/);
  });

  it('rejects inline address fields for case resolver consumers', () => {
    expect(() =>
      parseFilemakerDatabaseForCaseResolver(
        JSON.stringify({
          version: 2,
          persons: [
            createPersonRecord({
              street: 'Main Street',
              streetNumber: '1',
              city: 'Warsaw',
              postalCode: '00-001',
              country: 'Poland',
              countryId: 'country-pl',
            }),
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
    ).toThrowError(/Legacy Filemaker inline address payloads are no longer supported/);
  });

  it('rejects inline address fields even when canonical address links exist', () => {
    expect(() =>
      parseFilemakerDatabase(
        JSON.stringify({
          version: 2,
          persons: [
            createPersonRecord({
              street: 'Main Street',
            }),
          ],
          organizations: [],
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
          ],
          addressLinks: [
            {
              id: 'al-1',
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
      )
    ).toThrowError(/Legacy Filemaker inline address payloads are no longer supported/);
  });

  it('rejects invalid filemaker payload for case resolver', () => {
    expect(() => parseFilemakerDatabaseForCaseResolver('{"version":2')).toThrowError(
      /Invalid Filemaker database JSON payload/
    );
  });

  it('rejects inline person phoneNumbers when canonical phone links are missing', () => {
    expect(() =>
      parseFilemakerDatabase(
        JSON.stringify({
          version: 2,
          persons: [
            createPersonRecord({
              phoneNumbers: ['+48 111 222 333'],
            }),
          ],
          organizations: [],
          events: [],
          addresses: [],
          addressLinks: [],
          phoneNumbers: [{ id: 'ph-1', phoneNumber: '+48111222333' }],
          phoneNumberLinks: [],
          emails: [],
          emailLinks: [],
          eventOrganizationLinks: [],
        })
      )
    ).toThrowError(/Legacy Filemaker inline person phoneNumbers payloads are no longer supported/);
  });

  it('rejects inline person phoneNumbers even when canonical phone links exist', () => {
    expect(() =>
      parseFilemakerDatabase(
        JSON.stringify({
          version: 2,
          persons: [
            createPersonRecord({
              phoneNumbers: ['+48 111 222 333'],
            }),
          ],
          organizations: [],
          events: [],
          addresses: [],
          addressLinks: [],
          phoneNumbers: [{ id: 'ph-1', phoneNumber: '+48111222333' }],
          phoneNumberLinks: [{ id: 'phl-1', phoneNumberId: 'ph-1', partyKind: 'person', partyId: 'p-1' }],
          emails: [],
          emailLinks: [],
          eventOrganizationLinks: [],
        })
      )
    ).toThrowError(/Legacy Filemaker inline person phoneNumbers payloads are no longer supported/);
  });

  it('rejects inline person email fields', () => {
    expect(() =>
      parseFilemakerDatabase(
        JSON.stringify({
          version: 2,
          persons: [
            createPersonRecord({
              email: 'jane@example.com',
            }),
          ],
          organizations: [],
          events: [],
          addresses: [],
          addressLinks: [],
          phoneNumbers: [],
          phoneNumberLinks: [],
          emails: [{ id: 'e-1', email: 'jane@example.com', status: 'active' }],
          emailLinks: [],
          eventOrganizationLinks: [],
        })
      )
    ).toThrowError(/Legacy Filemaker inline person email payloads are no longer supported/);
  });

  it('rejects inline organization email fields', () => {
    expect(() =>
      parseFilemakerDatabase(
        JSON.stringify({
          version: 2,
          persons: [],
          organizations: [
            createOrganizationRecord({
              emails: ['org@example.com'],
            }),
          ],
          events: [],
          addresses: [],
          addressLinks: [],
          phoneNumbers: [],
          phoneNumberLinks: [],
          emails: [{ id: 'e-1', email: 'org@example.com', status: 'active' }],
          emailLinks: [],
          eventOrganizationLinks: [],
        })
      )
    ).toThrowError(/Legacy Filemaker inline organization email payloads are no longer supported/);
  });

  it('rejects non-object phoneNumbers entries', () => {
    expect(() =>
      parseFilemakerDatabase(
        JSON.stringify({
          version: 2,
          persons: [createPersonRecord()],
          organizations: [],
          events: [],
          addresses: [],
          addressLinks: [],
          phoneNumbers: ['+48 111 222 333'],
          phoneNumberLinks: [],
          emails: [],
          emailLinks: [],
          eventOrganizationLinks: [],
        })
      )
    ).toThrowError(/Invalid Filemaker phoneNumbers entry payload/);
  });

  it('rejects inline person email fields even when canonical email links exist', () => {
    expect(() =>
      parseFilemakerDatabase(
        JSON.stringify({
          version: 2,
          persons: [
            createPersonRecord({
              emailAddress: 'jane@example.com',
            }),
          ],
          organizations: [],
          events: [],
          addresses: [],
          addressLinks: [],
          phoneNumbers: [],
          phoneNumberLinks: [],
          emails: [{ id: 'e-1', email: 'jane@example.com', status: 'active' }],
          emailLinks: [{ id: 'el-1', emailId: 'e-1', partyKind: 'person', partyId: 'p-1' }],
          eventOrganizationLinks: [],
        })
      )
    ).toThrowError(/Legacy Filemaker inline person email payloads are no longer supported/);
  });

  it('rejects inline organization email fields even when canonical email links exist', () => {
    expect(() =>
      parseFilemakerDatabase(
        JSON.stringify({
          version: 2,
          persons: [],
          organizations: [
            createOrganizationRecord({
              primaryEmail: 'org@example.com',
            }),
          ],
          events: [],
          addresses: [],
          addressLinks: [],
          phoneNumbers: [],
          phoneNumberLinks: [],
          emails: [{ id: 'e-1', email: 'org@example.com', status: 'active' }],
          emailLinks: [{ id: 'el-1', emailId: 'e-1', partyKind: 'organization', partyId: 'o-1' }],
          eventOrganizationLinks: [],
        })
      )
    ).toThrowError(/Legacy Filemaker inline organization email payloads are no longer supported/);
  });

  it('rejects inline organization phoneNumbers even when canonical phone links exist', () => {
    expect(() =>
      parseFilemakerDatabase(
        JSON.stringify({
          version: 2,
          persons: [],
          organizations: [
            createOrganizationRecord({
              phoneNumbers: ['+48 999 888 777'],
            }),
          ],
          events: [],
          addresses: [],
          addressLinks: [],
          phoneNumbers: [{ id: 'ph-1', phoneNumber: '+48999888777' }],
          phoneNumberLinks: [
            { id: 'phl-1', phoneNumberId: 'ph-1', partyKind: 'organization', partyId: 'o-1' },
          ],
          emails: [],
          emailLinks: [],
          eventOrganizationLinks: [],
        })
      )
    ).toThrowError(
      /Legacy Filemaker inline organization phoneNumbers payloads are no longer supported/
    );
  });

  it('rejects non-array canonical collection payloads', () => {
    expect(() =>
      parseFilemakerDatabase(
        JSON.stringify({
          version: 2,
          persons: [createPersonRecord()],
          organizations: [],
          events: [],
          addresses: [],
          addressLinks: [],
          phoneNumbers: {},
          phoneNumberLinks: [],
          emails: [],
          emailLinks: [],
          eventOrganizationLinks: [],
        })
      )
    ).toThrowError(/Invalid Filemaker phoneNumbers payload/);
  });

});
