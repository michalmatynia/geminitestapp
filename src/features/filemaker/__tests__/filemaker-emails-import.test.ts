import { describe, expect, it } from 'vitest';

import {
  parseEmailOrganizationJoinFromRow,
  parseFilemakerLegacyEmailOrganizationJoinRows,
  type ParsedLegacyEmailOrganizationJoin,
} from '../filemaker-email-organization-joins-import.parser';
import {
  parseEmailFromRow,
  parseFilemakerLegacyEmailRows,
  type ParsedLegacyEmail,
} from '../filemaker-emails-import.parser';

const EMAIL_UUID = '62217848-A456-4343-B7BF-130FD2577EB0';
const ORGANIZATION_UUID = '8E808514-6196-4975-82F3-BD73C71A81BA';
const STATUS_UUID = 'AFC84084-D42F-4A78-8C0B-D7B9E3344F09';
const LEGACY_VALID_STATUS_UUID = 'CA4DA13B-0D51-4E6F-87A0-F90D1190B9D8';
const LEGACY_SOFT_BOUNCE_STATUS_UUID = '8E808514-6196-4975-82F3-BD73C71A81BA';
const LEGACY_HARD_BOUNCE_STATUS_UUID = 'AE5C43AA-6A1F-46DC-BF20-28C0B6E4DC76';
const LEGACY_BLACKLISTED_STATUS_UUID = 'CF4D07AF-1987-4EEC-9D5C-9E72201EB557';
const LEGACY_SPAMTRAP_STATUS_UUID = '14E41083-EE2A-4FB0-ADED-FA6BFA63A362';
const LEGACY_OMIT_STATUS_UUID = '265BE365-DB0B-4A4B-8690-20B916860163';
const LEGACY_VERIFIED_HB_STATUS_UUID = '8C31F126-4A4D-4690-9866-185976194B4E';

const emailExportText = [
  [
    'DateAdded',
    'DateModified',
    'Domain_Country',
    'Email',
    'ModifiedBy',
    'Status',
    'UUID',
    'NameOrganisation::Name',
  ].join('\t'),
  [
    '',
    '06/18/2020 03:22:10',
    '',
    'info@tryzna.org',
    'Admin',
    STATUS_UUID,
    EMAIL_UUID,
    ORGANIZATION_UUID,
  ].join('\t'),
].join('\n');

const expectParsedEmail = (email: ParsedLegacyEmail | null): ParsedLegacyEmail => {
  expect(email).not.toBeNull();
  if (email === null) throw new Error('Expected email row to parse.');
  return email;
};

const expectParsedEmailJoin = (
  join: ParsedLegacyEmailOrganizationJoin | null
): ParsedLegacyEmailOrganizationJoin => {
  expect(join).not.toBeNull();
  if (join === null) throw new Error('Expected email join row to parse.');
  return join;
};

const parseEmailStatus = (status: string): ParsedLegacyEmail =>
  expectParsedEmail(parseEmailFromRow({
    DateAdded: '',
    DateModified: '',
    Domain_Country: '',
    Email: 'status@example.com',
    ModifiedBy: '',
    Status: status,
    UUID: EMAIL_UUID,
    'NameOrganisation::Name': '',
  }));

describe('FileMaker legacy email import parser', () => {
  it('parses email rows from a FileMaker TSV export', () => {
    const rows = parseFilemakerLegacyEmailRows(emailExportText);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.['Email']).toBe('info@tryzna.org');
    expect(rows[0]?.['UUID']).toBe(EMAIL_UUID);
  });

  it('retains email UUIDs and resolves related organization UUID fields', () => {
    const email = expectParsedEmail(
      parseEmailFromRow(parseFilemakerLegacyEmailRows(emailExportText)[0] ?? {})
    );

    expect(email.email).toBe('info@tryzna.org');
    expect(email.legacyUuid).toBe(EMAIL_UUID);
    expect(email.legacyOrganizationUuid).toBe(ORGANIZATION_UUID);
    expect(email.legacyStatusUuid).toBe(STATUS_UUID);
    expect(email.status).toBe('unverified');
    expect(email.updatedAt).toBe('2020-06-18T03:22:10.000Z');
    expect(email.updatedBy).toBe('Admin');
  });

  it('keeps organization names unresolved when the related field is not a UUID', () => {
    const email = expectParsedEmail(
      parseEmailFromRow({
        DateAdded: '',
        DateModified: '06/18/2020 03:22:10',
        Domain_Country: '',
        Email: 'contact@example.com',
        ModifiedBy: 'Admin',
        Status: 'active',
        UUID: EMAIL_UUID,
        'NameOrganisation::Name': 'Tryzna Foundation',
      })
    );

    expect(email.legacyOrganizationName).toBe('Tryzna Foundation');
    expect(email.legacyOrganizationUuid).toBeUndefined();
    expect(email.status).toBe('active');
  });
});

describe('FileMaker legacy email status normalization', () => {
  it('maps known legacy email status UUIDs into the modern status collection', () => {
    const expectedStatuses = [
      [LEGACY_VALID_STATUS_UUID, 'active'],
      [LEGACY_SOFT_BOUNCE_STATUS_UUID, 'bounced'],
      [LEGACY_HARD_BOUNCE_STATUS_UUID, 'bounced'],
      [LEGACY_VERIFIED_HB_STATUS_UUID, 'bounced'],
      [LEGACY_BLACKLISTED_STATUS_UUID, 'inactive'],
      [LEGACY_SPAMTRAP_STATUS_UUID, 'inactive'],
      [LEGACY_OMIT_STATUS_UUID, 'inactive'],
    ] as const;

    expectedStatuses.forEach(([legacyStatusUuid, expectedStatus]) => {
      expect(parseEmailStatus(legacyStatusUuid).status).toBe(expectedStatus);
    });

    const hardBounce = parseEmailStatus(LEGACY_HARD_BOUNCE_STATUS_UUID);
    expect(hardBounce.legacyStatusUuid).toBe(LEGACY_HARD_BOUNCE_STATUS_UUID);
    expect(hardBounce.legacyStatusRaw).toBe(LEGACY_HARD_BOUNCE_STATUS_UUID);
  });

  it('maps legacy email status labels into the modern status collection', () => {
    expect(parseEmailStatus('Valid').status).toBe('active');
    expect(parseEmailStatus('Hard Bounce').status).toBe('bounced');
    expect(parseEmailStatus('Soft Bounce').status).toBe('bounced');
    expect(parseEmailStatus('Verified HB').status).toBe('bounced');
    expect(parseEmailStatus('Blacklisted').status).toBe('inactive');
    expect(parseEmailStatus('Spamtrap').status).toBe('inactive');
    expect(parseEmailStatus('Omit').status).toBe('inactive');
    expect(parseEmailStatus('Hard Bounce').legacyStatusRaw).toBe('Hard Bounce');
  });
});

describe('FileMaker legacy email related imports', () => {
  it('parses the headerless FileMaker email CSV export shape', () => {
    const rows = parseFilemakerLegacyEmailRows(
      `"","6/18/2020 3:22:10 AM","","info@tryzna.org","Admin","${STATUS_UUID}","${EMAIL_UUID}",\r`
    );

    expect(rows).toHaveLength(1);
    const email = expectParsedEmail(parseEmailFromRow(rows[0] ?? {}));
    expect(email.email).toBe('info@tryzna.org');
    expect(email.legacyUuid).toBe(EMAIL_UUID);
    expect(email.legacyStatusUuid).toBe(STATUS_UUID);
  });

  it('parses the headerless FileMaker organisation-email join table shape', () => {
    const joinRows = parseFilemakerLegacyEmailOrganizationJoinRows(
      [
        '10/6/2017 1:34:34 AM',
        EMAIL_UUID,
        'Admin',
        '',
        '10/6/2017 1:34:34 AM',
        ORGANIZATION_UUID,
        'B3F61CA7-AF9D-4616-B5ED-FAD1ED860069',
        'info@tryzna.org',
        STATUS_UUID,
        'Tryzna Foundation',
        ORGANIZATION_UUID,
      ].join('\t')
    );

    expect(joinRows).toHaveLength(1);
    const join = expectParsedEmailJoin(parseEmailOrganizationJoinFromRow(joinRows[0] ?? {}));
    expect(join.legacyEmailUuid).toBe(EMAIL_UUID);
    expect(join.legacyOrganizationUuid).toBe(ORGANIZATION_UUID);
    expect(join.legacyJoinUuid).toBe('B3F61CA7-AF9D-4616-B5ED-FAD1ED860069');
    expect(join.legacyStatusUuid).toBe(STATUS_UUID);
    expect(join.legacyOrganizationName).toBe('Tryzna Foundation');
  });
});
