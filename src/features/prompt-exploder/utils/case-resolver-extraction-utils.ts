import type {
  PromptExploderSegment,
} from '@/shared/contracts/prompt-exploder';

// --- Constants & Regex ---

export const POSTAL_CITY_RE = /^(\d{2}-\d{3})\s+(.+)$/;
export const PLACE_DATE_LINE_RE =
  /^\s*[\p{L}][\p{L}\s\-.'’]{1,60}?(?:,)?\s+\d{1,2}[./-]\d{1,2}[./-]\d{2,4}(?:\s*r\.?\s*)?$/iu;
export const PLACE_DATE_CAPTURE_RE =
  /^\s*([\p{L}][\p{L}\s\-.'’]{1,60}?)(?:,)?\s+(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})(?:\s*r\.?\s*)?$/iu;
export const STREET_NUMBER_RE =
  /^(?:(?:ul\.?|al\.?|os\.?|pl\.?|aleja)\s+)?([\p{L}][\p{L}\s'’.-]{1,80}?)\s+(\d+[A-Za-z]?)(?:\s*\/\s*([0-9A-Za-z-]+))?$/u;
export const ORGANIZATION_HINT_RE =
  /\b(sp\.|s\.a\.|sa|llc|inc|corp|company|komisariat|komenda|policja|policji|prokuratura|rzecznik|biuro|inspektorat|urzad|urząd|ministerstwo|fundacja|stowarzyszenie|office|department|agency|authority|instytut|institute|zakład|zaklad|oddział|oddzial|sąd|sad|court|university|uniwersytet|bank)\b/i;

export const COUNTRY_NORMALIZATION_MAP: Record<string, string> = {
  polska: 'Poland',
  poland: 'Poland',
  niemcy: 'Germany',
  germany: 'Germany',
  deutschland: 'Germany',
  francja: 'France',
  france: 'France',
  hiszpania: 'Spain',
  spain: 'Spain',
  włochy: 'Italy',
  wlochy: 'Italy',
  italy: 'Italy',
  uk: 'United Kingdom',
  'united kingdom': 'United Kingdom',
  usa: 'United States',
  'u.s.a.': 'United States',
};

export const PERSON_NAME_TOKEN_RE = /^[\p{Lu}][\p{L}'’.-]{1,40}$/u;
export const PERSON_NAME_STOPWORDS = new Set<string>([
  'z',
  'na',
  'w',
  'od',
  'do',
  'i',
  'oraz',
  'dotyczy',
]);
export const BODY_SECTION_HINT_RE =
  /\b(wniosek|dotyczy|uzasadnienie|niniejszym|art\.|§|ust\.|pkt\.?)\b/iu;

// --- Utilities ---

export const normalizeText = (value: string): string => value.trim().replace(/\s+/g, ' ');
export const normalizeComparable = (value: string): string => normalizeText(value).toLowerCase();

export const normalizeRawCaptureText = (value: string): string =>
  value
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line: string): string => normalizeText(line))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

export const normalizeCountryName = (value: string): string => {
  const normalized = normalizeText(value);
  if (!normalized) return '';
  return COUNTRY_NORMALIZATION_MAP[normalized.toLowerCase()] ?? normalized;
};

export const isCountryLine = (line: string): boolean => {
  const normalized = normalizeText(line);
  if (!normalized || /\d/.test(normalized)) return false;
  return !!COUNTRY_NORMALIZATION_MAP[normalized.toLowerCase()];
};

export const isLikelyPersonNameLine = (line: string): boolean => {
  const normalized = normalizeText(line);
  if (!normalized || normalized.length > 80 || /\d/.test(normalized)) return false;
  const tokens = normalized.split(/\s+/).filter(Boolean);
  if (tokens.length < 2 || tokens.length > 4) return false;
  return tokens.every((token) => PERSON_NAME_TOKEN_RE.test(token));
};

export const splitSegmentLines = (segment: PromptExploderSegment): string[] => {
  const source = segment.raw || segment.text || '';
  return source.split('\n').map(normalizeText).filter(Boolean);
};

export const resolveSegmentDisplayLabel = (segment: PromptExploderSegment): string => {
  const explicitTitle = normalizeText(segment.title || '');
  if (explicitTitle) return explicitTitle;
  const firstLine = splitSegmentLines(segment)[0] ?? '';
  return firstLine || `Segment ${segment.id}`;
};

export const padNumberValue = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return trimmed.padStart(2, '0');
};

export const normalizeSegmentLabels = (labels: string[] | undefined): string[] => {
  if (!labels?.length) return [];
  const unique = new Set<string>();
  labels.forEach((label: string): void => {
    const normalized = normalizeText(label);
    if (!normalized) return;
    unique.add(normalized);
  });
  return [...unique];
};

export const CASE_RESOLVER_LABEL_ROLE_CONFIG = {
  addresser: {
    pattern:
      /^(?:from|od|nadawca|sender|addresser|wnioskodawca)\s*:\s*(.*)$/iu,
    headingPatternId: 'segment.case_resolver.heading.addresser_label',
    headingPatternLabel: 'Case Resolver Heading: Addresser Label',
    virtualSplitLabel: 'Case Resolver Virtual Split: Addresser',
  },
  addressee: {
    pattern:
      /^(?:to|do|adresat|recipient|addressee|odbiorca|organ)\s*:\s*(.*)$/iu,
    headingPatternId: 'segment.case_resolver.heading.addressee_label',
    headingPatternLabel: 'Case Resolver Heading: Addressee Label',
    virtualSplitLabel: 'Case Resolver Virtual Split: Addressee',
  },
} as const;

export const hasPatternId = (segment: PromptExploderSegment, id: string): boolean =>
  segment.matchedPatternIds.includes(id);

export const hasPatternPrefix = (segment: PromptExploderSegment, prefix: string): boolean =>
  segment.matchedPatternIds.some((id: string): boolean => id.startsWith(prefix));

export const hasAddressLikeLine = (lines: string[]): boolean =>
  lines.some(
    (line: string): boolean =>
      STREET_NUMBER_RE.test(line) || POSTAL_CITY_RE.test(line) || isCountryLine(line)
  );
