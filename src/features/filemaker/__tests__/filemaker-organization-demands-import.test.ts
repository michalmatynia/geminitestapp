import { describe, expect, it } from 'vitest';

import {
  parseFilemakerLegacyOrganizationDemandRows,
  parseFilemakerLegacyOrganizationDemandWorkbookRows,
  parseOrganizationDemandFromRow,
} from '../filemaker-organization-demands-import.parser';

const LEGACY_ORGANIZATION_UUID = 'A01F00C1-E755-4816-B178-AB7E85B4A5D2';
const LEGACY_DEMAND_UUID = '66D05394-0731-44C7-B6D1-9A1442CD539E';
const LEGACY_VALUE_UUIDS = [
  '080E51E1-39C2-4B82-8DB0-5EF4D10C32E4',
  '88FFEE54-0326-4740-9471-E69A639782A8',
  '1E99D6CE-3ACC-4F8C-84A2-9C37A98358AD',
  'D0312F0C-0F7A-4E78-9553-594E03128B76',
] as const;

const HEADER = [
  'creationAccountName',
  'creationHostTimestamp',
  'creationTimestamp',
  'modificationAccountName',
  'modificationHostTimestamp',
  'modificationTimestamp',
  'option1',
  'option2',
  'option3',
  'option4',
  'UUID',
  'UUID_Related',
] as const;

const SAMPLE_ROW = [
  'Admin',
  '',
  '12/17/2016 03:42:24',
  'Admin',
  '',
  '12/17/2016 03:43:54',
  LEGACY_VALUE_UUIDS[0],
  '',
  '',
  '',
  LEGACY_DEMAND_UUID,
  LEGACY_ORGANIZATION_UUID,
] as const;

const FULL_SAMPLE_ROW = [
  ...SAMPLE_ROW.slice(0, 6),
  ...LEGACY_VALUE_UUIDS,
  LEGACY_DEMAND_UUID,
  LEGACY_ORGANIZATION_UUID,
] as const;

const createWorkbookBuffer = async (): Promise<Uint8Array> => {
  const XLSX = await import('xlsx');
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet([HEADER, SAMPLE_ROW]);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  return XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' }) as Uint8Array;
};

describe('FileMaker organization demand import parser', () => {
  it('parses demand rows from XLSX headers', async () => {
    const rows = await parseFilemakerLegacyOrganizationDemandWorkbookRows(
      await createWorkbookBuffer()
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]?.UUID).toBe(LEGACY_DEMAND_UUID);
    expect(rows[0]?.UUID_Related).toBe(LEGACY_ORGANIZATION_UUID);
  });

  it('parses headerless TAB demand exports', () => {
    const rows = parseFilemakerLegacyOrganizationDemandRows(FULL_SAMPLE_ROW.join('\t'));

    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual(
      expect.objectContaining({
        option1: LEGACY_VALUE_UUIDS[0],
        option4: LEGACY_VALUE_UUIDS[3],
        UUID: LEGACY_DEMAND_UUID,
        UUID_Related: LEGACY_ORGANIZATION_UUID,
      })
    );
  });

  it('parses FileMaker TAB rows with literal quotes in fields', () => {
    const rowWithQuote = [
      ...SAMPLE_ROW.slice(0, 6),
      'Demand "quoted" value ' + LEGACY_VALUE_UUIDS[0],
      ...SAMPLE_ROW.slice(7),
    ];
    const rows = parseFilemakerLegacyOrganizationDemandRows(
      [SAMPLE_ROW.join('\t'), rowWithQuote.join('\t')].join('\r')
    );

    expect(rows).toHaveLength(2);
    expect(rows[1]?.option1).toBe(`Demand "quoted" value ${LEGACY_VALUE_UUIDS[0]}`);
    expect(rows[1]?.UUID).toBe(LEGACY_DEMAND_UUID);
  });

  it('retains ordered value UUIDs and demand metadata', () => {
    const demand = parseOrganizationDemandFromRow(
      Object.fromEntries(HEADER.map((field, index) => [field, FULL_SAMPLE_ROW[index] ?? '']))
    );

    expect(demand).toEqual(
      expect.objectContaining({
        createdAt: '2016-12-17T03:42:24.000Z',
        createdBy: 'Admin',
        legacyOrganizationUuid: LEGACY_ORGANIZATION_UUID,
        legacyUuid: LEGACY_DEMAND_UUID,
        legacyValueUuids: [...LEGACY_VALUE_UUIDS],
        updatedAt: '2016-12-17T03:43:54.000Z',
        updatedBy: 'Admin',
      })
    );
  });
});
