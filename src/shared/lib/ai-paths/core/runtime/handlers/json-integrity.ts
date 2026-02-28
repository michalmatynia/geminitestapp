export type JsonIntegrityPolicy = 'strict' | 'repair';

export type JsonIntegrityParseState = 'not_json_like' | 'parsed' | 'repaired' | 'unparseable';

export type JsonIntegrityDiagnostic = {
  rawType: string;
  parseState: JsonIntegrityParseState;
  repairApplied: boolean;
  parseError?: string;
  truncationDetected?: boolean;
  repairSteps?: string[];
};

export type JsonIntegrityNormalizationResult = {
  value: unknown;
  state: JsonIntegrityParseState;
  repaired: boolean;
  diagnostic: JsonIntegrityDiagnostic;
};

const JSON_OBJECT_BOUNDARY_REPAIR_REGEX = /(:\s*\{[^{}]*\})(\s*,\s*\{)/g;
const TRAILING_COMMAS_BEFORE_CLOSER_REGEX = /,\s*([}\]])/g;
const MARKDOWN_FENCE_REGEX = /```(?:[A-Za-z0-9_-]+)?\s*([\s\S]*?)```/m;

const toRawType = (value: unknown): string => {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'null';
  return typeof value;
};

const looksLikeJsonContainer = (value: string): boolean => {
  return (
    (value.startsWith('{') && value.endsWith('}')) || (value.startsWith('[') && value.endsWith(']'))
  );
};

const looksJsonish = (value: string): boolean => {
  if (looksLikeJsonContainer(value)) return true;
  if (value.includes('```')) return true;
  return value.includes('{') || value.includes('[');
};

const isStructuredValue = (value: unknown): boolean => Boolean(value) && typeof value === 'object';

export const normalizeJsonIntegrityPolicy = (value: unknown): JsonIntegrityPolicy =>
  value === 'strict' ? 'strict' : 'repair';

export const repairMalformedJsonLikeString = (value: string): string => {
  let next = value;
  for (let pass = 0; pass < 3; pass += 1) {
    const repaired = next.replace(JSON_OBJECT_BOUNDARY_REPAIR_REGEX, '$1}$2');
    if (repaired === next) break;
    next = repaired;
  }
  return next;
};

const toParseError = (error: unknown): string => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return String(error);
};

const tryParseStructuredJson = (
  candidate: string
): { ok: true; value: unknown } | { ok: false; error: string } => {
  try {
    const parsed = JSON.parse(candidate) as unknown;
    if (!isStructuredValue(parsed)) {
      return {
        ok: false,
        error: 'Parsed JSON value is not an object/array.',
      };
    }
    return { ok: true, value: parsed };
  } catch (error) {
    return { ok: false, error: toParseError(error) };
  }
};

const stripMarkdownCodeFences = (value: string): string => {
  const fullFence = value.match(/^```(?:[A-Za-z0-9_-]+)?\s*([\s\S]*?)\s*```$/);
  if (fullFence?.[1]) {
    return fullFence[1].trim();
  }
  const snippetFence = value.match(MARKDOWN_FENCE_REGEX);
  if (snippetFence?.[1]) {
    return snippetFence[1].trim();
  }
  return value;
};

const computeMissingClosers = (value: string): string => {
  const stack: string[] = [];
  let inString = false;
  let escaped = false;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (!char) continue;
    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (char === '"') {
        inString = false;
      }
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === '{' || char === '[') {
      stack.push(char);
      continue;
    }
    if (char !== '}' && char !== ']') continue;

    const open = stack.at(-1);
    if (!open) continue;
    if ((open === '{' && char === '}') || (open === '[' && char === ']')) {
      stack.pop();
    }
  }

  if (stack.length === 0) return '';
  return stack
    .reverse()
    .map((open: string): string => (open === '{' ? '}' : ']'))
    .join('');
};

const closeUnbalancedJsonContainers = (
  value: string
): { value: string; truncationDetected: boolean } => {
  const missingClosers = computeMissingClosers(value);
  if (!missingClosers) {
    return { value, truncationDetected: false };
  }
  return {
    value: `${value}${missingClosers}`,
    truncationDetected: true,
  };
};

const stripTrailingCommasBeforeClosers = (value: string): string =>
  value.replace(TRAILING_COMMAS_BEFORE_CLOSER_REGEX, '$1');

export const normalizeJsonLikeValue = (
  value: unknown,
  policy: JsonIntegrityPolicy = 'repair'
): JsonIntegrityNormalizationResult => {
  const rawType = toRawType(value);
  if (typeof value !== 'string') {
    if (isStructuredValue(value)) {
      return {
        value,
        state: 'parsed',
        repaired: false,
        diagnostic: {
          rawType,
          parseState: 'parsed',
          repairApplied: false,
        },
      };
    }
    return {
      value,
      state: 'not_json_like',
      repaired: false,
      diagnostic: {
        rawType,
        parseState: 'not_json_like',
        repairApplied: false,
      },
    };
  }

  const trimmed = value.trim();
  if (!trimmed || !looksJsonish(trimmed)) {
    return {
      value,
      state: 'not_json_like',
      repaired: false,
      diagnostic: {
        rawType,
        parseState: 'not_json_like',
        repairApplied: false,
      },
    };
  }

  const rawAttempt = tryParseStructuredJson(trimmed);
  if (rawAttempt.ok) {
    return {
      value: rawAttempt.value,
      state: 'parsed',
      repaired: false,
      diagnostic: {
        rawType,
        parseState: 'parsed',
        repairApplied: false,
      },
    };
  }

  const buildUnparseable = (
    parseError: string,
    truncationDetected: boolean,
    repairSteps: string[]
  ): JsonIntegrityNormalizationResult => ({
    value,
    state: 'unparseable',
    repaired: false,
    diagnostic: {
      rawType,
      parseState: 'unparseable',
      repairApplied: false,
      parseError,
      truncationDetected,
      repairSteps,
    },
  });

  if (policy === 'strict') {
    return buildUnparseable(rawAttempt.error, Boolean(computeMissingClosers(trimmed)), []);
  }

  let lastParseError = rawAttempt.error;
  let truncationDetected = Boolean(computeMissingClosers(trimmed));
  const repairSteps: string[] = [];
  let working = trimmed;
  const repairCandidates: Array<{
    step: string;
    transform: (candidate: string) => { value: string; truncationDetected?: boolean };
  }> = [
    {
      step: 'strip_markdown_code_fences',
      transform: (candidate: string) => ({
        value: stripMarkdownCodeFences(candidate),
      }),
    },
    {
      step: 'repair_object_boundaries',
      transform: (candidate: string) => ({
        value: repairMalformedJsonLikeString(candidate),
      }),
    },
    {
      step: 'append_missing_container_closers',
      transform: (candidate: string) => closeUnbalancedJsonContainers(candidate),
    },
    {
      step: 'strip_trailing_commas_before_closers',
      transform: (candidate: string) => ({
        value: stripTrailingCommasBeforeClosers(candidate),
      }),
    },
  ];

  for (const candidate of repairCandidates) {
    const transformed = candidate.transform(working);
    if (transformed.value === working) continue;
    working = transformed.value;
    repairSteps.push(candidate.step);
    if (transformed.truncationDetected) {
      truncationDetected = true;
    } else if (!truncationDetected) {
      truncationDetected = Boolean(computeMissingClosers(working));
    }
    const parsedAttempt = tryParseStructuredJson(working);
    if (parsedAttempt.ok) {
      return {
        value: parsedAttempt.value,
        state: 'repaired',
        repaired: true,
        diagnostic: {
          rawType,
          parseState: 'repaired',
          repairApplied: true,
          parseError: lastParseError,
          truncationDetected,
          repairSteps,
        },
      };
    }
    lastParseError = parsedAttempt.error;
  }

  return buildUnparseable(lastParseError, truncationDetected, repairSteps);
};
