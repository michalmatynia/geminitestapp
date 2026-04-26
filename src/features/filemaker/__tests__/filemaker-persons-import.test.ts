import { describe, expect, it } from 'vitest';

import {
  parseFilemakerLegacyPersonRows,
  parseFilemakerLegacyPersonWorkbookRows,
  parsePersonFromRow,
} from '../filemaker-persons-import.parser';

const LEGACY_PERSON_UUID = '62B82480-8A38-4205-8FEC-B302DE90C893';
const LEGACY_ORGANIZATION_UUIDS = [
  '5A92B676-26BD-4E54-BE5F-F618CB43617E',
  '71B3773A-909E-4F4E-98BD-F4F390E701A3',
] as const;

const HEADER = [
  'c_ema.FilterCount',
  'c_FullName',
  'c_org.FilterCount',
  'c_pho.FilterCount',
  'c_www.FilterCount',
  'Checked_1',
  'Checked_2',
  'Date of Birth',
  'DateAdded',
  'DateModified',
  'DefaultAddress_UUID',
  'DefaultBankAccount_UUID',
  'DisplayAddress_UUID',
  'DisplayBankAccount_UUID',
  'ema_FILTER',
  'Email Parser',
  'FirstName',
  'key_ema.PORTALFILTER',
  'key_org.PORTALFILTER',
  'key_pho.PORTALFILTER',
  'key_www.PORTALFILTER',
  'LastName',
  'ModifiedBy',
  'org_FILTER',
  'Parent_UUID_FK',
  'pho_FILTER',
  'UUID',
  'www_FILTER',
] as const;

const SAMPLE_ROW = [
  '1',
  'Jan Szarafiński',
  '2',
  '',
  '',
  '1',
  '',
  '04/19/1980',
  '04/20/2015',
  '02/15/2017 16:09:11',
  '7DF7ACC2-B5DB-4E43-A0DA-330E16C7B78F',
  '396F3594-812A-497F-A30E-57FA9B3DEFCB',
  '7DF7ACC2-B5DB-4E43-A0DA-330E16C7B78F',
  '396F3594-812A-497F-A30E-57FA9B3DEFCB',
  'person@example.test',
  '',
  'Jan',
  'email-filter-id',
  LEGACY_ORGANIZATION_UUIDS.join('\x0B'),
  '',
  '',
  'Szarafiński',
  'Admin',
  'Ignis',
  '',
  '',
  LEGACY_PERSON_UUID,
  '',
] as const;

const createWorkbookBuffer = async (): Promise<Uint8Array> => {
  const XLSX = await import('xlsx');
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet([HEADER, SAMPLE_ROW]);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  return XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' }) as Uint8Array;
};

describe('FileMaker person import parser', () => {
  it('parses person rows from XLSX headers', async () => {
    const rows = await parseFilemakerLegacyPersonWorkbookRows(await createWorkbookBuffer());

    expect(rows).toHaveLength(1);
    expect(rows[0]?.UUID).toBe(LEGACY_PERSON_UUID);
    expect(rows[0]?.c_FullName).toBe('Jan Szarafiński');
  });

  it('parses headerless TAB person exports', () => {
    const rows = parseFilemakerLegacyPersonRows(SAMPLE_ROW.join('\t'));

    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual(
      expect.objectContaining({
        FirstName: 'Jan',
        LastName: 'Szarafiński',
        UUID: LEGACY_PERSON_UUID,
        'key_org.PORTALFILTER': LEGACY_ORGANIZATION_UUIDS.join('\x0B'),
      })
    );
  });

  it('parses FileMaker TAB rows with literal quotes in fields', () => {
    const quotedRow = [
      ...SAMPLE_ROW.slice(0, 1),
      'Jan "Janko" Szarafiński',
      ...SAMPLE_ROW.slice(2),
    ];
    const rows = parseFilemakerLegacyPersonRows(
      [SAMPLE_ROW.join('\t'), quotedRow.join('\t')].join('\r')
    );

    expect(rows).toHaveLength(2);
    expect(rows[1]?.c_FullName).toBe('Jan "Janko" Szarafiński');
    expect(rows[1]?.UUID).toBe(LEGACY_PERSON_UUID);
  });

  it('retains legacy person metadata and organization UUID links', () => {
    const person = parsePersonFromRow(
      Object.fromEntries(HEADER.map((field, index) => [field, SAMPLE_ROW[index] ?? '']))
    );

    expect(person).toEqual(
      expect.objectContaining({
        checked1: true,
        createdAt: '2015-04-20T00:00:00.000Z',
        dateOfBirth: '1980-04-19',
        firstName: 'Jan',
        fullName: 'Jan Szarafiński',
        lastName: 'Szarafiński',
        legacyDefaultAddressUuid: '7DF7ACC2-B5DB-4E43-A0DA-330E16C7B78F',
        legacyDefaultBankAccountUuid: '396F3594-812A-497F-A30E-57FA9B3DEFCB',
        legacyOrganizationUuids: [...LEGACY_ORGANIZATION_UUIDS],
        legacyUuid: LEGACY_PERSON_UUID,
        updatedAt: '2017-02-15T16:09:11.000Z',
        updatedBy: 'Admin',
      })
    );
  });
});
