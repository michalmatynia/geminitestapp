type PlaceholderValue = string | number | null | undefined;
export type ScrapeTemplateValues = Record<string, PlaceholderValue>;

export const PLACEHOLDER_PATTERN = /\[([^\]\r\n]+)\]/g;

const PLACEHOLDER_KEY_PATTERN = /^[a-zA-Z][a-zA-Z0-9_.-]*/;
const TITLE_CASE_WORD_PATTERN = /[\p{L}\p{N}]*\p{L}[\p{L}\p{N}]*/gu;
const TITLE_CASE_FIRST_LETTER_PATTERN = /\p{L}/u;
const QUOTED_TRANSFORM_ARG_PATTERN = /^"((?:\\.|[^"\\])*)"$/;

type PlaceholderTransform =
  | { kind: 'remove'; value: string }
  | { kind: 'titlecase' }
  | { kind: 'trim' };

type ParsedPlaceholderExpression = {
  key: string;
  transforms: PlaceholderTransform[];
};

type ParsedTransformCall = {
  argument: string | null;
  name: string;
};

const valueToString = (value: PlaceholderValue): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  return value;
};

export const toTitleCase = (value: PlaceholderValue): string => {
  const normalized = valueToString(value).trim().toLowerCase();
  if (normalized.length === 0) return '';
  return normalized.replace(TITLE_CASE_WORD_PATTERN, (word: string): string => {
    const firstLetterIndex = word.search(TITLE_CASE_FIRST_LETTER_PATTERN);
    if (firstLetterIndex < 0) return word;
    return [
      word.slice(0, firstLetterIndex),
      word.charAt(firstLetterIndex).toLocaleUpperCase(),
      word.slice(firstLetterIndex + 1),
    ].join('');
  });
};

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const unescapeQuotedTransformArg = (value: string): string =>
  value.replace(/\\(["\\])/g, '$1');

const parseTransformArg = (rawValue: string): string => {
  const trimmed = rawValue.trim();
  const quotedMatch = QUOTED_TRANSFORM_ARG_PATTERN.exec(trimmed);
  if (quotedMatch !== null) return unescapeQuotedTransformArg(quotedMatch[1] ?? '');
  return trimmed;
};

const normalizeTransformName = (value: string): string =>
  value.trim().toLowerCase().replace(/[\s_-]+/g, '');

const parseTransformCall = (body: string): ParsedTransformCall => {
  const separatorIndex = body.indexOf(':');
  if (separatorIndex < 0) return { argument: null, name: body };
  return {
    argument: body.slice(separatorIndex + 1),
    name: body.slice(0, separatorIndex),
  };
};

const parsePlaceholderTransform = (body: string): PlaceholderTransform | null => {
  const { argument, name } = parseTransformCall(body);
  const normalizedName = normalizeTransformName(name);

  if (argument !== null) {
    if (normalizedName !== 'remove') return null;
    return { kind: 'remove', value: parseTransformArg(argument) };
  }
  if (normalizedName === 'titlecase') return { kind: 'titlecase' };
  if (normalizedName === 'trim') return { kind: 'trim' };
  return null;
};

const readTransformBody = (
  expression: string,
  startIndex: number
): { body: string; nextIndex: number } | null => {
  let quoteOpen = false;
  let escaped = false;
  for (let index = startIndex; index < expression.length; index += 1) {
    const character = expression[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (quoteOpen) {
      if (character === '\\') escaped = true;
      else if (character === '"') quoteOpen = false;
      continue;
    }
    if (character === '"') {
      quoteOpen = true;
      continue;
    }
    if (character === ')') {
      return {
        body: expression.slice(startIndex, index),
        nextIndex: index + 1,
      };
    }
  }
  return null;
};

const parsePlaceholderExpression = (expression: string): ParsedPlaceholderExpression | null => {
  const keyMatch = PLACEHOLDER_KEY_PATTERN.exec(expression);
  if (keyMatch === null) return null;
  let cursor = keyMatch[0].length;
  const transforms: PlaceholderTransform[] = [];

  while (cursor < expression.length) {
    if (/\s/.test(expression[cursor] ?? '')) {
      cursor += 1;
      continue;
    }
    if (expression[cursor] !== '(') return null;
    const transformBody = readTransformBody(expression, cursor + 1);
    if (transformBody === null) return null;
    const transform = parsePlaceholderTransform(transformBody.body);
    if (transform === null) return null;
    transforms.push(transform);
    cursor = transformBody.nextIndex;
  }

  return {
    key: keyMatch[0],
    transforms,
  };
};

const applyPlaceholderTransform = (value: string, transform: PlaceholderTransform): string => {
  if (transform.kind === 'titlecase') return toTitleCase(value);
  if (transform.kind === 'trim') return value.trim();
  if (transform.value.length === 0) return value;
  const removePattern = new RegExp(escapeRegExp(transform.value), 'gi');
  return value.replace(removePattern, '');
};

export const renderPlaceholderExpression = (
  expression: string,
  values: ScrapeTemplateValues,
  fallback: string
): string => {
  const parsed = parsePlaceholderExpression(expression);
  if (parsed === null) return fallback;
  const baseValue = valueToString(values[parsed.key]);
  return parsed.transforms.reduce(
    (currentValue: string, transform: PlaceholderTransform): string =>
      applyPlaceholderTransform(currentValue, transform),
    baseValue
  );
};
