import Papa from 'papaparse';

import { normalizeString } from './filemaker-settings.helpers';
import { parseLegacyOrganiserTimestamp } from './filemaker-organisers-import.parser';
import { normalizeLegacyUuid } from './filemaker-values-import.parser';

const FILEMAKER_LINE_BREAK_PATTERN = /\r\n|\n|\r/;
const HEADER_SCAN_LIMIT = 25;
const DELIMITER_CANDIDATES = [',', '\t', ';'] as const;

const FIELDS = {
  accountNumber: 'No_BankAccount',
  bankAddress: 'Bank_Address',
  bankName: 'Bank_Name',
  category: 'Category',
  createdAt: 'DateAdded',
  displayName: 'c_Name',
  legacyCurrencyUuid: 'Currency_UUID_FK',
  legacyOwnerUuid: 'Parent_UUID_FK',
  legacyUuid: 'UUID',
  swift: 'No_Swift',
  updatedAt: 'DateModified',
  updatedBy: 'ModifiedBy',
} as const;

const HEADERLESS_BANK_ACCOUNT_FIELDS = [
  FIELDS.bankAddress,
  FIELDS.bankName,
  FIELDS.displayName,
  FIELDS.category,
  FIELDS.legacyCurrencyUuid,
  FIELDS.createdAt,
  FIELDS.updatedAt,
  FIELDS.updatedBy,
  FIELDS.accountNumber,
  FIELDS.swift,
  FIELDS.legacyOwnerUuid,
  FIELDS.legacyUuid,
] as const;

type Delimiter = (typeof DELIMITER_CANDIDATES)[number];
type LegacyBankAccountRowsFormat = 'CSV/TSV' | 'XLSX';

export type LegacyBankAccountRow = Record<string, string>;

export type ParsedLegacyBankAccount = {
  accountNumber: string;
  bankAddress?: string;
  bankName?: string;
  category?: string;
  createdAt?: string;
  displayName?: string;
  legacyCurrencyUuid?: string;
  legacyOwnerUuid: string;
  legacyUuid: string;
  swift?: string;
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

const hasBankAccountHeader = (header: string[]): boolean =>
  header.includes(FIELDS.legacyUuid) && header.includes(FIELDS.legacyOwnerUuid);

const buildMissingHeaderError = (format: LegacyBankAccountRowsFormat): Error =>
  new Error(
    `FileMaker bank account ${format} export is missing the UUID or Parent_UUID_FK header.`
  );

const rowToObject = (header: readonly string[], row: string[]): LegacyBankAccountRow =>
  Object.fromEntries(header.map((fieldName: string, index: number) => [fieldName, row[index] ?? '']));

const findHeaderRowIndex = (rows: string[][]): number =>
  rows.findIndex((row: string[], index: number): boolean => {
    if (index >= HEADER_SCAN_LIMIT) return false;
    return hasBankAccountHeader(row.map((field: string): string => normalizeString(field)));
  });

const looksLikeHeaderlessBankAccountRows = (rows: string[][]): boolean =>
  rows.slice(0, HEADER_SCAN_LIMIT).some((row: string[]): boolean => {
    const legacyOwnerUuid = normalizeLegacyUuid(row[10]);
    const legacyUuid = normalizeLegacyUuid(row[11]);
    return (
      row.length >= HEADERLESS_BANK_ACCOUNT_FIELDS.length &&
      legacyOwnerUuid.length > 0 &&
      legacyUuid.length > 0
    );
  });

const rowsToLegacyBankAccountRows = (
  matrix: unknown[][],
  input: { format: LegacyBankAccountRowsFormat }
): LegacyBankAccountRow[] => {
  const rows = matrix
    .map((row: unknown[]): string[] => row.map(normalizeString))
    .filter((row: string[]): boolean => row.some((value: string): boolean => value.length > 0));
  const headerRowIndex = findHeaderRowIndex(rows);
  const header = rows[headerRowIndex]?.map((field: string): string => normalizeString(field)) ?? [];
  if (!hasBankAccountHeader(header)) {
    if (input.format === 'CSV/TSV' && looksLikeHeaderlessBankAccountRows(rows)) {
      return rows.map((row: string[]): LegacyBankAccountRow =>
        rowToObject(HEADERLESS_BANK_ACCOUNT_FIELDS, row)
      );
    }
    throw buildMissingHeaderError(input.format);
  }

  return rows.slice(headerRowIndex + 1).map((row: string[]): LegacyBankAccountRow =>
    rowToObject(header, row)
  );
};

export const parseFilemakerLegacyBankAccountRows = (text: string): LegacyBankAccountRow[] => {
  const normalizedText = text.replace(/^\uFEFF/, '').replaceAll('\u0000', '');
  const delimiter = inferDelimiter(normalizedText);
  if (delimiter === '\t') {
    const rows = normalizedText
      .split(FILEMAKER_LINE_BREAK_PATTERN)
      .map((line: string): string[] => line.split('\t'));
    return rowsToLegacyBankAccountRows(rows, { format: 'CSV/TSV' });
  }
  const parsed = Papa.parse<string[]>(normalizedText, {
    delimiter,
    skipEmptyLines: 'greedy',
  });
  if (parsed.errors.length > 0) {
    const firstError = parsed.errors[0]?.message ?? 'parse error';
    throw new Error(`Invalid FileMaker bank account export: ${firstError}`);
  }
  return rowsToLegacyBankAccountRows(parsed.data, { format: 'CSV/TSV' });
};

const toArrayBuffer = (input: ArrayBuffer | Uint8Array): ArrayBuffer => {
  if (input instanceof ArrayBuffer) return input;
  const copy = new Uint8Array(input.byteLength);
  copy.set(input);
  return copy.buffer;
};

export const parseFilemakerLegacyBankAccountWorkbookRows = async (
  input: ArrayBuffer | Uint8Array
): Promise<LegacyBankAccountRow[]> => {
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(toArrayBuffer(input), {
    type: 'array',
    cellDates: false,
  });
  const sheetName = workbook.SheetNames[0];
  if (sheetName === undefined) {
    throw new Error('FileMaker bank account XLSX export does not contain any worksheets.');
  }
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(`FileMaker bank account XLSX export is missing worksheet "${sheetName}".`);
  }
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: false,
    defval: '',
    blankrows: false,
  });
  return rowsToLegacyBankAccountRows(matrix, { format: 'XLSX' });
};

const optionalString = (value: unknown): string | undefined => {
  const normalized = normalizeString(value);
  return normalized.length > 0 ? normalized : undefined;
};

export const parseBankAccountFromRow = (
  row: LegacyBankAccountRow
): ParsedLegacyBankAccount | null => {
  const legacyOwnerUuid = normalizeLegacyUuid(row[FIELDS.legacyOwnerUuid]);
  const legacyUuid = normalizeLegacyUuid(row[FIELDS.legacyUuid]);
  const accountNumber = normalizeString(row[FIELDS.accountNumber]);
  const bankName = optionalString(row[FIELDS.bankName]);
  const displayName = optionalString(row[FIELDS.displayName]);
  if (legacyOwnerUuid.length === 0 || legacyUuid.length === 0) return null;
  if (accountNumber.length === 0 && bankName === undefined && displayName === undefined) return null;

  return {
    accountNumber,
    bankAddress: optionalString(row[FIELDS.bankAddress]),
    bankName,
    category: optionalString(row[FIELDS.category]),
    createdAt: parseLegacyOrganiserTimestamp(row[FIELDS.createdAt]),
    displayName,
    legacyCurrencyUuid: optionalString(normalizeLegacyUuid(row[FIELDS.legacyCurrencyUuid])),
    legacyOwnerUuid,
    legacyUuid,
    swift: optionalString(row[FIELDS.swift]),
    updatedAt: parseLegacyOrganiserTimestamp(row[FIELDS.updatedAt]),
    updatedBy: optionalString(row[FIELDS.updatedBy]),
  };
};
