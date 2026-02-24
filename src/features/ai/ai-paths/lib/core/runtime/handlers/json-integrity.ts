export type JsonIntegrityPolicy = 'strict' | 'repair';

export type JsonIntegrityParseState =
  | 'not_json_like'
  | 'parsed'
  | 'repaired'
  | 'unparseable';

export type JsonIntegrityDiagnostic = {
  rawType: string;
  parseState: JsonIntegrityParseState;
  repairApplied: boolean;
};

export type JsonIntegrityNormalizationResult = {
  value: unknown;
  state: JsonIntegrityParseState;
  repaired: boolean;
  diagnostic: JsonIntegrityDiagnostic;
};

const JSON_OBJECT_BOUNDARY_REPAIR_REGEX =
  /(:\s*\{[^{}]*\})(\s*,\s*\{)/g;

const toRawType = (value: unknown): string => {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'null';
  return typeof value;
};

const looksLikeJsonContainer = (value: string): boolean => {
  return (
    (value.startsWith('{') && value.endsWith('}')) ||
    (value.startsWith('[') && value.endsWith(']'))
  );
};

const isStructuredValue = (value: unknown): boolean =>
  Boolean(value) && typeof value === 'object';

export const normalizeJsonIntegrityPolicy = (
  value: unknown
): JsonIntegrityPolicy => (value === 'strict' ? 'strict' : 'repair');

export const repairMalformedJsonLikeString = (value: string): string => {
  let next = value;
  for (let pass = 0; pass < 3; pass += 1) {
    const repaired = next.replace(
      JSON_OBJECT_BOUNDARY_REPAIR_REGEX,
      '$1}$2'
    );
    if (repaired === next) break;
    next = repaired;
  }
  return next;
};

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
  if (!trimmed || !looksLikeJsonContainer(trimmed)) {
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

  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (isStructuredValue(parsed)) {
      return {
        value: parsed,
        state: 'parsed',
        repaired: false,
        diagnostic: {
          rawType,
          parseState: 'parsed',
          repairApplied: false,
        },
      };
    }
  } catch {
    // Try repair below when allowed.
  }

  if (policy === 'repair') {
    const repairedCandidate = repairMalformedJsonLikeString(trimmed);
    if (repairedCandidate !== trimmed) {
      try {
        const repairedParsed: unknown = JSON.parse(repairedCandidate);
        if (isStructuredValue(repairedParsed)) {
          return {
            value: repairedParsed,
            state: 'repaired',
            repaired: true,
            diagnostic: {
              rawType,
              parseState: 'repaired',
              repairApplied: true,
            },
          };
        }
      } catch {
        // Fall through to unparseable.
      }
    }
  }

  return {
    value,
    state: 'unparseable',
    repaired: false,
    diagnostic: {
      rawType,
      parseState: 'unparseable',
      repairApplied: false,
    },
  };
};
