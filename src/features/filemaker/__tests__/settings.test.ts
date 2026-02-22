import { describe, expect, it } from 'vitest';

import {
  buildFilemakerPartyOptions,
  decodeFilemakerPartyReference,
  encodeFilemakerPartyReference,
  extractFilemakerEmailsFromText,
  getFilemakerAddressById,
  getFilemakerEmailsForParty,
  getFilemakerPartiesForEmail,
  linkFilemakerEmailToParty,
  parseFilemakerEmailParserRulesFromPromptSettings,
  parseFilemakerDatabase,
  parseAndUpsertFilemakerEmailsForParty,
  removeFilemakerEmail,
  removeFilemakerPartyEmailLinks,
  resolveFilemakerPartyLabel,
  unlinkFilemakerEmailFromParty,
  upsertFilemakerEmailsForParty,
} from '@/features/filemaker/settings';

describe('filemaker settings', () => {
  it('normalizes and deduplicates database entries', () => {
    const raw = JSON.stringify({
      version: 1,
      persons: [
        {
          id: 'p-1',
          firstName: 'John',
          lastName: 'Doe',
          street: 'Main Street 1',
          city: 'Warsaw',
          postalCode: '00-001',
          country: 'Poland',
          nip: '123',
          regon: '456',
          phoneNumbers: ['+48 123', '+48 123', ''],
        },
        {
          id: 'p-1',
          firstName: 'Duplicate',
          lastName: 'Person',
          street: 'Other Street 5',
          city: 'Krakow',
          postalCode: '30-001',
          country: 'Poland',
        },
      ],
      organizations: [
        {
          id: 'o-1',
          name: 'Acme Corp',
          street: 'Business Road 2',
          city: 'Gdansk',
          postalCode: '80-001',
          country: 'Poland',
        },
      ],
    });

    const database = parseFilemakerDatabase(raw);
    expect(database.version).toBe(2);
    expect(database.persons).toHaveLength(1);
    expect(database.organizations).toHaveLength(1);
    expect(database.addresses).toHaveLength(2);
    expect(database.persons[0]?.phoneNumbers).toEqual(['+48 123']);
    expect(database.persons[0]?.city).toBe('Warsaw');
    expect(database.organizations[0]?.country).toBe('Poland');
    expect(database.persons[0]?.addressId).toBe('person-address-p-1');
    expect(database.organizations[0]?.addressId).toBe('organization-address-o-1');
    expect(getFilemakerAddressById(database, database.persons[0]?.addressId)?.country).toBe('Poland');
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
        version: 1,
        persons: [
          {
            id: 'p-1',
            firstName: 'Jane',
            lastName: 'Smith',
            street: 'Street 9',
            city: 'Warsaw',
            postalCode: '00-002',
            country: 'Poland',
            nip: '',
            regon: '',
            phoneNumbers: [],
          },
        ],
        organizations: [
          {
            id: 'o-1',
            name: 'Beta Ltd',
            street: 'Org Avenue 10',
            city: 'Poznan',
            postalCode: '60-001',
            country: 'Poland',
          },
        ],
      })
    );

    const options = buildFilemakerPartyOptions(database);
    expect(options.length).toBe(3);
    expect(resolveFilemakerPartyLabel(database, { kind: 'person', id: 'p-1' })).toBe('Jane Smith');
    expect(resolveFilemakerPartyLabel(database, { kind: 'organization', id: 'o-1' })).toBe('Beta Ltd');
  });

  it('ignores deprecated fullAddress payloads', () => {
    const database = parseFilemakerDatabase(
      JSON.stringify({
        version: 1,
        persons: [
          {
            id: 'p-deprecated',
            firstName: 'Deprecated',
            lastName: 'Person',
            fullAddress: 'Main Street 1, Warsaw, 00-003, Poland',
          },
        ],
        organizations: [
          {
            id: 'o-deprecated',
            name: 'Deprecated Org',
            fullAddress: 'Business Road 2, Gdynia, 81-001, Poland',
          },
        ],
      })
    );

    expect(database.persons[0]?.street).toBe('');
    expect(database.persons[0]?.streetNumber).toBe('');
    expect(database.persons[0]?.city).toBe('');
    expect(database.persons[0]?.postalCode).toBe('');
    expect(database.persons[0]?.country).toBe('');
    expect(database.organizations[0]?.street).toBe('');
    expect(database.organizations[0]?.streetNumber).toBe('');
    expect(database.organizations[0]?.city).toBe('');
    expect(database.organizations[0]?.postalCode).toBe('');
    expect(database.organizations[0]?.country).toBe('');
    expect(database.addresses).toHaveLength(0);
  });

  it('normalizes email records and email links', () => {
    const database = parseFilemakerDatabase(
      JSON.stringify({
        version: 2,
        persons: [
          {
            id: 'p-1',
            firstName: 'Jane',
            lastName: 'Smith',
            street: 'Street 9',
            streetNumber: '1',
            city: 'Warsaw',
            postalCode: '00-002',
            country: 'Poland',
            countryId: 'country-pl',
            addressId: 'addr-p-1',
            nip: '',
            regon: '',
            phoneNumbers: [],
          },
        ],
        organizations: [
          {
            id: 'o-1',
            name: 'Beta Ltd',
            street: 'Org Avenue',
            streetNumber: '10',
            city: 'Poznan',
            postalCode: '60-001',
            country: 'Poland',
            countryId: 'country-pl',
            addressId: 'addr-o-1',
          },
        ],
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
        persons: [
          {
            id: 'p-1',
            firstName: 'Jane',
            lastName: 'Smith',
            street: 'Street 9',
            streetNumber: '1',
            city: 'Warsaw',
            postalCode: '00-002',
            country: 'Poland',
            countryId: 'country-pl',
            addressId: 'addr-p-1',
            nip: '',
            regon: '',
            phoneNumbers: [],
          },
        ],
        organizations: [],
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

  it('upserts extracted emails for a party and remains idempotent', () => {
    const baseDatabase = parseFilemakerDatabase(
      JSON.stringify({
        version: 2,
        persons: [
          {
            id: 'p-1',
            firstName: 'Jane',
            lastName: 'Smith',
            street: 'Street 9',
            streetNumber: '1',
            city: 'Warsaw',
            postalCode: '00-002',
            country: 'Poland',
            countryId: 'country-pl',
            addressId: 'addr-p-1',
            nip: '',
            regon: '',
            phoneNumbers: [],
          },
        ],
        organizations: [],
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

  it('parses and upserts emails in one step', () => {
    const baseDatabase = parseFilemakerDatabase(
      JSON.stringify({
        version: 2,
        persons: [
          {
            id: 'p-2',
            firstName: 'Ada',
            lastName: 'Nowak',
            street: 'Street 10',
            streetNumber: '2',
            city: 'Gdynia',
            postalCode: '81-001',
            country: 'Poland',
            countryId: 'country-pl',
            addressId: 'addr-p-2',
            nip: '',
            regon: '',
            phoneNumbers: [],
          },
        ],
        organizations: [],
        emails: [],
        emailLinks: [],
      })
    );

    const result = parseAndUpsertFilemakerEmailsForParty(baseDatabase, {
      partyKind: 'person',
      partyId: 'p-2',
      text: 'Reach me at mailto:ada.nowak@example.com and <office@example.com>.',
    });

    expect(result.appliedEmails).toEqual([
      'ada.nowak@example.com',
      'office@example.com',
    ]);
    expect(result.createdEmailCount).toBe(2);
    expect(result.linkedEmailCount).toBe(2);
  });
});
