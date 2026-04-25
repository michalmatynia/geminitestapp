import Papa from 'papaparse';

import { normalizeString } from './filemaker-settings.helpers';
import { parseLegacyOrganiserTimestamp } from './filemaker-organisers-import.parser';
import { normalizeLegacyUuid } from './filemaker-values-import.parser';

const FILEMAKER_LINE_BREAK_PATTERN = /\r\n|\n|\r/;
const HEADER_SCAN_LIMIT = 25;
const DELIMITER_CANDIDATES = [',', '\t', ';'] as const;

const FIELDS = {
  createdBy: 'creationAccountName',
  creationHostTimestamp: 'creationHostTimestamp',
  createdAt: 'creationTimestamp',
  updatedBy: 'modificationAccountName',
  modificationHostTimestamp: 'modificationHostTimestamp',
  updatedAt: 'modificationTimestamp',
  owner: 'Owner',
  pageDescription: 'PageDescription',
  pageKeywords: 'PageKeywords',
  pageTitle: 'PageTitle',
  legacyOrganizationUuid: 'Parent_UUID_FK',
  legacyUuid: 'UUID',
} as const;

const HEADERLESS_HARVEST_FIELDS = [
  FIELDS.createdBy,
  FIELDS.creationHostTimestamp,
  FIELDS.createdAt,
  FIELDS.updatedBy,
  FIELDS.modificationHostTimestamp,
  FIELDS.updatedAt,
  FIELDS.owner,
  FIELDS.pageDescription,
  FIELDS.pageKeywords,
  FIELDS.pageTitle,
  FIELDS.legacyOrganizationUuid,
  FIELDS.legacyUuid,
] as const;

type Delimiter = (typeof DELIMITER_CANDIDATES)[number];
type LegacyOrganizationHarvestRowsFormat = 'CSV/TSV' | 'XLSX';

export type LegacyOrganizationHarvestRow = Record<string, string>;

export type ParsedLegacyOrganizationHarvestProfile = {
  createdAt?: string;
  createdBy?: string;
  legacyOrganizationUuid: string;
  legacyUuid: string;
  owner?: string;
  pageDescription?: string;
  pageKeywords?: string;
  pageTitle?: string;
  updatedAt?: string;
  updatedBy?: string;
};

const countDelimiter = (line: string, delimiter: Delimiter): number =>
  line.split(delimiter).length - 1;

const inferDelimiter = (text: string): Delimiter => {
  const lines = text
    .split(FILEMAKER_LINE_BREAK_PATTERN)
    .filter((line: string): boolean => line.trim().length > 0)
    .slice(0, HEADER_SCAN_LIMIT);
  const scores = DELIMITER_CANDIDATES.map((delimiter: Delimiter) => ({
    delimiter,
    score: lines.reduce(
      (total: number, line: string): number => total + countDelimiter(line, delimiter),
      0
    ),
  }));
  const best = scores.reduce((left, right) => (right.score > left.score ? right : left));
  return best.score > 0 ? best.delimiter : ',';
};

const normalizeMatrixCell = (value: unknown): string => normalizeString(value);

const hasHarvestHeader = (header: string[]): boolean =>
  header.includes(FIELDS.legacyUuid) && header.includes(FIELDS.legacyOrganizationUuid);

const buildMissingHeaderError = (format: LegacyOrganizationHarvestRowsFormat): Error =>
  new Error(
    `FileMaker organization harvest ${format} export is missing the UUID or Parent_UUID_FK header.`
  );

const rowToObject = (header: readonly string[], row: string[]): LegacyOrganizationHarvestRow =>
  Object.fromEntries(header.map((fieldName: string, index: number) => [fieldName, row[index] ?? '']));

const findHeaderRowIndex = (rows: string[][]): number =>
  rows.findIndex((row: string[], index: number): boolean => {
    if (index >= HEADER_SCAN_LIMIT) return false;
    return hasHarvestHeader(row.map((field: string): string => normalizeString(field)));
  });

const looksLikeHeaderlessHarvestRows = (rows: string[][]): boolean =>
  rows.slice(0, HEADER_SCAN_LIMIT).some((row: string[]): boolean => {
    const legacyOrganizationUuid = normalizeLegacyUuid(row[10]);
    const legacyUuid = normalizeLegacyUuid(row[11]);
    return (
      row.length >= HEADERLESS_HARVEST_FIELDS.length &&
      legacyOrganizationUuid.length > 0 &&
      legacyUuid.length > 0
    );
  });

const rowsToLegacyOrganizationHarvestRows = (
  matrix: unknown[][],
  input: { format: LegacyOrganizationHarvestRowsFormat }
): LegacyOrganizationHarvestRow[] => {
  const rows = matrix
    .map((row: unknown[]): string[] => row.map(normalizeMatrixCell))
    .filter((row: string[]): boolean => row.some((value: string): boolean => value.length > 0));
  const headerRowIndex = findHeaderRowIndex(rows);
  const header = rows[headerRowIndex]?.map((field: string): string => normalizeString(field)) ?? [];
  if (!hasHarvestHeader(header)) {
    if (input.format === 'CSV/TSV' && looksLikeHeaderlessHarvestRows(rows)) {
      return rows.map((row: string[]): LegacyOrganizationHarvestRow =>
        rowToObject(HEADERLESS_HARVEST_FIELDS, row)
      );
    }
    throw buildMissingHeaderError(input.format);
  }

  return rows.slice(headerRowIndex + 1).map((row: string[]): LegacyOrganizationHarvestRow =>
    rowToObject(header, row)
  );
};

export const parseFilemakerLegacyOrganizationHarvestRows = (
  text: string
): LegacyOrganizationHarvestRow[] => {
  const normalizedText = text.replace(/^\uFEFF/, '').replaceAll('\u0000', '');
  const delimiter = inferDelimiter(normalizedText);
  if (delimiter === '\t') {
    const rows = normalizedText
      .split(FILEMAKER_LINE_BREAK_PATTERN)
      .map((line: string): string[] => line.split('\t'));
    return rowsToLegacyOrganizationHarvestRows(rows, { format: 'CSV/TSV' });
  }
  const parsed = Papa.parse<string[]>(normalizedText, {
    delimiter,
    skipEmptyLines: 'greedy',
  });
  if (parsed.errors.length > 0) {
    const firstError = parsed.errors[0]?.message ?? 'parse error';
    throw new Error(`Invalid FileMaker organization harvest export: ${firstError}`);
  }
  return rowsToLegacyOrganizationHarvestRows(parsed.data, { format: 'CSV/TSV' });
};

const toArrayBuffer = (input: ArrayBuffer | Uint8Array): ArrayBuffer => {
  if (input instanceof ArrayBuffer) return input;
  const copy = new Uint8Array(input.byteLength);
  copy.set(input);
  return copy.buffer;
};

export const parseFilemakerLegacyOrganizationHarvestWorkbookRows = async (
  input: ArrayBuffer | Uint8Array
): Promise<LegacyOrganizationHarvestRow[]> => {
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(toArrayBuffer(input), {
    type: 'array',
    cellDates: false,
  });
  const sheetName = workbook.SheetNames[0];
  if (sheetName === undefined) {
    throw new Error('FileMaker organization harvest XLSX export does not contain any worksheets.');
  }
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(`FileMaker organization harvest XLSX export is missing worksheet "${sheetName}".`);
  }
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: false,
    defval: '',
    blankrows: false,
  });
  return rowsToLegacyOrganizationHarvestRows(matrix, { format: 'XLSX' });
};

const optionalString = (value: unknown): string | undefined => {
  const normalized = normalizeString(value);
  return normalized.length > 0 ? normalized : undefined;
};

export const parseOrganizationHarvestProfileFromRow = (
  row: LegacyOrganizationHarvestRow
): ParsedLegacyOrganizationHarvestProfile | null => {
  const legacyUuid = normalizeLegacyUuid(row[FIELDS.legacyUuid]);
  const legacyOrganizationUuid = normalizeLegacyUuid(row[FIELDS.legacyOrganizationUuid]);
  if (legacyUuid.length === 0 || legacyOrganizationUuid.length === 0) return null;

  return {
    createdAt: parseLegacyOrganiserTimestamp(row[FIELDS.createdAt]),
    createdBy: optionalString(row[FIELDS.createdBy]),
    legacyOrganizationUuid,
    legacyUuid,
    owner: optionalString(row[FIELDS.owner]),
    pageDescription: optionalString(row[FIELDS.pageDescription]),
    pageKeywords: optionalString(row[FIELDS.pageKeywords]),
    pageTitle: optionalString(row[FIELDS.pageTitle]),
    updatedAt: parseLegacyOrganiserTimestamp(row[FIELDS.updatedAt]),
    updatedBy: optionalString(row[FIELDS.updatedBy]),
  };
};
