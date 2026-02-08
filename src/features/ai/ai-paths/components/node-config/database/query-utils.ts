export type QueryValidationStatus = 'empty' | 'valid' | 'warning' | 'error';

export type QueryValidationIssue = {
  id: string;
  severity: 'error' | 'warning' | 'info';
  title: string;
  message: string;
};

export type ValidationPaletteRule = {
  id: string;
  title: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  pattern: string;
  flags?: string | undefined;
};

export type QueryValidationResult = {
  status: QueryValidationStatus;
  message: string;
  line?: number;
  column?: number;
  snippet?: string;
  hints?: string[];
  issues?: QueryValidationIssue[];
};

const compileRegex = (pattern: string, flags?: string | undefined): RegExp | null => {
  try {
    return new RegExp(pattern, flags);
  } catch {
    return null;
  }
};

export const buildValidationIssues = (
  value: string,
  rules: ValidationPaletteRule[]
): QueryValidationIssue[] => {
  const trimmed = (value ?? '').trim();
  if (!trimmed || rules.length === 0) return [];
  const issues: QueryValidationIssue[] = [];
  rules.forEach((rule: ValidationPaletteRule) => {
    const regex = compileRegex(rule.pattern, rule.flags);
    if (!regex) {
      issues.push({
        id: rule.id,
        severity: 'warning',
        title: rule.title,
        message: `Invalid regex pattern for "${rule.title}".`,
      });
      return;
    }
    if (regex.test(trimmed)) return;
    issues.push({
      id: rule.id,
      severity: rule.severity,
      title: rule.title,
      message: rule.message || `Missing expected pattern: ${rule.title}.`,
    });
  });
  return issues;
};

export const mergeValidationIssues = (
  base: QueryValidationResult,
  issues: QueryValidationIssue[]
): QueryValidationResult => {
  if (!issues.length) return base;
  if (base.status === 'empty') return base;
  const hasError = issues.some((issue: QueryValidationIssue) => issue.severity === 'error');
  const hasWarning = issues.some((issue: QueryValidationIssue) => issue.severity === 'warning');
  const nextStatus: QueryValidationStatus =
    base.status === 'error'
      ? 'error'
      : hasError
        ? 'error'
        : hasWarning
          ? 'warning'
          : base.status;
  const nextMessage =
    base.status === 'valid'
      ? hasError
        ? 'Validation errors detected.'
        : hasWarning
          ? 'Validation warnings detected.'
          : base.message
      : base.message;
  return {
    ...base,
    status: nextStatus,
    message: nextMessage,
    issues,
  };
};

export const getQueryPlaceholderByOperation = (operation: string): string => {
  switch (operation) {
    case 'query':
      return '{\n  "_id": "{{value}}"\n}';
    case 'update':
      return '{\n  "$set": {\n    "fieldName": "{{value}}"\n  }\n}';
    case 'insert':
      return '{\n  "fieldName": "value",\n  "createdAt": "{{timestamp}}"\n}';
    case 'delete':
      return '{\n  "_id": "{{value}}"\n}';
    default:
      return '{\n  "_id": "{{value}}"\n}';
  }
};

export const getQueryPlaceholderByAction = (action?: string): string => {
  switch (action) {
    case 'aggregate':
      return '[\n  { "$match": { "_id": "{{value}}" } }\n]';
    case 'countDocuments':
      return '{\n  "status": "{{value}}"\n}';
    case 'distinct':
      return '{\n  "status": "{{value}}"\n}';
    case 'findOne':
      return '{\n  "_id": "{{value}}"\n}';
    case 'find':
      return '{\n  "_id": "{{value}}"\n}';
    case 'updateOne':
    case 'updateMany':
    case 'replaceOne':
    case 'findOneAndUpdate':
    case 'deleteOne':
    case 'deleteMany':
    case 'findOneAndDelete':
      return '{\n  "_id": "{{value}}"\n}';
    case 'insertOne':
      return '{\n  "fieldName": "value"\n}';
    case 'insertMany':
      return '[\n  { "fieldName": "value" }\n]';
    default:
      return '{\n  "_id": "{{value}}"\n}';
  }
};

export const getUpdatePlaceholderByAction = (action?: string): string => {
  if (action === 'replaceOne') {
    return '{\n  "fieldName": "value"\n}';
  }
  return '{\n  "$set": {\n    "fieldName": "{{value}}"\n  }\n}';
};

export const formatAndFixMongoQuery = (value: string): string => {
  let fixed = value ?? '';

  // Remove comments (single line // and multi-line /* */)
  fixed = fixed.replace(/\/\*[\s\S]*?\*\//g, '');
  fixed = fixed.replace(/\/\/.*/g, '');

  // Fix single quotes to double quotes (but be careful with escaped quotes)
  fixed = fixed.replace(/'/g, '"');

  // Remove trailing commas before closing brackets
  fixed = fixed.replace(/,(\s*[}\]])/g, '$1');

  // Replace undefined with null
  fixed = fixed.replace(/:\s*undefined\b/g, ': null');

  // Replace JavaScript boolean/null keywords if lowercase
  fixed = fixed.replace(/:\s*true\b/g, ': true');
  fixed = fixed.replace(/:\s*false\b/g, ': false');
  fixed = fixed.replace(/:\s*null\b/g, ': null');

  // Fix ObjectId(...) to string format
  fixed = fixed.replace(/ObjectId\s*\(\s*"([^"]+)"\s*\)/gi, '"$1"');
  fixed = fixed.replace(/ObjectId\s*\(\s*'([^']+)'\s*\)/gi, '"$1"');

  // Fix unquoted keys (basic pattern matching)
  fixed = fixed.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":');

  // Fix Date objects
  fixed = fixed.replace(/new\s+Date\s*\(\s*"([^"]+)"\s*\)/gi, '"$1"');
  fixed = fixed.replace(/new\s+Date\s*\(\s*'([^']+)'\s*\)/gi, '"$1"');

  // Remove excess whitespace between tokens
  fixed = fixed.replace(/\s*:\s*/g, ': ');
  fixed = fixed.replace(/\s*,\s*/g, ', ');

  // Ensure the query starts with { or [
  fixed = fixed.trim();
  if (!fixed.startsWith('{') && !fixed.startsWith('[')) {
    // Try to wrap as object
    if (fixed.includes(':')) {
      fixed = `{\n  ${fixed}\n}`;
    }
  }

  // Try to parse and pretty-print
  try {
    const parsed: unknown = JSON.parse(fixed);
    return JSON.stringify(parsed, null, 2);
  } catch {
    // If still invalid, return the partially fixed version with basic formatting
    try {
      // Try one more time with more aggressive fixes
      fixed = fixed.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":');
      const parsed: unknown = JSON.parse(fixed);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return fixed;
    }
  }
};

export const buildMongoQueryValidation = (value: string): QueryValidationResult => {
  const raw = value ?? '';
  const trimmed = raw.trim();
  if (!trimmed) {
    return { status: 'empty', message: 'Query is empty.' };
  }
  try {
    JSON.parse(raw);
    return { status: 'valid', message: 'Valid JSON query.' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid JSON query.';
    const match = message.match(/position\s+(?<pos>\d+)/i);
    let line: number | undefined;
    let column: number | undefined;
    let snippet: string | undefined;
    if (match?.groups?.['pos']) {
      const position = Number(match.groups['pos']);
      if (!Number.isNaN(position)) {
        const clamped = Math.max(0, Math.min(raw.length, position));
        const before = raw.slice(0, clamped);
        const lines = before.split('\n');
        line = lines.length;
        const lastLine = lines[lines.length - 1] ?? '';
        column = lastLine.length + 1;
        const allLines = raw.split('\n');
        const lineText = allLines[line - 1] ?? '';
        const caret = `${' '.repeat(Math.max(0, column - 1))}^`;
        snippet = lineText ? `${lineText}\n${caret}` : caret;
      }
    }
    const hints: string[] = [];
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
      hints.push('Start with a JSON object, e.g. { "field": "value" }.');
    }
    if (raw.includes('\'')) {
      hints.push('Use double quotes for keys and string values.');
    }
    if (/\bObjectId\s*\(/.test(raw)) {
      hints.push('Wrap ObjectId values in quotes (strict JSON).');
    }
    if (/\bundefined\b/.test(raw)) {
      hints.push('Replace undefined with null or remove the field.');
    }
    if (/,\s*[}\]]/.test(raw)) {
      hints.push('Remove trailing commas.');
    }
    if (hints.length === 0) {
      hints.push('Ensure keys and string values are quoted with double quotes.');
    }
    const errorResult: QueryValidationResult = {
      status: 'error',
      message,
      hints,
    };
    if (line !== undefined) errorResult.line = line;
    if (column !== undefined) errorResult.column = column;
    if (snippet !== undefined) errorResult.snippet = snippet;
    return errorResult;
  }
};

export const buildJsonQueryValidation = (value: string): QueryValidationResult => {
  const raw = value ?? '';
  const trimmed = raw.trim();
  if (!trimmed) {
    return { status: 'empty', message: 'Query is empty.' };
  }
  try {
    JSON.parse(raw);
    return { status: 'valid', message: 'Valid JSON query.' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid JSON query.';
    const match = message.match(/position\s+(?<pos>\d+)/i);
    let line: number | undefined;
    let column: number | undefined;
    let snippet: string | undefined;
    if (match?.groups?.['pos']) {
      const position = Number(match.groups['pos']);
      if (!Number.isNaN(position)) {
        const clamped = Math.max(0, Math.min(raw.length, position));
        const before = raw.slice(0, clamped);
        const lines = before.split('\n');
        line = lines.length;
        const lastLine = lines[lines.length - 1] ?? '';
        column = lastLine.length + 1;
        const allLines = raw.split('\n');
        const lineText = allLines[line - 1] ?? '';
        const caret = `${' '.repeat(Math.max(0, column - 1))}^`;
        snippet = lineText ? `${lineText}\n${caret}` : caret;
      }
    }
    const hints: string[] = [];
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
      hints.push('Start with a JSON object, e.g. { "field": "value" }.');
    }
    if (raw.includes('\'')) {
      hints.push('Use double quotes for keys and string values.');
    }
    if (/,\s*[}\]]/.test(raw)) {
      hints.push('Remove trailing commas.');
    }
    if (hints.length === 0) {
      hints.push('Ensure the JSON is valid and properly quoted.');
    }
    const errorResult: QueryValidationResult = {
      status: 'error',
      message,
      hints,
    };
    if (line !== undefined) errorResult.line = line;
    if (column !== undefined) errorResult.column = column;
    if (snippet !== undefined) errorResult.snippet = snippet;
    return errorResult;
  }
};

type PrismaConversionResult =
  | { ok: true; value: string; warnings: string[]; changed: boolean }
  | { ok: false; error: string; warnings: string[] };

const hasMongoMarkers = (value: string): boolean =>
  /\$[a-zA-Z]+/.test(value) || /"_id"\s*:/.test(value);

const normalizeString = (value: unknown): string | null =>
  typeof value === 'string' ? value : null;

const ensureArray = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : value === undefined ? [] : [value];

const convertMongoFieldCondition = (
  value: Record<string, unknown>,
  warnings: string[],
  onChange: () => void,
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  for (const [key, rawVal] of Object.entries(value)) {
    switch (key) {
      case '$eq':
        result['equals'] = rawVal;
        onChange();
        break;
      case '$ne':
        result['not'] = rawVal;
        onChange();
        break;
      case '$gt':
        result['gt'] = rawVal;
        onChange();
        break;
      case '$gte':
        result['gte'] = rawVal;
        onChange();
        break;
      case '$lt':
        result['lt'] = rawVal;
        onChange();
        break;
      case '$lte':
        result['lte'] = rawVal;
        onChange();
        break;
      case '$in':
        result['in'] = ensureArray(rawVal);
        onChange();
        break;
      case '$nin':
        result['notIn'] = ensureArray(rawVal);
        onChange();
        break;
      case '$regex': {
        const pattern = normalizeString(rawVal);
        if (pattern) {
          result['contains'] = pattern;
          onChange();
        }
        break;
      }
      case '$options':
        if (rawVal === 'i') {
          result['mode'] = 'insensitive';
          onChange();
        }
        break;
      case '$exists':
        if (rawVal === true) {
          result['not'] = null;
          onChange();
        } else if (rawVal === false) {
          result['equals'] = null;
          onChange();
        }
        break;
      case '$not':
        if (rawVal && typeof rawVal === 'object' && !Array.isArray(rawVal)) {
          result['not'] = convertMongoFieldCondition(
            rawVal as Record<string, unknown>,
            warnings,
            onChange,
          );
          onChange();
        }
        break;
      default:
        warnings.push(`Unsupported Mongo operator "${key}"`);
        break;
    }
  }
  return result;
};

const convertMongoWhere = (
  value: unknown,
  warnings: string[],
  onChange: () => void,
): unknown => {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    return value.map((entry) => convertMongoWhere(entry, warnings, onChange));
  }
  const obj = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  const operatorKeys = Object.keys(obj).filter((key) => key.startsWith('$'));
  if (operatorKeys.length > 0) {
    for (const key of operatorKeys) {
      const rawVal = obj[key];
      switch (key) {
        case '$and':
          result['AND'] = ensureArray(rawVal).map((entry) =>
            convertMongoWhere(entry, warnings, onChange),
          );
          onChange();
          break;
        case '$or':
          result['OR'] = ensureArray(rawVal).map((entry) =>
            convertMongoWhere(entry, warnings, onChange),
          );
          onChange();
          break;
        case '$nor':
          result['NOT'] = ensureArray(rawVal).map((entry) =>
            convertMongoWhere(entry, warnings, onChange),
          );
          onChange();
          break;
        default:
          warnings.push(`Unsupported Mongo operator "${key}"`);
          break;
      }
    }
    return result;
  }

  for (const [key, rawVal] of Object.entries(obj)) {
    const targetKey = key === '_id' ? 'id' : key;
    if (targetKey !== key) onChange();
    if (rawVal && typeof rawVal === 'object' && !Array.isArray(rawVal)) {
      const rawObj = rawVal as Record<string, unknown>;
      const hasOperator = Object.keys(rawObj).some((k) => k.startsWith('$'));
      if (hasOperator) {
        const converted = convertMongoFieldCondition(rawObj, warnings, onChange);
        result[targetKey] = Object.keys(converted).length ? converted : rawVal;
        continue;
      }
      result[targetKey] = convertMongoWhere(rawObj, warnings, onChange);
      continue;
    }
    result[targetKey] = rawVal;
  }
  return result;
};

const convertMongoUpdate = (
  value: Record<string, unknown>,
  warnings: string[],
  onChange: () => void,
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  const hasOperator = Object.keys(value).some((key) => key.startsWith('$'));
  if (!hasOperator) {
    return value;
  }
  const apply = (field: string, updateValue: unknown): void => {
    result[field] = updateValue;
  };
  for (const [key, rawVal] of Object.entries(value)) {
    switch (key) {
      case '$set':
        if (rawVal && typeof rawVal === 'object' && !Array.isArray(rawVal)) {
          Object.assign(result, rawVal as Record<string, unknown>);
          onChange();
        }
        break;
      case '$unset':
        if (rawVal && typeof rawVal === 'object' && !Array.isArray(rawVal)) {
          Object.keys(rawVal as Record<string, unknown>).forEach((field) => {
            apply(field, null);
          });
          onChange();
        }
        break;
      case '$inc':
        if (rawVal && typeof rawVal === 'object' && !Array.isArray(rawVal)) {
          Object.entries(rawVal as Record<string, unknown>).forEach(([field, amount]) => {
            apply(field, { increment: amount });
          });
          onChange();
        }
        break;
      case '$mul':
        if (rawVal && typeof rawVal === 'object' && !Array.isArray(rawVal)) {
          Object.entries(rawVal as Record<string, unknown>).forEach(([field, amount]) => {
            apply(field, { multiply: amount });
          });
          onChange();
        }
        break;
      case '$push':
        if (rawVal && typeof rawVal === 'object' && !Array.isArray(rawVal)) {
          Object.entries(rawVal as Record<string, unknown>).forEach(([field, entry]) => {
            apply(field, { push: entry });
          });
          onChange();
        }
        break;
      case '$addToSet':
        warnings.push('Prisma does not enforce unique in list updates; $addToSet mapped to push.');
        if (rawVal && typeof rawVal === 'object' && !Array.isArray(rawVal)) {
          Object.entries(rawVal as Record<string, unknown>).forEach(([field, entry]) => {
            apply(field, { push: entry });
          });
          onChange();
        }
        break;
      case '$setOnInsert':
      case '$rename':
      case '$pull':
      case '$pullAll':
      case '$pop':
      case '$currentDate':
      case '$bit':
        warnings.push(`Unsupported Mongo update operator "${key}"`);
        break;
      default:
        warnings.push(`Unsupported Mongo update operator "${key}"`);
        break;
    }
  }
  return Object.keys(result).length ? result : value;
};

export const convertMongoToPrismaQuery = (
  raw: string,
  mode: 'query' | 'update',
): PrismaConversionResult => {
  const warnings: string[] = [];
  if (!raw.trim()) {
    return { ok: false, error: 'Query is empty.', warnings };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Invalid JSON',
      warnings,
    };
  }
  if (Array.isArray(parsed)) {
    return {
      ok: false,
      error: 'Aggregation pipelines cannot be converted to Prisma.',
      warnings,
    };
  }
  if (!parsed || typeof parsed !== 'object') {
    return {
      ok: false,
      error: 'Query must be a JSON object.',
      warnings,
    };
  }
  let changed = false;
  const markChanged = (): void => {
    changed = true;
  };
  const converted =
    mode === 'update'
      ? convertMongoUpdate(parsed as Record<string, unknown>, warnings, markChanged)
      : convertMongoWhere(parsed, warnings, markChanged);
  if (!changed && hasMongoMarkers(raw)) {
    changed = true;
  }
  return {
    ok: true,
    value: JSON.stringify(converted, null, 2),
    warnings,
    changed,
  };
};
