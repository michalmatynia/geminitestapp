import Papa from 'papaparse';

import { normalizeString } from './filemaker-settings.helpers';
import { parseLegacyOrganiserTimestamp } from './filemaker-organisers-import.parser';
import { normalizeLegacyUuid } from './filemaker-values-import.parser';

const FILEMAKER_LINE_BREAK_PATTERN = /\r\n|\n|\r/;
const HEADER_SCAN_LIMIT = 25;
const DELIMITER_CANDIDATES = [',', '\t', ';'] as const;

const FIELDS = {
  codeA: 'DocumentCode_A',
  codeB: 'DocumentCode_B',
  comment: 'Comment',
  createdAt: 'DateAdded',
  documentName: 'DocumentName',
  legacyDocumentTypeUuid: 'DocumentType_UUID_FK',
  legacyOwnerUuid: 'Parent_UUID_FK',
  legacyUuid: 'UUID',
  expiryDate: 'Expiry_Date',
  issueDate: 'Issue_Date',
  issuedBy: 'Issued_By',
  updatedAt: 'DateModified',
  updatedBy: 'ModifiedBy',
} as const;

type Delimiter = (typeof DELIMITER_CANDIDATES)[number];
type LegacyDocumentRowsFormat = 'CSV/TSV' | 'XLSX';

export type LegacyDocumentRow = Record<string, string>;

export type ParsedLegacyDocument = {
  codeA?: string;
  codeB?: string;
  comment?: string;
  createdAt?: string;
  documentName?: string;
  expiryDate?: string;
  issueDate?: string;
  issuedBy?: string;
  legacyDocumentTypeUuid?: string;
  legacyOwnerUuid?: string;
  legacyUuid: string;
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

const hasDocumentHeader = (header: string[]): boolean => header.includes(FIELDS.legacyUuid);

const buildMissingHeaderError = (format: LegacyDocumentRowsFormat): Error =>
  new Error(`FileMaker document ${format} export is missing the UUID header.`);

const rowToObject = (header: readonly string[], row: string[]): LegacyDocumentRow =>
  Object.fromEntries(header.map((fieldName: string, index: number) => [fieldName, row[index] ?? '']));

const findHeaderRowIndex = (rows: string[][]): number =>
  rows.findIndex((row: string[], index: number): boolean => {
    if (index >= HEADER_SCAN_LIMIT) return false;
    return hasDocumentHeader(row.map((field: string): string => normalizeString(field)));
  });

const rowsToLegacyDocumentRows = (
  matrix: unknown[][],
  input: { format: LegacyDocumentRowsFormat }
): LegacyDocumentRow[] => {
  const rows = matrix
    .map((row: unknown[]): string[] => row.map(normalizeString))
    .filter((row: string[]): boolean => row.some((value: string): boolean => value.length > 0));
  const headerRowIndex = findHeaderRowIndex(rows);
  const header = rows[headerRowIndex]?.map((field: string): string => normalizeString(field)) ?? [];
  if (!hasDocumentHeader(header)) {
    throw buildMissingHeaderError(input.format);
  }

  return rows.slice(headerRowIndex + 1).map((row: string[]): LegacyDocumentRow =>
    rowToObject(header, row)
  );
};

export const parseFilemakerLegacyDocumentRows = (text: string): LegacyDocumentRow[] => {
  const normalizedText = text.replace(/^\uFEFF/, '').replaceAll('\u0000', '');
  const delimiter = inferDelimiter(normalizedText);
  if (delimiter === '\t') {
    const rows = normalizedText
      .split(FILEMAKER_LINE_BREAK_PATTERN)
      .map((line: string): string[] => line.split('\t'));
    return rowsToLegacyDocumentRows(rows, { format: 'CSV/TSV' });
  }
  const parsed = Papa.parse<string[]>(normalizedText, {
    delimiter,
    skipEmptyLines: 'greedy',
  });
  if (parsed.errors.length > 0) {
    const firstError = parsed.errors[0]?.message ?? 'parse error';
    throw new Error(`Invalid FileMaker document export: ${firstError}`);
  }
  return rowsToLegacyDocumentRows(parsed.data, { format: 'CSV/TSV' });
};

const toArrayBuffer = (input: ArrayBuffer | Uint8Array): ArrayBuffer => {
  if (input instanceof ArrayBuffer) return input;
  const copy = new Uint8Array(input.byteLength);
  copy.set(input);
  return copy.buffer;
};

export const parseFilemakerLegacyDocumentWorkbookRows = async (
  input: ArrayBuffer | Uint8Array
): Promise<LegacyDocumentRow[]> => {
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(toArrayBuffer(input), {
    type: 'array',
    cellDates: false,
  });
  const sheetName = workbook.SheetNames[0];
  if (sheetName === undefined) {
    throw new Error('FileMaker document XLSX export does not contain any worksheets.');
  }
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(`FileMaker document XLSX export is missing worksheet "${sheetName}".`);
  }
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: false,
    defval: '',
    blankrows: false,
  });
  return rowsToLegacyDocumentRows(matrix, { format: 'XLSX' });
};

const optionalString = (value: unknown): string | undefined => {
  const normalized = normalizeString(value);
  return normalized.length > 0 ? normalized : undefined;
};

const optionalLegacyUuid = (value: unknown): string | undefined => {
  const normalized = normalizeLegacyUuid(value);
  return normalized.length > 0 ? normalized : undefined;
};

const hasDocumentContent = (document: ParsedLegacyDocument): boolean =>
  [
    document.codeA,
    document.codeB,
    document.comment,
    document.documentName,
    document.issuedBy,
    document.legacyDocumentTypeUuid,
    document.legacyOwnerUuid,
  ].some((value: string | undefined): boolean => (value?.trim().length ?? 0) > 0);

export const parseDocumentFromRow = (row: LegacyDocumentRow): ParsedLegacyDocument | null => {
  const legacyUuid = normalizeLegacyUuid(row[FIELDS.legacyUuid]);
  if (legacyUuid.length === 0) return null;
  const document: ParsedLegacyDocument = {
    codeA: optionalString(row[FIELDS.codeA]),
    codeB: optionalString(row[FIELDS.codeB]),
    comment: optionalString(row[FIELDS.comment]),
    createdAt: parseLegacyOrganiserTimestamp(row[FIELDS.createdAt]),
    documentName: optionalString(row[FIELDS.documentName]),
    expiryDate: parseLegacyOrganiserTimestamp(row[FIELDS.expiryDate]),
    issueDate: parseLegacyOrganiserTimestamp(row[FIELDS.issueDate]),
    issuedBy: optionalString(row[FIELDS.issuedBy]),
    legacyDocumentTypeUuid: optionalLegacyUuid(row[FIELDS.legacyDocumentTypeUuid]),
    legacyOwnerUuid: optionalLegacyUuid(row[FIELDS.legacyOwnerUuid]),
    legacyUuid,
    updatedAt: parseLegacyOrganiserTimestamp(row[FIELDS.updatedAt]),
    updatedBy: optionalString(row[FIELDS.updatedBy]),
  };
  return hasDocumentContent(document) ? document : null;
};
