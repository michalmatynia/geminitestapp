import { describe, expect, it } from 'vitest';

import {
  parseAddressFromRow,
  parseFilemakerLegacyAddressRows,
  parseFilemakerLegacyAddressWorkbookRows,
} from '../filemaker-addresses-import.parser';

const LEGACY_ADDRESS_UUID = 'C425363F-B976-4082-A952-D6D09BD55B22';
const LEGACY_COUNTRY_UUID = '889CD8F7-6E4E-4074-8CA1-AF684038B7D1';
const LEGACY_PARENT_UUID = 'CD68E22E-4347-45C2-BC8D-6C02BF67EADC';

const createWorkbookBuffer = async (): Promise<Uint8Array> => {
  const XLSX = await import('xlsx');
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet([
    [
      'Address_City',
      'Address_No',
      'Address_Region',
      'Address_Street',
      'Address_ZIP',
      'Category',
      'Country_UUID_FK',
      'DateAdded',
      'DateModified',
      'ModifiedBy',
      'Parent_UUID_FK',
      'UUID',
    ],
    [
      'Szczecin',
      '71/2',
      'Zachodniopomorskie',
      'Fioletowa',
      '70-781',
      ' Default',
      LEGACY_COUNTRY_UUID,
      '',
      '12/17/2018 22:41:47',
      'Admin',
      LEGACY_PARENT_UUID,
      LEGACY_ADDRESS_UUID,
    ],
  ]);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  return XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' }) as Uint8Array;
};

describe('FileMaker legacy address import parser', () => {
  it('parses address rows from an XLSX workbook with headers', async () => {
    const rows = await parseFilemakerLegacyAddressWorkbookRows(await createWorkbookBuffer());

    expect(rows).toHaveLength(1);
    expect(rows[0]?.['UUID']).toBe(LEGACY_ADDRESS_UUID);
    expect(rows[0]?.['Parent_UUID_FK']).toBe(LEGACY_PARENT_UUID);
  });

  it('parses headerless FileMaker TAB address exports', () => {
    const rows = parseFilemakerLegacyAddressRows(
      [
        [
          'Szczecin',
          '71/2',
          'Zachodniopomorskie',
          'Fioletowa',
          '70-781',
          'Default',
          LEGACY_COUNTRY_UUID,
          '',
          '12/17/2018 10:41:47 PM',
          'Admin',
          LEGACY_PARENT_UUID,
          LEGACY_ADDRESS_UUID,
        ].join('\t'),
      ].join('\r')
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual(
      expect.objectContaining({
        Address_City: 'Szczecin',
        Address_No: '71/2',
        Country_UUID_FK: LEGACY_COUNTRY_UUID,
        Parent_UUID_FK: LEGACY_PARENT_UUID,
        UUID: LEGACY_ADDRESS_UUID,
      })
    );
  });

  it('retains address, parent, and country UUIDs while normalizing address fields', () => {
    const address = parseAddressFromRow({
      Address_City: 'Szczecin',
      Address_No: '71/2',
      Address_Region: 'Zachodniopomorskie',
      Address_Street: 'Fioletowa',
      Address_ZIP: '70-781',
      Category: ' Default',
      Country_UUID_FK: LEGACY_COUNTRY_UUID,
      DateAdded: '',
      DateModified: '12/17/2018 22:41:47',
      ModifiedBy: 'Admin',
      Parent_UUID_FK: LEGACY_PARENT_UUID,
      UUID: LEGACY_ADDRESS_UUID,
    });

    expect(address).toEqual(
      expect.objectContaining({
        category: 'Default',
        city: 'Szczecin',
        legacyCountryUuid: LEGACY_COUNTRY_UUID,
        legacyParentUuid: LEGACY_PARENT_UUID,
        legacyUuid: LEGACY_ADDRESS_UUID,
        postalCode: '70-781',
        region: 'Zachodniopomorskie',
        street: 'Fioletowa',
        streetNumber: '71/2',
        updatedAt: '2018-12-17T22:41:47.000Z',
        updatedBy: 'Admin',
      })
    );
  });
});
