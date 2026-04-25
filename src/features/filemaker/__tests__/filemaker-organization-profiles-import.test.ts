import { describe, expect, it } from 'vitest';

import {
  parseFilemakerLegacyOrganizationProfileRows,
  parseFilemakerLegacyOrganizationProfileWorkbookRows,
  parseOrganizationProfileFromRow,
} from '../filemaker-organization-profiles-import.parser';

const LEGACY_ORGANIZATION_UUID = 'DB492846-D7F8-4D6B-8B5F-39104DD497E8';
const LEGACY_PROFILE_UUID = '4D8617FF-F3FF-4E21-9840-609B84F8B190';
const LEGACY_VALUE_UUIDS = [
  '0F69F6A4-D020-4590-B212-0866A48EBE4A',
  '1615E0DE-4403-4240-9B5A-17837CAD2F2D',
  '78FAEA21-911E-4371-A55F-CB78A37B5532',
  '41ABB160-D76E-4554-B6A9-A309357E197C',
];

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
  'option5',
  'option6',
  'option7',
  'UUID',
  'UUID_Related',
] as const;

const SAMPLE_ROW = [
  'Admin',
  '',
  '11/18/2016 14:36:02',
  'Admin',
  '',
  '02/25/2018 17:10:38',
  ...LEGACY_VALUE_UUIDS,
  '',
  '',
  '',
  LEGACY_PROFILE_UUID,
  LEGACY_ORGANIZATION_UUID,
] as const;

const createWorkbookBuffer = async (): Promise<Uint8Array> => {
  const XLSX = await import('xlsx');
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet([HEADER, SAMPLE_ROW]);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  return XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' }) as Uint8Array;
};

describe('FileMaker organization profile import parser', () => {
  it('parses profile rows from XLSX headers', async () => {
    const rows = await parseFilemakerLegacyOrganizationProfileWorkbookRows(
      await createWorkbookBuffer()
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]?.UUID).toBe(LEGACY_PROFILE_UUID);
    expect(rows[0]?.UUID_Related).toBe(LEGACY_ORGANIZATION_UUID);
  });

  it('parses headerless TAB profile exports', () => {
    const rows = parseFilemakerLegacyOrganizationProfileRows(SAMPLE_ROW.join('\t'));

    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual(
      expect.objectContaining({
        option1: LEGACY_VALUE_UUIDS[0],
        option4: LEGACY_VALUE_UUIDS[3],
        UUID: LEGACY_PROFILE_UUID,
        UUID_Related: LEGACY_ORGANIZATION_UUID,
      })
    );
  });

  it('retains ordered value UUIDs and profile metadata', () => {
    const profile = parseOrganizationProfileFromRow(
      Object.fromEntries(HEADER.map((field, index) => [field, SAMPLE_ROW[index] ?? '']))
    );

    expect(profile).toEqual(
      expect.objectContaining({
        createdAt: '2016-11-18T14:36:02.000Z',
        createdBy: 'Admin',
        legacyOrganizationUuid: LEGACY_ORGANIZATION_UUID,
        legacyUuid: LEGACY_PROFILE_UUID,
        legacyValueUuids: LEGACY_VALUE_UUIDS,
        updatedAt: '2018-02-25T17:10:38.000Z',
        updatedBy: 'Admin',
      })
    );
  });
});
