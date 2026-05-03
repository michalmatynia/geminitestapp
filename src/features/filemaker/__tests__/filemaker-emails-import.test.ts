import { describe, expect, it } from 'vitest';

import {
  parseEmailOrganizationJoinFromRow,
  parseFilemakerLegacyEmailOrganizationJoinRows,
} from '../filemaker-email-organization-joins-import.parser';
import {
  parseEmailFromRow,
  parseFilemakerLegacyEmailRows,
} from '../filemaker-emails-import.parser';

const EMAIL_UUID = '62217848-A456-4343-B7BF-130FD2577EB0';
const ORGANIZATION_UUID = '8E808514-6196-4975-82F3-BD73C71A81BA';
const STATUS_UUID = 'AFC84084-D42F-4A78-8C0B-D7B9E3344F09';

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

describe('FileMaker legacy email import parser', () => {
  it('parses email rows from a FileMaker TSV export', () => {
    const rows = parseFilemakerLegacyEmailRows(emailExportText);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.['Email']).toBe('info@tryzna.org');
    expect(rows[0]?.['UUID']).toBe(EMAIL_UUID);
  });

  it('retains email UUIDs and resolves related organization UUID fields', () => {
    const email = parseEmailFromRow(parseFilemakerLegacyEmailRows(emailExportText)[0] ?? {});

    expect(email?.email).toBe('info@tryzna.org');
    expect(email?.legacyUuid).toBe(EMAIL_UUID);
    expect(email?.legacyOrganizationUuid).toBe(ORGANIZATION_UUID);
    expect(email?.legacyStatusUuid).toBe(STATUS_UUID);
    expect(email?.status).toBe('unverified');
    expect(email?.updatedAt).toBe('2020-06-18T03:22:10.000Z');
    expect(email?.updatedBy).toBe('Admin');
  });

  it('keeps organization names unresolved when the related field is not a UUID', () => {
    const email = parseEmailFromRow({
      DateAdded: '',
      DateModified: '06/18/2020 03:22:10',
      Domain_Country: '',
      Email: 'contact@example.com',
      ModifiedBy: 'Admin',
      Status: 'active',
      UUID: EMAIL_UUID,
      'NameOrganisation::Name': 'Tryzna Foundation',
    });

    expect(email?.legacyOrganizationName).toBe('Tryzna Foundation');
    expect(email?.legacyOrganizationUuid).toBeUndefined();
    expect(email?.status).toBe('active');
  });

  it('parses the headerless FileMaker email CSV export shape', () => {
    const rows = parseFilemakerLegacyEmailRows(
      `"","6/18/2020 3:22:10 AM","","info@tryzna.org","Admin","${STATUS_UUID}","${EMAIL_UUID}",\r`
    );

    expect(rows).toHaveLength(1);
    const email = parseEmailFromRow(rows[0] ?? {});
    expect(email?.email).toBe('info@tryzna.org');
    expect(email?.legacyUuid).toBe(EMAIL_UUID);
    expect(email?.legacyStatusUuid).toBe(STATUS_UUID);
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
    const join = parseEmailOrganizationJoinFromRow(joinRows[0] ?? {});
    expect(join?.legacyEmailUuid).toBe(EMAIL_UUID);
    expect(join?.legacyOrganizationUuid).toBe(ORGANIZATION_UUID);
    expect(join?.legacyJoinUuid).toBe('B3F61CA7-AF9D-4616-B5ED-FAD1ED860069');
    expect(join?.legacyStatusUuid).toBe(STATUS_UUID);
    expect(join?.legacyOrganizationName).toBe('Tryzna Foundation');
  });
});
