import type { KangurSocialGeneratedDraft, KangurSocialPost } from '@/shared/contracts/kangur-social-posts';

const DRAFT_KEYS = ['titlePl', 'titleEn', 'bodyPl', 'bodyEn'] as const;

type DraftLikeFields = Pick<
  KangurSocialGeneratedDraft | KangurSocialPost,
  'titlePl' | 'titleEn' | 'bodyPl' | 'bodyEn'
>;

const normalizeText = (value: string | null | undefined): string => value?.trim() ?? '';

const hasAnyText = (draft: DraftLikeFields): boolean =>
  DRAFT_KEYS.some((key) => Boolean(draft[key].trim()));

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value));

const tryParseJsonObject = (text: string): Record<string, unknown> | null => {
  try {
    const parsed = JSON.parse(text);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const extractObjectSlice = (text: string): string | null => {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }
  return text.slice(start, end + 1);
};

const decodeJsonStringFragment = (rawValue: string, complete: boolean): string => {
  let sanitized = rawValue;
  if (!complete) {
    sanitized = sanitized.replace(/\\u[0-9a-fA-F]{0,3}$/u, '');
    sanitized = sanitized.replace(/\\$/u, '');
  }

  try {
    return JSON.parse(`"${sanitized}"`) as string;
  } catch {
    return sanitized
      .replace(/\\\\/gu, '\\')
      .replace(/\\"/gu, '"')
      .replace(/\\n/gu, '\n')
      .replace(/\\r/gu, '\r')
      .replace(/\\t/gu, '\t')
      .replace(/\\f/gu, '\f')
      .replace(/\\\//gu, '/')
      .replace(/\\u([0-9a-fA-F]{4})/gu, (_, hex: string) =>
        String.fromCharCode(Number.parseInt(hex, 16))
      );
  }
};

const extractQuotedJsonString = (
  text: string,
  startIndex: number
): { value: string; complete: boolean } | null => {
  if (startIndex < 0 || text[startIndex] !== '"') {
    return null;
  }

  let cursor = startIndex + 1;
  let rawValue = '';
  let escaped = false;

  while (cursor < text.length) {
    const character = text[cursor];
    rawValue += character;
    if (escaped) {
      escaped = false;
      cursor += 1;
      continue;
    }
    if (character === '\\') {
      escaped = true;
      cursor += 1;
      continue;
    }
    if (character === '"') {
      rawValue = rawValue.slice(0, -1);
      return {
        value: decodeJsonStringFragment(rawValue, true),
        complete: true,
      };
    }
    cursor += 1;
  }

  return {
    value: decodeJsonStringFragment(rawValue, false),
    complete: false,
  };
};

const extractLooseDraftFields = (text: string): Partial<KangurSocialGeneratedDraft> => {
  const result: Partial<KangurSocialGeneratedDraft> = {};

  for (const key of DRAFT_KEYS) {
    const matcher = new RegExp(`"${key}"\\s*:\\s*"`, 'u');
    const match = matcher.exec(text);
    if (!match) {
      continue;
    }
    const extracted = extractQuotedJsonString(text, match.index + match[0].length - 1);
    if (!extracted) {
      continue;
    }
    result[key] = extracted.value;
  }

  return result;
};

const normalizeDraftFieldsFromRecord = (
  parsed: Record<string, unknown>
): Partial<KangurSocialGeneratedDraft> => ({
  titlePl: typeof parsed['titlePl'] === 'string' ? parsed['titlePl'] : undefined,
  titleEn: typeof parsed['titleEn'] === 'string' ? parsed['titleEn'] : undefined,
  bodyPl: typeof parsed['bodyPl'] === 'string' ? parsed['bodyPl'] : undefined,
  bodyEn: typeof parsed['bodyEn'] === 'string' ? parsed['bodyEn'] : undefined,
});

const extractDraftFieldsFromText = (text: string): Partial<KangurSocialGeneratedDraft> => {
  const trimmed = text.trim();
  if (!trimmed) {
    return {};
  }

  const direct = tryParseJsonObject(trimmed);
  if (direct) {
    return normalizeDraftFieldsFromRecord(direct);
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/u);
  if (fencedMatch?.[1]) {
    const fenced = tryParseJsonObject(fencedMatch[1].trim());
    if (fenced) {
      return normalizeDraftFieldsFromRecord(fenced);
    }
  }

  const slicedObject = extractObjectSlice(trimmed);
  if (slicedObject) {
    const sliced = tryParseJsonObject(slicedObject);
    if (sliced) {
      return normalizeDraftFieldsFromRecord(sliced);
    }
  }

  return extractLooseDraftFields(trimmed);
};

export const looksLikeSerializedKangurSocialDraft = (text: string): boolean => {
  const trimmed = text.trim();
  if (!trimmed) {
    return false;
  }

  return DRAFT_KEYS.some((key) => trimmed.includes(`"${key}"`));
};

export const parseKangurSocialGeneratedDraftText = (
  text: string
): Partial<KangurSocialGeneratedDraft> => extractDraftFieldsFromText(text);

export const normalizeKangurSocialDraftLike = (
  draftLike: DraftLikeFields | null | undefined
): DraftLikeFields | null => {
  if (!draftLike) {
    return null;
  }

  const normalizedCurrent: DraftLikeFields = {
    titlePl: normalizeText(draftLike.titlePl),
    titleEn: normalizeText(draftLike.titleEn),
    bodyPl: normalizeText(draftLike.bodyPl),
    bodyEn: normalizeText(draftLike.bodyEn),
  };

  const serializedCandidate = [
    normalizedCurrent.bodyPl,
    normalizedCurrent.bodyEn,
    normalizedCurrent.titlePl,
    normalizedCurrent.titleEn,
  ].find((value) => looksLikeSerializedKangurSocialDraft(value));

  if (!serializedCandidate) {
    return normalizedCurrent;
  }

  const parsed = extractDraftFieldsFromText(serializedCandidate);
  const normalizedParsed: DraftLikeFields = {
    titlePl: normalizeText(parsed.titlePl),
    titleEn: normalizeText(parsed.titleEn),
    bodyPl: normalizeText(parsed.bodyPl),
    bodyEn: normalizeText(parsed.bodyEn),
  };

  if (!hasAnyText(normalizedParsed)) {
    return normalizedCurrent;
  }

  return normalizedParsed;
};
