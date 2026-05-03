import { describe, expect, it } from 'vitest';

import {
  parseEventFromRow,
  parseEventOrganizationJoinFromRow,
  parseFilemakerLegacyEventOrganizationJoinWorkbookRows,
  parseFilemakerLegacyEventRows,
  parseFilemakerLegacyEventWorkbookRows,
} from '../filemaker-events-import.parser';

const LEGACY_EVENT_UUID = 'A19A5D87-C58D-43CB-9D76-2A5DF2DDB60C';
const LEGACY_EVENT_INSTANCE_UUID = '23F0D6A6-D692-4E22-AEA2-0FFD9F3FFD73';
const LEGACY_ADDRESS_UUID = '53FBEBB9-EFBB-43CD-A43A-6635820CB59B';
const LEGACY_HOW_OFTEN_UUID = 'ED0B4091-1124-43CD-AC36-EC9BF46980F0';
const LEGACY_ORGANIZATION_UUID = '3AC83AC2-BB5D-454A-B0F5-0D08B3684F47';
const LEGACY_JOIN_UUID = '39B6F33E-0678-4BEE-B418-81B752D6A1D4';

const EVENT_HEADER = [
  'c_LastDate_Event_Inst',
  'c_LastID_Event_Inst',
  'c_org.FilterCount',
  'c_www.FilterCount',
  'Checked_1',
  'Checked_2',
  'Coop_Status',
  'Current_Day',
  'Current_Week No.',
  'DateAdded',
  'DateModified',
  'DefaultAddress_UUID',
  'Discontinued',
  'DisplayAddress_UUID',
  'EventStart',
  'HowOften',
  'key_org.PORTALFILTER',
  'key_www.PORTALFILTER',
  'Length_Day',
  'ModifiedBy',
  'Move_day',
  'Name',
  'org_FILTER',
  'Parent_UUID_FK',
  'Registration_Month',
  'UUID',
  'www_FILTER',
  'www_FILTERCount',
] as const;

const EVENT_ROW = [
  '9/12/2025',
  LEGACY_EVENT_INSTANCE_UUID,
  '1',
  '',
  '1',
  '',
  'active',
  '6 Friday',
  '37',
  '1/23/2016 8:56:42 PM',
  '12/4/2018 2:22:28 PM',
  LEGACY_ADDRESS_UUID,
  '',
  LEGACY_ADDRESS_UUID,
  '9/12/2014',
  LEGACY_HOW_OFTEN_UUID,
  LEGACY_ORGANIZATION_UUID,
  '',
  '2',
  'Admin',
  '',
  'Festiwal Średniowieczny',
  'Zwickau',
  '',
  'A3262437-8B7B-440A-A6F4-952A0C5915AE',
  LEGACY_EVENT_UUID,
  '',
  '',
] as const;

const JOIN_HEADER = ['NameEvent_UUID_FK', 'NameOrganisation_UUID_FK', 'UUID'] as const;
const JOIN_ROW = [LEGACY_EVENT_UUID, LEGACY_ORGANIZATION_UUID, LEGACY_JOIN_UUID] as const;

const createWorkbookBuffer = async (rows: readonly (readonly string[])[]): Promise<Uint8Array> => {
  const XLSX = await import('xlsx');
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  return XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' }) as Uint8Array;
};

describe('FileMaker event import parser', () => {
  it('parses headerless TAB event exports', () => {
    const rows = parseFilemakerLegacyEventRows(EVENT_ROW.join('\t'));

    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual(
      expect.objectContaining({
        Name: 'Festiwal Średniowieczny',
        UUID: LEGACY_EVENT_UUID,
        DefaultAddress_UUID: LEGACY_ADDRESS_UUID,
      })
    );
  });

  it('parses event rows from XLSX headers', async () => {
    const rows = await parseFilemakerLegacyEventWorkbookRows(
      await createWorkbookBuffer([EVENT_HEADER, EVENT_ROW])
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]?.Name).toBe('Festiwal Średniowieczny');
    expect(rows[0]?.UUID).toBe(LEGACY_EVENT_UUID);
  });

  it('retains legacy event metadata', () => {
    const event = parseEventFromRow(
      Object.fromEntries(EVENT_HEADER.map((field, index) => [field, EVENT_ROW[index] ?? '']))
    );

    expect(event).toEqual(
      expect.objectContaining({
        checked1: true,
        createdAt: '2016-01-23T20:56:42.000Z',
        currentDay: '6 Friday',
        currentWeekNumber: 37,
        eventName: 'Festiwal Średniowieczny',
        eventStartDate: '2014-09-12',
        lastEventInstanceDate: '2025-09-12',
        legacyDefaultAddressUuid: LEGACY_ADDRESS_UUID,
        legacyDisplayAddressUuid: LEGACY_ADDRESS_UUID,
        legacyHowOftenUuid: LEGACY_HOW_OFTEN_UUID,
        legacyLastEventInstanceUuid: LEGACY_EVENT_INSTANCE_UUID,
        legacyUuid: LEGACY_EVENT_UUID,
        lengthDay: 2,
        organizationFilter: 'Zwickau',
        updatedAt: '2018-12-04T14:22:28.000Z',
        updatedBy: 'Admin',
      })
    );
  });

  it('parses event-organisation join rows from XLSX headers', async () => {
    const rows = await parseFilemakerLegacyEventOrganizationJoinWorkbookRows(
      await createWorkbookBuffer([JOIN_HEADER, JOIN_ROW])
    );
    const join = parseEventOrganizationJoinFromRow(rows[0] ?? {});

    expect(join).toEqual({
      legacyEventUuid: LEGACY_EVENT_UUID,
      legacyOrganizationUuid: LEGACY_ORGANIZATION_UUID,
      legacyUuid: LEGACY_JOIN_UUID,
    });
  });
});
