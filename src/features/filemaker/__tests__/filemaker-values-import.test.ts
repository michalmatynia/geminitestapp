import { describe, expect, it } from 'vitest';

import {
  createDefaultFilemakerDatabase,
  importFilemakerLegacyValuesExport,
  parseFilemakerLegacyValueRows,
} from '../settings';
import type { FilemakerLegacyValueImportIdKind } from '../settings';

const YEAR_1980_UUID = '55EA665E-0431-4E17-A689-43F539D6B58E';
const YEAR_1981_UUID = '7630D052-64CF-4C76-9C80-D2A1FC3F85C9';
const DATE_YEARS_UUID = 'A7F3C62D-3A8F-41C2-B32A-2C90A5D02D16';
const THEME_UUID = 'F0019FC6-B5DA-4C36-B5A2-8278B0FF00D4';

const makeModernId = (kind: FilemakerLegacyValueImportIdKind, legacyKey: string): string =>
  `modern-${kind}-${legacyKey.replace(/[^A-Za-z0-9]/g, '').slice(0, 12).toLowerCase()}`;

const exportText = [
  [
    'UUID_Parent',
    'UUID',
    'Pre_ID',
    'Joined_ID',
    'modificationTimestamp',
    'modificationHostTimestamp',
    'modificationAccountName',
    'english',
    'creationTimestamp',
    'creationHostTimestamp',
    'creationAccountName',
    'SerialValue',
    'SortValue',
    'UUID_List',
    'zzc_display_text',
    'zzc_display_uuid',
    'zzc_valuelist_text',
    'zzc_valuelist_uuid',
    'iValues Builder Child::english',
    'iValues Builder Child::UUID',
    'iValues Builder List::English',
    'iValues Builder List::UUID',
    'iValues Builder Parent::english',
  ].join('\t'),
  [
    '"9DFEF355-6315-4435-9057-149A8A000AA0\nAB005EE7-8842-4D8C-8184-171365F4EA7B\nAB4FAD7D-E158-4DDC-B138-1FB57BDAC7CD"',
    YEAR_1980_UUID,
    '',
    '',
    '12/07/2016 19:13:06',
    '12/07/2016 19:13:06',
    'Admin',
    '1980',
    '01/16/2013 16:39:39',
    'Admin',
    '1/16/2013 4:39:39 PM',
    '1',
    '',
    DATE_YEARS_UUID,
    '',
    '',
    '',
    '',
    '',
    '',
    'date.years',
    DATE_YEARS_UUID,
    '',
  ].join('\t'),
  [
    '"9DFEF355-6315-4435-9057-149A8A000AA0\nAB005EE7-8842-4D8C-8184-171365F4EA7B\nAB4FAD7D-E158-4DDC-B138-1FB57BDAC7CD"',
    YEAR_1981_UUID,
    '',
    '',
    '12/07/2016 19:14:10',
    '12/07/2016 19:14:10',
    'Admin',
    '1981',
    '01/16/2013 16:39:39',
    'Admin',
    '1/16/2013 4:39:39 PM',
    '2',
    '',
    `"${DATE_YEARS_UUID}\n${THEME_UUID}"`,
    '',
    '',
    '',
    '',
    '',
    '',
    'date.years',
    DATE_YEARS_UUID,
    '',
  ].join('\t'),
  [
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    'theme.3',
    THEME_UUID,
    '',
  ].join('\t'),
].join('\n');

const csvExportText = [
  [
    'UUID_Parent',
    'UUID',
    'english',
    'SerialValue',
    'UUID_List',
    'iValues Builder List::English',
    'iValues Builder List::UUID',
  ].join(','),
  [
    '',
    YEAR_1980_UUID,
    '1980',
    '1',
    DATE_YEARS_UUID,
    'date.years',
    DATE_YEARS_UUID,
  ].join(','),
  [
    YEAR_1980_UUID,
    YEAR_1981_UUID,
    '1981',
    '2',
    `"${DATE_YEARS_UUID}\n${THEME_UUID}"`,
    'date.years',
    DATE_YEARS_UUID,
  ].join(','),
].join('\n');

describe('FileMaker legacy value import', () => {
  it('parses FileMaker TSV exports with quoted portal newlines', () => {
    const rows = parseFilemakerLegacyValueRows(exportText);

    expect(rows).toHaveLength(3);
    expect(rows[0]?.['UUID']).toBe(YEAR_1980_UUID);
    expect(rows[0]?.['UUID_Parent']).toContain('AB005EE7-8842-4D8C-8184-171365F4EA7B');
    expect(rows[2]?.['iValues Builder List::English']).toBe('theme.3');
  });

  it('imports comma-separated CSV exports from FileMaker', () => {
    const rows = parseFilemakerLegacyValueRows(csvExportText);
    expect(rows).toHaveLength(2);
    expect(rows[1]?.['UUID_List']).toContain(THEME_UUID);

    const result = importFilemakerLegacyValuesExport(
      createDefaultFilemakerDatabase(),
      csvExportText,
      { createId: makeModernId }
    );
    const parent = result.database.values.find((value) => value.legacyUuid === YEAR_1980_UUID);
    const child = result.database.values.find((value) => value.legacyUuid === YEAR_1981_UUID);

    expect(result.importedValueCount).toBe(2);
    expect(result.importedParameterCount).toBe(2);
    expect(child?.parentId).toBe(parent?.id);
    expect(child?.legacyListUuids).toEqual([DATE_YEARS_UUID, THEME_UUID]);
  });

  it('imports values with modern ids and retains legacy UUIDs for compatibility', () => {
    const result = importFilemakerLegacyValuesExport(createDefaultFilemakerDatabase(), exportText, {
      createId: makeModernId,
    });

    expect(result.importedValueCount).toBe(2);
    expect(result.importedParameterCount).toBe(2);
    expect(result.importedLinkCount).toBe(3);

    const database = result.database;
    const year1980 = database.values.find((value) => value.legacyUuid === YEAR_1980_UUID);
    const year1981 = database.values.find((value) => value.legacyUuid === YEAR_1981_UUID);
    expect(year1980?.id).toBe(makeModernId('value', YEAR_1980_UUID));
    expect(year1980?.id).not.toBe(YEAR_1980_UUID);
    expect(year1980?.label).toBe('1980');
    expect(year1980?.legacyParentUuids).toEqual([
      '9DFEF355-6315-4435-9057-149A8A000AA0',
      'AB005EE7-8842-4D8C-8184-171365F4EA7B',
      'AB4FAD7D-E158-4DDC-B138-1FB57BDAC7CD',
    ]);
    expect(year1981?.legacyListUuids).toEqual([DATE_YEARS_UUID, THEME_UUID]);

    const dateYears = database.valueParameters.find(
      (parameter) => parameter.legacyUuid === DATE_YEARS_UUID
    );
    const theme = database.valueParameters.find((parameter) => parameter.legacyUuid === THEME_UUID);
    expect(dateYears?.id).toBe(makeModernId('value-parameter', DATE_YEARS_UUID));
    expect(dateYears?.label).toBe('date.years');
    expect(theme?.label).toBe('theme.3');

    const year1981Links = database.valueParameterLinks.filter(
      (link) => link.valueId === year1981?.id
    );
    expect(year1981Links.map((link) => link.legacyParameterUuid).sort()).toEqual(
      [DATE_YEARS_UUID, THEME_UUID].sort()
    );
  });

  it('resolves parentId through retained legacy parent UUIDs when the parent is imported', () => {
    const parentUuid = '11111111-1111-4111-8111-111111111111';
    const childUuid = '22222222-2222-4222-8222-222222222222';
    const hierarchyExport = [
      'UUID_Parent\tUUID\tenglish\tSerialValue\tiValues Builder List::English\tiValues Builder List::UUID',
      `\t${parentUuid}\tRoot\t1\t\t`,
      `${parentUuid}\t${childUuid}\tChild\t2\t\t`,
    ].join('\n');

    const result = importFilemakerLegacyValuesExport(
      createDefaultFilemakerDatabase(),
      hierarchyExport,
      { createId: makeModernId }
    );
    const parent = result.database.values.find((value) => value.legacyUuid === parentUuid);
    const child = result.database.values.find((value) => value.legacyUuid === childUuid);

    expect(parent?.id).toBe(makeModernId('value', parentUuid));
    expect(child?.parentId).toBe(parent?.id);
  });
});
