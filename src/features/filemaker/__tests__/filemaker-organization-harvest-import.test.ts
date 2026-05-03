import { describe, expect, it } from 'vitest';

import {
  parseFilemakerLegacyOrganizationHarvestRows,
  parseFilemakerLegacyOrganizationHarvestWorkbookRows,
  parseOrganizationHarvestProfileFromRow,
} from '../filemaker-organization-harvest-import.parser';

const LEGACY_HARVEST_UUID = '9E9D9906-7792-4A1F-B21E-4B0A1CD45249';
const LEGACY_ORGANIZATION_UUID = 'F8309380-8529-4388-B645-736776D53DBB';

const HEADER = [
  'creationAccountName',
  'creationHostTimestamp',
  'creationTimestamp',
  'modificationAccountName',
  'modificationHostTimestamp',
  'modificationTimestamp',
  'Owner',
  'PageDescription',
  'PageKeywords',
  'PageTitle',
  'Parent_UUID_FK',
  'UUID',
] as const;

const SAMPLE_ROW = [
  'Admin',
  '',
  '04/18/2017 00:50:29',
  'Admin',
  '',
  '04/18/2017 00:50:57',
  'zamowienie@sanechem.com.pl',
  'Gdansk',
  'hurtownie Warszawa',
  'Dystrybutor artykulów spozywczych',
  LEGACY_ORGANIZATION_UUID,
  LEGACY_HARVEST_UUID,
] as const;

const createWorkbookBuffer = async (): Promise<Uint8Array> => {
  const XLSX = await import('xlsx');
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet([HEADER, SAMPLE_ROW]);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  return XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' }) as Uint8Array;
};

describe('FileMaker organization harvest import parser', () => {
  it('parses harvest rows from XLSX headers', async () => {
    const rows = await parseFilemakerLegacyOrganizationHarvestWorkbookRows(
      await createWorkbookBuffer()
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]?.UUID).toBe(LEGACY_HARVEST_UUID);
    expect(rows[0]?.Parent_UUID_FK).toBe(LEGACY_ORGANIZATION_UUID);
  });

  it('parses headerless TAB harvest exports', () => {
    const rows = parseFilemakerLegacyOrganizationHarvestRows(SAMPLE_ROW.join('\t'));

    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual(
      expect.objectContaining({
        Owner: 'zamowienie@sanechem.com.pl',
        PageKeywords: 'hurtownie Warszawa',
        PageTitle: 'Dystrybutor artykulów spozywczych',
        Parent_UUID_FK: LEGACY_ORGANIZATION_UUID,
        UUID: LEGACY_HARVEST_UUID,
      })
    );
  });

  it('parses FileMaker TAB rows with literal quotes in fields', () => {
    const quotedTitleRow = [
      ...SAMPLE_ROW.slice(0, 9),
      'Dystrybutor "premium" artykulów',
      ...SAMPLE_ROW.slice(10),
    ];
    const rows = parseFilemakerLegacyOrganizationHarvestRows(
      [SAMPLE_ROW.join('\t'), quotedTitleRow.join('\t')].join('\r')
    );

    expect(rows).toHaveLength(2);
    expect(rows[1]?.PageTitle).toBe('Dystrybutor "premium" artykulów');
    expect(rows[1]?.UUID).toBe(LEGACY_HARVEST_UUID);
  });

  it('retains scrape metadata and legacy organization linkage', () => {
    const profile = parseOrganizationHarvestProfileFromRow(
      Object.fromEntries(HEADER.map((field, index) => [field, SAMPLE_ROW[index] ?? '']))
    );

    expect(profile).toEqual(
      expect.objectContaining({
        createdAt: '2017-04-18T00:50:29.000Z',
        createdBy: 'Admin',
        legacyOrganizationUuid: LEGACY_ORGANIZATION_UUID,
        legacyUuid: LEGACY_HARVEST_UUID,
        owner: 'zamowienie@sanechem.com.pl',
        pageDescription: 'Gdansk',
        pageKeywords: 'hurtownie Warszawa',
        pageTitle: 'Dystrybutor artykulów spozywczych',
        updatedAt: '2017-04-18T00:50:57.000Z',
        updatedBy: 'Admin',
      })
    );
  });
});
