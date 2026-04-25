import * as Papa from 'papaparse';

import { normalizeString } from './filemaker-settings.helpers';

const LEGACY_UUID_PATTERN =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const FILEMAKER_TIMESTAMP_PATTERN =
  /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i;

const FIELDS = {
  parentUuid: 'UUID_Parent',
  uuid: 'UUID',
  modificationTimestamp: 'modificationTimestamp',
  english: 'english',
  creationTimestamp: 'creationTimestamp',
  serialValue: 'SerialValue',
  sortValue: 'SortValue',
  uuidList: 'UUID_List',
  valueListText: 'zzc_valuelist_text',
  valueListUuid: 'zzc_valuelist_uuid',
  childEnglish: 'iValues Builder Child::english',
  listEnglish: 'iValues Builder List::English',
  listUuid: 'iValues Builder List::UUID',
} as const;

export type LegacyValueRow = Record<string, string>;

export type ParsedLegacyValue = {
  createdAt?: string;
  label: string;
  legacyListUuids: string[];
  legacyParentUuids: string[];
  legacyUuid: string;
  sortOrder: number;
  updatedAt?: string;
};

export type ParsedLegacyParameter = {
  label: string;
  legacyUuid: string;
};

const uniqueStrings = (values: string[]): string[] => {
  const seen = new Set<string>();
  return values.filter((value: string): boolean => {
    const normalized = normalizeString(value);
    if (normalized.length === 0 || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
};

export const extractLegacyUuids = (value: unknown): string[] => {
  const normalized = normalizeString(value);
  if (normalized.length === 0) return [];
  return uniqueStrings(
    [...normalized.matchAll(LEGACY_UUID_PATTERN)].map((match: RegExpMatchArray): string =>
      match[0].toUpperCase()
    )
  );
};

export const normalizeLegacyUuid = (value: unknown): string => extractLegacyUuids(value)[0] ?? '';

const normalizeLegacyLabel = (value: unknown): string => normalizeString(value).replace(/\s+/g, ' ');

const parseInteger = (value: unknown): number | null => {
  const normalized = normalizeString(value);
  if (normalized.length === 0) return null;
  const parsed = Number.parseInt(normalized, 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
};

const toIsoTimestamp = (input: {
  day: number;
  hour: number;
  meridiem: string;
  minute: number;
  month: number;
  second: number;
  year: number;
}): string | undefined => {
  let hour = input.hour;
  if (input.meridiem === 'PM' && hour < 12) hour += 12;
  if (input.meridiem === 'AM' && hour === 12) hour = 0;
  const parsed = new Date(
    Date.UTC(input.year, input.month - 1, input.day, hour, input.minute, input.second)
  );
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
};

const parseNativeTimestamp = (value: string): string | undefined => {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? undefined : new Date(parsed).toISOString();
};

const parseFilemakerTimestampMatch = (match: RegExpMatchArray): string | undefined =>
  toIsoTimestamp({
    month: Number.parseInt(match[1] ?? '1', 10),
    day: Number.parseInt(match[2] ?? '1', 10),
    year: Number.parseInt(match[3] ?? '1970', 10),
    hour: Number.parseInt(match[4] ?? '0', 10),
    minute: Number.parseInt(match[5] ?? '0', 10),
    second: Number.parseInt(match[6] ?? '0', 10),
    meridiem: (match[7] ?? '').toUpperCase(),
  });

const parseLegacyTimestamp = (value: unknown): string | undefined => {
  const normalized = normalizeString(value);
  if (normalized.length === 0) return undefined;
  const match = normalized.match(FILEMAKER_TIMESTAMP_PATTERN);
  return match === null ? parseNativeTimestamp(normalized) : parseFilemakerTimestampMatch(match);
};

const inferDelimiter = (line: string): ',' | '\t' => {
  const tabCount = line.split('\t').length - 1;
  const commaCount = line.split(',').length - 1;
  return tabCount >= commaCount ? '\t' : ',';
};

const resolveLegacyValueLabel = (englishLabel: string, childLabel: string, legacyUuid: string): string => {
  if (englishLabel.length > 0) return englishLabel;
  if (childLabel.length > 0) return childLabel;
  return legacyUuid;
};

export const parseFilemakerLegacyValueRows = (text: string): LegacyValueRow[] => {
  const normalizedText = text.replace(/^\uFEFF/, '');
  const delimiter = inferDelimiter(normalizedText.split(/\r?\n/, 1)[0] ?? '');
  const parsed = Papa.parse<string[]>(normalizedText, {
    delimiter,
    skipEmptyLines: 'greedy',
  });
  if (parsed.errors.length > 0) {
    const firstError = parsed.errors[0]?.message ?? 'parse error';
    throw new Error(`Invalid FileMaker value export: ${firstError}`);
  }

  const rows = parsed.data;
  const header = rows.shift()?.map((field: string): string => normalizeString(field)) ?? [];
  if (!header.includes(FIELDS.uuid)) {
    throw new Error('FileMaker value export is missing the UUID header.');
  }

  return rows.map((row: string[]): LegacyValueRow =>
    Object.fromEntries(
      header.map((fieldName: string, index: number) => [fieldName, row[index] ?? ''])
    )
  );
};

export const parseValueFromRow = (
  row: LegacyValueRow,
  fallbackSortOrder: number
): ParsedLegacyValue | null => {
  const legacyUuid = normalizeLegacyUuid(row[FIELDS.uuid]);
  if (legacyUuid.length === 0) return null;
  const englishLabel = normalizeLegacyLabel(row[FIELDS.english]);
  const childLabel = normalizeLegacyLabel(row[FIELDS.childEnglish]);

  return {
    createdAt: parseLegacyTimestamp(row[FIELDS.creationTimestamp]),
    label: resolveLegacyValueLabel(englishLabel, childLabel, legacyUuid),
    legacyListUuids: extractLegacyUuids(row[FIELDS.uuidList]),
    legacyParentUuids: extractLegacyUuids(row[FIELDS.parentUuid]),
    legacyUuid,
    sortOrder:
      parseInteger(row[FIELDS.sortValue]) ??
      parseInteger(row[FIELDS.serialValue]) ??
      fallbackSortOrder,
    updatedAt: parseLegacyTimestamp(row[FIELDS.modificationTimestamp]),
  };
};

export const parseParametersFromRow = (row: LegacyValueRow): ParsedLegacyParameter[] => {
  const labeledUuid = normalizeLegacyUuid(row[FIELDS.listUuid] ?? row[FIELDS.valueListUuid]);
  const listLabel = normalizeLegacyLabel(row[FIELDS.listEnglish]);
  const valueListLabel = normalizeLegacyLabel(row[FIELDS.valueListText]);
  const labeledLabel = listLabel.length > 0 ? listLabel : valueListLabel;
  const parameters = extractLegacyUuids(row[FIELDS.uuidList]).map(
    (legacyUuid: string): ParsedLegacyParameter => ({
      label: legacyUuid === labeledUuid && labeledLabel.length > 0 ? labeledLabel : legacyUuid,
      legacyUuid,
    })
  );
  if (labeledUuid.length > 0) {
    parameters.push({
      label: labeledLabel.length > 0 ? labeledLabel : labeledUuid,
      legacyUuid: labeledUuid,
    });
  }
  return parameters;
};
