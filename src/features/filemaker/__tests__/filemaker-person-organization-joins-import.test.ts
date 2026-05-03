import { describe, expect, it } from 'vitest';

import {
  parseFilemakerLegacyPersonOrganizationJoinWorkbookRows,
  parsePersonOrganizationJoinFromRow,
} from '../filemaker-person-organization-joins-import.parser';

const LEGACY_ORGANIZATION_UUID = 'DA8B6F66-9493-4EB9-895A-0FBA9FA4EB58';
const LEGACY_PERSON_UUID = '2C01CE20-9999-41A7-B55B-5A232567B57E';
const LEGACY_ROLE_UUID = 'E0708EF5-2319-4276-89BE-CB2A5205839C';
const LEGACY_JOIN_UUID = '207B1C6A-20AD-4726-9219-2265F29B122B';

const HEADER = [
  'NameOrganisation_UUID_FK',
  'NamePerson_UUID_FK',
  'OrganisationRole',
  'UUID',
] as const;

const SAMPLE_ROW = [
  LEGACY_ORGANIZATION_UUID,
  LEGACY_PERSON_UUID,
  LEGACY_ROLE_UUID,
  LEGACY_JOIN_UUID,
] as const;

const createWorkbookBuffer = async (): Promise<Uint8Array> => {
  const XLSX = await import('xlsx');
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet([HEADER, SAMPLE_ROW]);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  return XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' }) as Uint8Array;
};

describe('FileMaker person-organization join import parser', () => {
  it('parses person and organization legacy UUIDs from XLSX headers', async () => {
    const rows = await parseFilemakerLegacyPersonOrganizationJoinWorkbookRows(
      await createWorkbookBuffer()
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]?.NameOrganisation_UUID_FK).toBe(LEGACY_ORGANIZATION_UUID);
    expect(rows[0]?.NamePerson_UUID_FK).toBe(LEGACY_PERSON_UUID);
  });

  it('normalizes a join row into legacy relationship references', () => {
    const join = parsePersonOrganizationJoinFromRow(
      Object.fromEntries(HEADER.map((field, index) => [field, SAMPLE_ROW[index] ?? '']))
    );

    expect(join).toEqual({
      legacyOrganizationUuid: LEGACY_ORGANIZATION_UUID,
      legacyPersonUuid: LEGACY_PERSON_UUID,
      legacyRoleUuid: LEGACY_ROLE_UUID,
      legacyUuid: LEGACY_JOIN_UUID,
    });
  });
});
