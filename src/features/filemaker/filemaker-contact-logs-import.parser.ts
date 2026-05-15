/**
 * FileMaker Contact Logs Import Parser
 * 
 * CSV/XLSX parsing and transformation for contact log imports.
 * Provides:
 * - Parsing with auto-delimiter detection
 * - Data normalization and UUID mapping
 * - Header-based field validation
 * - Standardized error reporting for import failures
 */

import Papa from 'papaparse';
import { AppErrorCodes, AppError } from '@/shared/errors/app-error';

import { normalizeString } from './filemaker-settings.helpers';
import { parseLegacyOrganiserTimestamp } from './filemaker-organisers-import.parser';
import { normalizeLegacyUuid } from './filemaker-values-import.parser';
import {
  FILEMAKER_CONTACT_LOG_FIELDS,
  rowsToLegacyContactLogRows,
  type LegacyContactLogRow,
} from './filemaker-contact-logs-import.shared';
export { FILEMAKER_CONTACT_LOG_FIELDS, type LegacyContactLogRow };
export {
  parseFilemakerLegacyContactLogWorkbookRows,
  streamFilemakerLegacyContactLogWorkbookRows,
} from './filemaker-contact-logs-import.workbook';

const FILEMAKER_LINE_BREAK_PATTERN = /\r\n|\n|\r/;
const HEADER_SCAN_LIMIT = 25;
const DELIMITER_CANDIDATES = [',', '\t', ';'] as const;
const EXCEL_DATE_EPOCH_MS = Date.UTC(1899, 11, 30);
const DAY_MS = 24 * 60 * 60 * 1000;

const VALUE_FIELDS = [
  { field: FILEMAKER_CONTACT_LOG_FIELDS.contactTypeUuid, kind: 'contactType' },
  { field: FILEMAKER_CONTACT_LOG_FIELDS.mailCampaignUuid, kind: 'mailCampaign' },
  { field: FILEMAKER_CONTACT_LOG_FIELDS.mailServerUuid, kind: 'mailServer' },
  { field: FILEMAKER_CONTACT_LOG_FIELDS.onBehalfUuid, kind: 'onBehalf' },
  { field: FILEMAKER_CONTACT_LOG_FIELDS.yearProspectUuid, kind: 'yearProspect' },
] as const;

type Delimiter = (typeof DELIMITER_CANDIDATES)[number];
type ContactLogValueKind = (typeof VALUE_FIELDS)[number]['kind'];

export type ParsedLegacyContactLogValue = {
  kind: ContactLogValueKind;
  legacyValueUuid: string;
};

export type ParsedLegacyContactLog = {
  comment?: string;
  contactTypeUuid?: string;
  createdAt?: string;
  dateEntered?: string;
  legacyFilemakerId?: string;
  legacyOrganizationUuid?: string;
  legacyOwnerUuids: string[];
  legacyParentUuid?: string;
  legacyUuid: string;
  mailCampaignUuid?: string;
  mailServerUuid?: string;
  onBehalfUuid?: string;
  updatedAt?: string;
  updatedBy?: string;
  values: ParsedLegacyContactLogValue[];
  yearProspectUuid?: string;
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

/**
 * Parses FileMaker legacy contact log rows.
 * 
 * @param text - The raw CSV/TSV input string.
 * @returns An array of normalized contact log rows.
 * @throws AppError if CSV parsing fails or file format is invalid.
 */
export const parseFilemakerLegacyContactLogRows = (text: string): LegacyContactLogRow[] => {
  const normalizedText = text.replace(/^\uFEFF/, '').replaceAll('\u0000', '');
  const delimiter = inferDelimiter(normalizedText);
  if (delimiter === '\t') {
    const rows = normalizedText
      .split(FILEMAKER_LINE_BREAK_PATTERN)
      .map((line: string): string[] => line.split('\t'));
    return rowsToLegacyContactLogRows(rows, { format: 'CSV/TSV' });
  }
  const parsed = Papa.parse<string[]>(normalizedText, {
    delimiter,
    skipEmptyLines: 'greedy',
  });
  if (parsed.errors.length > 0) {
    const firstError = parsed.errors[0]?.message ?? 'Unknown parsing error';
    throw new AppError(`Invalid FileMaker contact log export: ${firstError}`, {
        code: AppErrorCodes.validation,
        httpStatus: 400,
        meta: { firstError }
    });
  }
  return rowsToLegacyContactLogRows(parsed.data, { format: 'CSV/TSV' });
};

const optionalString = (value: unknown): string | undefined => {
  const normalized = normalizeString(value);
  return normalized.length > 0 ? normalized : undefined;
};

const optionalLegacyUuid = (value: unknown): string | undefined => {
  const uuid = normalizeLegacyUuid(value);
  return uuid.length > 0 ? uuid : undefined;
};

const parseExcelSerialTimestamp = (value: string): string | undefined => {
  if (!/^\d+(?:\.\d+)?$/.test(value)) return undefined;
  const serial = Number.parseFloat(value);
  if (!Number.isFinite(serial) || serial <= 0) return undefined;
  const timestamp = new Date(Math.round(EXCEL_DATE_EPOCH_MS + serial * DAY_MS));
  return Number.isNaN(timestamp.getTime()) ? undefined : timestamp.toISOString();
};

const parseLegacyContactLogTimestamp = (value: unknown): string | undefined => {
  const normalized = normalizeString(value);
  if (normalized.length === 0) return undefined;
  return parseExcelSerialTimestamp(normalized) ?? parseLegacyOrganiserTimestamp(normalized);
};

const uniqueStrings = (values: Array<string | undefined>): string[] =>
  Array.from(new Set(values.filter((value): value is string => value !== undefined)));

type ContactLogLegacyUuidFields = {
  contactTypeUuid?: string;
  legacyOrganizationUuid?: string;
  legacyParentUuid?: string;
  mailCampaignUuid?: string;
  mailServerUuid?: string;
  onBehalfUuid?: string;
  yearProspectUuid?: string;
};

const optionalRecord = <Key extends string, Value>(
  key: Key,
  value: Value | undefined
): Partial<Record<Key, Value>> => {
  if (value === undefined) return {};
  const record: Partial<Record<Key, Value>> = {};
  record[key] = value;
  return record;
};

const createdAtRecord = (dateEntered: string | undefined): Partial<ParsedLegacyContactLog> =>
  dateEntered === undefined ? {} : { createdAt: dateEntered, dateEntered };

const readContactLogLegacyUuidFields = (
  row: LegacyContactLogRow
): ContactLogLegacyUuidFields => ({
  contactTypeUuid: optionalLegacyUuid(row[FILEMAKER_CONTACT_LOG_FIELDS.contactTypeUuid]),
  legacyOrganizationUuid: optionalLegacyUuid(row[FILEMAKER_CONTACT_LOG_FIELDS.organizationUuid]),
  legacyParentUuid: optionalLegacyUuid(row[FILEMAKER_CONTACT_LOG_FIELDS.parentUuid]),
  mailCampaignUuid: optionalLegacyUuid(row[FILEMAKER_CONTACT_LOG_FIELDS.mailCampaignUuid]),
  mailServerUuid: optionalLegacyUuid(row[FILEMAKER_CONTACT_LOG_FIELDS.mailServerUuid]),
  onBehalfUuid: optionalLegacyUuid(row[FILEMAKER_CONTACT_LOG_FIELDS.onBehalfUuid]),
  yearProspectUuid: optionalLegacyUuid(row[FILEMAKER_CONTACT_LOG_FIELDS.yearProspectUuid]),
});

const buildContactLogValues = (row: LegacyContactLogRow): ParsedLegacyContactLogValue[] =>
  VALUE_FIELDS.map((valueField): ParsedLegacyContactLogValue | null => {
    const legacyValueUuid = optionalLegacyUuid(row[valueField.field]);
    return legacyValueUuid === undefined ? null : { kind: valueField.kind, legacyValueUuid };
  }).filter((value): value is ParsedLegacyContactLogValue => value !== null);

/**
 * Transforms a single legacy row into a parsed contact log object.
 * 
 * @param row - The raw parsed row from the FileMaker export.
 * @returns The parsed object, or null if the row lacks a valid UUID.
 */
export const parseContactLogFromRow = (
  row: LegacyContactLogRow
): ParsedLegacyContactLog | null => {
  const legacyUuid = normalizeLegacyUuid(row[FILEMAKER_CONTACT_LOG_FIELDS.uuid] ?? '');
  if (legacyUuid.length === 0) return null;

  const legacyUuids = readContactLogLegacyUuidFields(row);
  const dateEntered = parseLegacyContactLogTimestamp(row[FILEMAKER_CONTACT_LOG_FIELDS.dateEntered]);
  const updatedAt = parseLegacyContactLogTimestamp(row[FILEMAKER_CONTACT_LOG_FIELDS.dateModified]);

  return {
    ...optionalRecord('comment', optionalString(row[FILEMAKER_CONTACT_LOG_FIELDS.comment])),
    ...optionalRecord('contactTypeUuid', legacyUuids.contactTypeUuid),
    ...createdAtRecord(dateEntered),
    ...optionalRecord('legacyFilemakerId', optionalString(row[FILEMAKER_CONTACT_LOG_FIELDS.filemakerId])),
    ...optionalRecord('legacyOrganizationUuid', legacyUuids.legacyOrganizationUuid),
    legacyOwnerUuids: uniqueStrings([
      legacyUuids.legacyParentUuid,
      legacyUuids.legacyOrganizationUuid,
    ]),
    ...optionalRecord('legacyParentUuid', legacyUuids.legacyParentUuid),
    legacyUuid,
    ...optionalRecord('mailCampaignUuid', legacyUuids.mailCampaignUuid),
    ...optionalRecord('mailServerUuid', legacyUuids.mailServerUuid),
    ...optionalRecord('onBehalfUuid', legacyUuids.onBehalfUuid),
    ...optionalRecord('updatedAt', updatedAt),
    ...optionalRecord('updatedBy', optionalString(row[FILEMAKER_CONTACT_LOG_FIELDS.updatedBy])),
    values: buildContactLogValues(row),
    ...optionalRecord('yearProspectUuid', legacyUuids.yearProspectUuid),
  };
};
