import { describe, expect, it } from 'vitest';

import { parseFilemakerLegacyOrganiserRows } from '../filemaker-organisers-import.parser';

const PARENT_UUID = '006D3553-EE22-46CB-B790-87B27C0038FF';
const CHILD_UUID = '0C83B6A4-1BF8-4CE7-8303-0749C60666D0';
const DEFAULT_ADDRESS_UUID = '99968074-1E6E-4092-86F7-92A2C9B62E8A';
const DISPLAY_ADDRESS_UUID = '44358C40-799B-47C1-B087-09F5EDF9C36D';
const DEFAULT_BANK_UUID = '8785A87C-EA12-4DAD-8960-EDE8667F6942';
const DISPLAY_BANK_UUID = 'D5548692-3090-40C4-AEB7-2A8CF8EF3C7F';

const organiserExportText = [
  [
    'EmailBook.Display Org::Email',
    'Coop_Status',
    'DATE_Established',
    'DateAdded',
    'DateModified',
    'DefaultAddress_UUID',
    'DefaultBankAccount_UUID',
    'DisplayAddress_UUID',
    'DisplayBankAccount_UUID',
    'ema_FILTER',
    'Email Parser',
    'eve_FILTER',
    'key_ema.PORTALFILTER',
    'ModifiedBy',
    'Name',
    'Parent_UUID_FK',
    'pho_FILTER',
    'UUID',
    'www_FILTER',
    'Address Default Org::UUID',
    'BankAccount Create Org::No_BankAccount',
  ].join('\t'),
  [
    'parent@example.com',
    'Active',
    '1/2/2020',
    '02/06/2016 11:55:03',
    '08/15/2024 04:01:42',
    DISPLAY_ADDRESS_UUID,
    '',
    DISPLAY_ADDRESS_UUID,
    '',
    'placeholder email',
    'parser text',
    'placeholder event',
    'placeholder portal',
    'Admin',
    'Permanent Tsb',
    '',
    'placeholder phone',
    PARENT_UUID,
    'placeholder web',
    'RELATED-ADDRESS-UUID',
    'RELATED-BANK-NO',
  ].join('\t'),
  [
    'child@example.com',
    'Prospect',
    '',
    '02/07/2016 11:55:03',
    '08/16/2024 04:01:42',
    DEFAULT_ADDRESS_UUID,
    DEFAULT_BANK_UUID,
    DEFAULT_ADDRESS_UUID,
    DISPLAY_BANK_UUID,
    'placeholder email',
    '',
    '',
    '',
    'Admin',
    'QB - Monika Zajac',
    PARENT_UUID,
    '',
    CHILD_UUID,
    'placeholder web',
    DEFAULT_ADDRESS_UUID,
    'PL89 1020 4812 0000 0102 0107 5605',
  ].join('\t'),
].join('\n');

const headerlessOrganiserCsvText = [
  [
    '',
    '',
    '',
    '11/3/2024 12:18:53 PM',
    DISPLAY_ADDRESS_UUID,
    '',
    DISPLAY_ADDRESS_UUID,
    '',
    'Admin',
    'Permanent Tsb',
    '',
    PARENT_UUID,
  ],
  [
    '',
    '',
    '',
    '8/15/2024 4:06:10 AM',
    DEFAULT_ADDRESS_UUID,
    DEFAULT_BANK_UUID,
    DEFAULT_ADDRESS_UUID,
    DEFAULT_BANK_UUID,
    'Admin',
    'QB - Monika Zając',
    '',
    CHILD_UUID,
  ],
  [
    '',
    '',
    '4/18/2015',
    '9/26/2017 4:35:36 AM',
    '7DD8DCBE-9387-44C1-99CD-9458F4E6740D',
    '',
    '7DD8DCBE-9387-44C1-99CD-9458F4E6740D',
    '',
    'Admin',
    'Trollabanin',
    '',
    '6319AD50-CB0A-43E6-9AEA-5D6B1E443363',
  ],
]
  .map((row: string[]): string => row.map((value: string): string => `"${value}"`).join(','))
  .join('\n');
const headerlessOrganiserCsvTextWithPreamble = [
  '',
  'Legacy FileMaker Organisers',
  headerlessOrganiserCsvText,
].join('\n');
const classicMacHeaderlessOrganiserCsvText = headerlessOrganiserCsvText.replaceAll('\n', '\r');
const semicolonHeaderlessOrganiserCsvText = headerlessOrganiserCsvText.replaceAll('","', '";"');

describe('FileMaker legacy organiser parser', () => {
  it('parses organiser rows from a FileMaker TSV export', () => {
    const rows = parseFilemakerLegacyOrganiserRows(organiserExportText);

    expect(rows).toHaveLength(2);
    expect(rows[0]?.['Name']).toBe('Permanent Tsb');
    expect(rows[1]?.['EmailBook.Display Org::Email']).toBe('child@example.com');
  });

  it('parses 12-column headerless FileMaker organiser CSV exports', () => {
    const rows = parseFilemakerLegacyOrganiserRows(headerlessOrganiserCsvText);

    expect(rows).toHaveLength(3);
    expect(rows[0]?.['Name']).toBe('Permanent Tsb');
    expect(rows[0]?.['DateModified']).toBe('11/3/2024 12:18:53 PM');
    expect(rows[1]?.['DefaultBankAccount_UUID']).toBe(DEFAULT_BANK_UUID);
    expect(rows[2]?.['DateAdded']).toBe('4/18/2015');
    expect(rows[2]?.['UUID']).toBe('6319AD50-CB0A-43E6-9AEA-5D6B1E443363');
  });

  it('parses headerless organiser CSV exports with blank lines or title rows before data', () => {
    const rows = parseFilemakerLegacyOrganiserRows(headerlessOrganiserCsvTextWithPreamble);

    expect(rows).toHaveLength(3);
    expect(rows[0]?.['Name']).toBe('Permanent Tsb');
    expect(rows[1]?.['UUID']).toBe(CHILD_UUID);
  });

  it('parses semicolon-delimited headerless organiser CSV exports', () => {
    const rows = parseFilemakerLegacyOrganiserRows(semicolonHeaderlessOrganiserCsvText);

    expect(rows).toHaveLength(3);
    expect(rows[0]?.['Name']).toBe('Permanent Tsb');
    expect(rows[1]?.['UUID']).toBe(CHILD_UUID);
  });

  it('parses CR-delimited headerless organiser CSV exports', () => {
    const rows = parseFilemakerLegacyOrganiserRows(classicMacHeaderlessOrganiserCsvText);

    expect(rows).toHaveLength(3);
    expect(rows[0]?.['Name']).toBe('Permanent Tsb');
    expect(rows[1]?.['UUID']).toBe(CHILD_UUID);
  });
});
