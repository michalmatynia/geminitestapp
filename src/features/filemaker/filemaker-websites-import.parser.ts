import Papa from 'papaparse';

import { normalizeString } from './filemaker-settings.helpers';
import { parseLegacyOrganiserTimestamp } from './filemaker-organisers-import.parser';
import { normalizeLegacyUuid } from './filemaker-values-import.parser';

const FILEMAKER_LINE_BREAK_PATTERN = /\r\n|\n|\r/;
const HEADER_SCAN_LIMIT = 25;
const DELIMITER_CANDIDATES = [',', '\t', ';'] as const;

const WEBSITE_FIELDS = {
  createdAt: 'DateAdded',
  legacyTypeRaw: 'type',
  legacyUuid: 'UUID',
  updatedAt: 'DateModified',
  updatedBy: 'ModifiedBy',
  url: 'Website',
} as const;

const WEBSITE_JOIN_FIELDS = {
  createdAt: 'creationTimestamp',
  createdBy: 'creationAccountName',
  legacyJoinUuid: 'UUID',
  legacyOwnerUuid: 'NameEntity_UUID_FK',
  legacyWebsiteUuid: 'WebsiteBook_UUID_FK',
  updatedAt: 'modificationTimestamp',
  updatedBy: 'modificationAccountName',
} as const;

type Delimiter = (typeof DELIMITER_CANDIDATES)[number];
type LegacyWebsiteRowsFormat = 'CSV/TSV' | 'XLSX';
type LegacyWebsiteRowKind = 'website' | 'website JOIN';

export type LegacyWebsiteRow = Record<string, string>;
export type LegacyWebsiteJoinRow = Record<string, string>;

export type ParsedLegacyWebsite = {
  createdAt?: string;
  host?: string;
  legacyTypeRaw?: string;
  legacyUuid: string;
  normalizedUrl?: string;
  updatedAt?: string;
  updatedBy?: string;
  url: string;
};

export type ParsedLegacyWebsiteJoin = {
  createdAt?: string;
  createdBy?: string;
  legacyJoinUuid?: string;
  legacyOwnerUuid: string;
  legacyWebsiteUuid: string;
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

const hasWebsiteHeader = (header: string[]): boolean =>
  header.includes(WEBSITE_FIELDS.legacyUuid) && header.includes(WEBSITE_FIELDS.url);

const hasWebsiteJoinHeader = (header: string[]): boolean =>
  header.includes(WEBSITE_JOIN_FIELDS.legacyOwnerUuid) &&
  header.includes(WEBSITE_JOIN_FIELDS.legacyJoinUuid) &&
  header.includes(WEBSITE_JOIN_FIELDS.legacyWebsiteUuid);

const getHeaderPredicate = (kind: LegacyWebsiteRowKind): ((header: string[]) => boolean) =>
  kind === 'website' ? hasWebsiteHeader : hasWebsiteJoinHeader;

const summarizeParsedColumnCounts = (rows: string[][]): string => {
  const counts = rows.slice(0, 5).map((row: string[]): number => row.length);
  return counts.length > 0 ? counts.join(', ') : 'none';
};

const buildMissingHeaderError = (
  format: LegacyWebsiteRowsFormat,
  kind: LegacyWebsiteRowKind,
  rows: string[][]
): Error =>
  new Error(
    `FileMaker ${kind} ${format} export is missing required headers. Parsed column counts for the first rows: ${summarizeParsedColumnCounts(rows)}.`
  );

const rowToObject = (header: readonly string[], row: string[]): Record<string, string> =>
  Object.fromEntries(header.map((fieldName: string, index: number) => [fieldName, row[index] ?? '']));

const findHeaderRowIndex = (
  rows: string[][],
  kind: LegacyWebsiteRowKind
): number => {
  const hasHeader = getHeaderPredicate(kind);
  return rows.findIndex((row: string[], index: number): boolean => {
    if (index >= HEADER_SCAN_LIMIT) return false;
    return hasHeader(row.map((field: string): string => normalizeString(field)));
  });
};

const rowsToLegacyRows = (
  matrix: unknown[][],
  input: { format: LegacyWebsiteRowsFormat; kind: LegacyWebsiteRowKind }
): Array<Record<string, string>> => {
  const rows = matrix
    .map((row: unknown[]): string[] => row.map(normalizeMatrixCell))
    .filter((row: string[]): boolean => row.some((value: string): boolean => value.length > 0));
  const headerRowIndex = findHeaderRowIndex(rows, input.kind);
  const header = rows[headerRowIndex]?.map((field: string): string => normalizeString(field)) ?? [];
  if (!getHeaderPredicate(input.kind)(header)) {
    throw buildMissingHeaderError(input.format, input.kind, rows);
  }
  return rows.slice(headerRowIndex + 1).map((row: string[]): Record<string, string> =>
    rowToObject(header, row)
  );
};

const parseDelimitedRows = (
  text: string,
  kind: LegacyWebsiteRowKind
): Array<Record<string, string>> => {
  const normalizedText = text.replace(/^\uFEFF/, '').replaceAll('\u0000', '');
  const delimiter = inferDelimiter(normalizedText);
  if (delimiter === '\t') {
    const rows = normalizedText
      .split(FILEMAKER_LINE_BREAK_PATTERN)
      .map((line: string): string[] => line.split('\t'));
    return rowsToLegacyRows(rows, { format: 'CSV/TSV', kind });
  }
  const parsed = Papa.parse<string[]>(normalizedText, {
    delimiter,
    skipEmptyLines: 'greedy',
  });
  if (parsed.errors.length > 0) {
    throw new Error(
      `Invalid FileMaker ${kind} export: ${parsed.errors[0]?.message ?? 'parse error'}`
    );
  }
  return rowsToLegacyRows(parsed.data, { format: 'CSV/TSV', kind });
};

const toArrayBuffer = (input: ArrayBuffer | Uint8Array): ArrayBuffer => {
  if (input instanceof ArrayBuffer) return input;
  const copy = new Uint8Array(input.byteLength);
  copy.set(input);
  return copy.buffer;
};

const parseWorkbookRows = async (
  input: ArrayBuffer | Uint8Array,
  kind: LegacyWebsiteRowKind
): Promise<Array<Record<string, string>>> => {
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(toArrayBuffer(input), { type: 'array', cellDates: false });
  const sheetName = workbook.SheetNames[0];
  if (sheetName === undefined) {
    throw new Error(`FileMaker ${kind} XLSX export does not contain any worksheets.`);
  }
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(`FileMaker ${kind} XLSX export is missing worksheet "${sheetName}".`);
  }
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    blankrows: false,
    defval: '',
    header: 1,
    raw: false,
  });
  return rowsToLegacyRows(matrix, { format: 'XLSX', kind });
};

export const parseFilemakerLegacyWebsiteRows = (text: string): LegacyWebsiteRow[] =>
  parseDelimitedRows(text, 'website');

export const parseFilemakerLegacyWebsiteWorkbookRows = async (
  input: ArrayBuffer | Uint8Array
): Promise<LegacyWebsiteRow[]> => parseWorkbookRows(input, 'website');

export const parseFilemakerLegacyWebsiteJoinRows = (text: string): LegacyWebsiteJoinRow[] =>
  parseDelimitedRows(text, 'website JOIN');

export const parseFilemakerLegacyWebsiteJoinWorkbookRows = async (
  input: ArrayBuffer | Uint8Array
): Promise<LegacyWebsiteJoinRow[]> => parseWorkbookRows(input, 'website JOIN');

const optionalString = (value: unknown): string | undefined => {
  const normalized = normalizeString(value);
  return normalized.length > 0 ? normalized : undefined;
};

const optionalLegacyUuid = (value: unknown): string | undefined => {
  const normalized = normalizeLegacyUuid(value);
  return normalized.length > 0 ? normalized : undefined;
};

const ensureUrlProtocol = (value: string): string => {
  if (/^[a-z][a-z\d+.-]*:\/\//i.test(value)) return value;
  return `https://${value}`;
};

const normalizeUrlParts = (
  value: string
): Pick<ParsedLegacyWebsite, 'host' | 'normalizedUrl'> => {
  try {
    const parsed = new URL(ensureUrlProtocol(value));
    parsed.hash = '';
    parsed.hostname = parsed.hostname.toLowerCase();
    const normalizedUrl = parsed.toString();
    return {
      host: parsed.hostname,
      normalizedUrl:
        normalizedUrl.endsWith('/') && parsed.pathname === '/' && parsed.search.length === 0
          ? normalizedUrl.slice(0, -1)
          : normalizedUrl,
    };
  } catch {
    return {};
  }
};

export const parseWebsiteFromRow = (row: LegacyWebsiteRow): ParsedLegacyWebsite | null => {
  const legacyUuid = normalizeLegacyUuid(row[WEBSITE_FIELDS.legacyUuid]);
  const url = normalizeString(row[WEBSITE_FIELDS.url]);
  if (legacyUuid.length === 0 || url.length === 0) return null;
  const urlParts = normalizeUrlParts(url);
  const legacyTypeRaw = optionalString(row[WEBSITE_FIELDS.legacyTypeRaw]);
  return {
    createdAt: parseLegacyOrganiserTimestamp(row[WEBSITE_FIELDS.createdAt]),
    ...(urlParts.host !== undefined ? { host: urlParts.host } : {}),
    ...(legacyTypeRaw !== undefined ? { legacyTypeRaw } : {}),
    legacyUuid,
    ...(urlParts.normalizedUrl !== undefined ? { normalizedUrl: urlParts.normalizedUrl } : {}),
    updatedAt: parseLegacyOrganiserTimestamp(row[WEBSITE_FIELDS.updatedAt]),
    updatedBy: optionalString(row[WEBSITE_FIELDS.updatedBy]),
    url,
  };
};

export const parseWebsiteJoinFromRow = (
  row: LegacyWebsiteJoinRow
): ParsedLegacyWebsiteJoin | null => {
  const legacyOwnerUuid = normalizeLegacyUuid(row[WEBSITE_JOIN_FIELDS.legacyOwnerUuid]);
  const legacyWebsiteUuid = normalizeLegacyUuid(row[WEBSITE_JOIN_FIELDS.legacyWebsiteUuid]);
  if (legacyOwnerUuid.length === 0 || legacyWebsiteUuid.length === 0) return null;
  const legacyJoinUuid = optionalLegacyUuid(row[WEBSITE_JOIN_FIELDS.legacyJoinUuid]);
  return {
    createdAt: parseLegacyOrganiserTimestamp(row[WEBSITE_JOIN_FIELDS.createdAt]),
    createdBy: optionalString(row[WEBSITE_JOIN_FIELDS.createdBy]),
    ...(legacyJoinUuid !== undefined ? { legacyJoinUuid } : {}),
    legacyOwnerUuid,
    legacyWebsiteUuid,
    updatedAt: parseLegacyOrganiserTimestamp(row[WEBSITE_JOIN_FIELDS.updatedAt]),
    updatedBy: optionalString(row[WEBSITE_JOIN_FIELDS.updatedBy]),
  };
};
