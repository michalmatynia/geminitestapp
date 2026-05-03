import { formatDatabaseCellValue } from '../components/format-cell-value';

export { formatDatabaseCellValue };

const BOOLEAN_TYPES = ['bool', 'boolean', 'bit'];
const NUMBER_TYPES = ['int', 'number', 'float', 'double', 'decimal', 'real', 'bigint', 'smallint', 'long', 'short'];
const OBJECT_TYPES = ['object', 'array', 'json', 'document', 'map'];

function shouldParseAsBoolean(columnType: string): boolean {
  const normalizedType = columnType.toLowerCase();
  return BOOLEAN_TYPES.some((type) => normalizedType.includes(type));
}

function shouldParseAsNumber(columnType: string): boolean {
  const normalizedType = columnType.toLowerCase();
  return NUMBER_TYPES.some((type) => normalizedType.includes(type));
}

function shouldParseAsJson(columnType: string): boolean {
  const normalizedType = columnType.toLowerCase();
  return OBJECT_TYPES.some((type) => normalizedType.includes(type));
}

export function parseInputValue(value: string, columnType: string): unknown {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return '';
  }
  if (shouldParseAsBoolean(columnType)) return parseBooleanValue(trimmed);
  if (shouldParseAsNumber(columnType)) return parseNumericValue(trimmed);
  if (shouldParseAsJson(columnType)) return parseJsonLikeValue(trimmed);
  return trimmed;
}

function parseBooleanValue(trimmed: string): boolean | string {
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  return trimmed;
}

function parseNumericValue(trimmed: string): number | string {
  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? trimmed : parsed;
}

function parseJsonLikeValue(trimmed: string): unknown {
  if (trimmed === 'null') {
    return null;
  }

  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    return trimmed;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return trimmed;
  }
}
