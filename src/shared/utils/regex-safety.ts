const ALLOWED_REGEX_FLAGS = new Set<string>(['d', 'g', 'i', 'm', 's', 'u', 'v', 'y']);
const MAX_REGEX_PATTERN_LENGTH = 512;
const MAX_REGEX_FLAGS_LENGTH = 8;
const OPEN_ENDED_QUANTIFIER_PATTERN = String.raw`(?:[+*]|\{\s*\d+\s*,\s*\})`;
const GROUP_BODY_PATTERN = String.raw`(?:[^()[\s\]]|\.)*`;

type RegexSafetyFailureCode =
  | 'pattern_too_long'
  | 'flags_too_long'
  | 'invalid_flag'
  | 'duplicate_flag'
  | 'potential_backtracking';

export type RegexSafetyResult =
  | { ok: true; normalizedFlags: string | null }
  | {
      ok: false;
      code: RegexSafetyFailureCode;
      message: string;
      detail?: string | undefined;
    };

const POTENTIAL_BACKTRACKING_PATTERNS: RegExp[] = [
  new RegExp(
    String.raw`\(${GROUP_BODY_PATTERN}${OPEN_ENDED_QUANTIFIER_PATTERN}${GROUP_BODY_PATTERN}\)\s*${OPEN_ENDED_QUANTIFIER_PATTERN}`
  ),
  new RegExp(
    String.raw`\(${GROUP_BODY_PATTERN}\|\s*${GROUP_BODY_PATTERN}\)\s*${OPEN_ENDED_QUANTIFIER_PATTERN}`
  ),
  /\.\*.\*|\.\+\.\+|\.\*\.\+|\.\+\.\*/,
];

const normalizeFlags = (rawFlags: string | null | undefined): string | null => {
  if (rawFlags === null || rawFlags === undefined || rawFlags.length === 0) {
    return null;
  }
  const trimmed = rawFlags.trim();
  if (trimmed.length === 0) {
    return null;
  }
  return trimmed;
};

const validateFlagsContent = (flags: string): RegexSafetyResult | null => {
  const seen = new Set<string>();
  for (const flag of flags) {
    if (!ALLOWED_REGEX_FLAGS.has(flag)) {
      return {
        ok: false,
        code: 'invalid_flag',
        message: `Unsupported regex flag "${flag}".`,
      };
    }
    if (seen.has(flag)) {
      return {
        ok: false,
        code: 'duplicate_flag',
        message: `Duplicate regex flag "${flag}".`,
      };
    }
    seen.add(flag);
  }
  return null;
};

export const validateRegexSafety = (
  regexSource: string,
  rawFlags: string | null | undefined
): RegexSafetyResult => {
  if (regexSource.length > MAX_REGEX_PATTERN_LENGTH) {
    return {
      ok: false,
      code: 'pattern_too_long',
      message: `Regex pattern is too long (max ${MAX_REGEX_PATTERN_LENGTH} chars).`,
      detail: `length=${regexSource.length}`,
    };
  }

  const normalizedFlags = normalizeFlags(rawFlags);
  if (normalizedFlags !== null) {
    if (normalizedFlags.length > MAX_REGEX_FLAGS_LENGTH) {
      return {
        ok: false,
        code: 'flags_too_long',
        message: `Regex flags are too long (max ${MAX_REGEX_FLAGS_LENGTH} chars).`,
        detail: `length=${normalizedFlags.length}`,
      };
    }

    const flagError = validateFlagsContent(normalizedFlags);
    if (flagError !== null) {
      return flagError;
    }
  }

  const compactSource = regexSource.replace(/\s+/g, '');
  const looksRisky = POTENTIAL_BACKTRACKING_PATTERNS.some((pattern: RegExp) =>
    pattern.test(compactSource)
  );
  if (looksRisky) {
    return {
      ok: false,
      code: 'potential_backtracking',
      message: 'Regex may cause catastrophic backtracking. Simplify nested quantified groups.',
    };
  }

  return {
    ok: true,
    normalizedFlags,
  };
};
