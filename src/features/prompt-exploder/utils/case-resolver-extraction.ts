'use client';

import type { PromptValidationRule } from '@/features/prompt-engine/settings';

import type {
  PromptExploderCaseResolverMetadata,
  PromptExploderCaseResolverPartyBundle,
  PromptExploderCaseResolverPartyCandidate,
  PromptExploderCaseResolverPartyRole,
} from '../bridge';
import type { 
  PromptExploderSegment
} from '../types';

// --- Constants & Regex ---

export const POSTAL_CITY_RE = /^(\d{2}-\d{3})\s+(.+)$/;
export const PLACE_DATE_LINE_RE =
  /^\s*[\p{L}][\p{L}\s\-.'’]{1,60}?(?:,)?\s+\d{1,2}[./-]\d{1,2}[./-]\d{2,4}(?:\s*r\.?\s*)?$/iu;
export const PLACE_DATE_CAPTURE_RE =
  /^\s*([\p{L}][\p{L}\s\-.'’]{1,60}?)(?:,)?\s+(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})(?:\s*r\.?\s*)?$/iu;
export const STREET_NUMBER_RE =
  /^(?:(?:ul\.?|al\.?|os\.?|pl\.?|aleja)\s+)?([\p{L}][\p{L}\s'’.-]{1,80}?)\s+(\d+[A-Za-z]?)(?:\s*\/\s*([0-9A-Za-z-]+))?$/u;
export const ORGANIZATION_HINT_RE =
  /\b(sp\.|s\.a\.|sa|llc|inc|corp|company|inspektorat|urzad|urząd|organ|fundacja|stowarzyszenie|office|department|instytut)\b/i;

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
export const PERSON_NAME_STOPWORDS = new Set<string>(['z', 'na', 'w', 'od', 'do', 'i', 'oraz', 'dotyczy']);
export const BODY_SECTION_HINT_RE = /\b(wniosek|dotyczy|uzasadnienie|niniejszym|art\.|§|ust\.|pkt\.?)\b/iu;

// --- Types ---

export type CaseResolverCaptureRole = PromptExploderCaseResolverPartyRole | 'party' | 'place_date';
export type CaseResolverCaptureField =
  | 'kind' | 'displayName' | 'organizationName' | 'companyName' | 'firstName' | 'name' | 'middleName' | 'lastName'
  | 'street' | 'streetNumber' | 'houseNumber' | 'city' | 'postalCode' | 'country' | 'day' | 'month' | 'year';

export type CaseResolverSegmentCaptureRule = {
  id: string;
  label: string;
  role: CaseResolverCaptureRole;
  field: CaseResolverCaptureField;
  regex: RegExp;
  applyTo: 'segment' | 'line';
  group: number;
  normalize: 'trim' | 'lower' | 'upper' | 'country' | 'day' | 'month' | 'year';
  overwrite: boolean;
  sequence: number;
};

// --- Utilities ---

export const normalizeText = (value: string): string => value.trim().replace(/\s+/g, ' ');
export const normalizeComparable = (value: string): string => normalizeText(value).toLowerCase();

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
  return tokens.every(token => PERSON_NAME_TOKEN_RE.test(token));
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

const padNumberValue = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return trimmed.padStart(2, '0');
};

const normalizeSegmentLabels = (labels: string[] | undefined): string[] => {
  if (!labels?.length) return [];
  const unique = new Set<string>();
  labels.forEach((label: string): void => {
    const normalized = normalizeText(label);
    if (!normalized) return;
    unique.add(normalized);
  });
  return [...unique];
};

const hasPatternId = (segment: PromptExploderSegment, id: string): boolean =>
  segment.matchedPatternIds.includes(id);

const hasPatternPrefix = (segment: PromptExploderSegment, prefix: string): boolean =>
  segment.matchedPatternIds.some((id: string): boolean => id.startsWith(prefix));

const hasAddressLikeLine = (lines: string[]): boolean =>
  lines.some((line: string): boolean => STREET_NUMBER_RE.test(line) || POSTAL_CITY_RE.test(line) || isCountryLine(line));

const isLikelyAddresserSegment = (segment: PromptExploderSegment): boolean => {
  const lines = splitSegmentLines(segment);
  if (!lines.length || BODY_SECTION_HINT_RE.test(lines.join('\n'))) return false;
  const likelyName = lines.some((line: string): boolean => isLikelyPersonNameLine(line));
  return likelyName && hasAddressLikeLine(lines);
};

const isLikelyAddresseeSegment = (segment: PromptExploderSegment): boolean => {
  const lines = splitSegmentLines(segment);
  if (!lines.length || BODY_SECTION_HINT_RE.test(lines.join('\n'))) return false;
  const organizationLine = lines.some((line: string): boolean => ORGANIZATION_HINT_RE.test(line));
  return organizationLine && hasAddressLikeLine(lines);
};

const resolvePartySegment = (
  segments: PromptExploderSegment[],
  role: PromptExploderCaseResolverPartyRole,
  usedSegmentIds: Set<string>
): PromptExploderSegment | null => {
  const preferredHeadingId =
    role === 'addresser'
      ? 'segment.case_resolver.heading.addresser_person'
      : 'segment.case_resolver.heading.addressee_organization';
  const preferredExtractPrefix =
    role === 'addresser'
      ? 'segment.case_resolver.extract.addresser.'
      : 'segment.case_resolver.extract.addressee.';
  const fallbackPredicate =
    role === 'addresser' ? isLikelyAddresserSegment : isLikelyAddresseeSegment;

  const candidates = [
    segments.find(
      (segment: PromptExploderSegment): boolean =>
        !usedSegmentIds.has(segment.id) && hasPatternId(segment, preferredHeadingId)
    ) ?? null,
    segments.find(
      (segment: PromptExploderSegment): boolean =>
        !usedSegmentIds.has(segment.id) && hasPatternPrefix(segment, preferredExtractPrefix)
    ) ?? null,
    segments.find(
      (segment: PromptExploderSegment): boolean =>
        !usedSegmentIds.has(segment.id) &&
        hasPatternPrefix(segment, 'segment.case_resolver.extract.address.') &&
        fallbackPredicate(segment)
    ) ?? null,
    segments.find(
      (segment: PromptExploderSegment): boolean =>
        !usedSegmentIds.has(segment.id) && fallbackPredicate(segment)
    ) ?? null,
  ];

  const resolved = candidates.find((segment): segment is PromptExploderSegment => segment !== null) ?? null;
  if (resolved) {
    usedSegmentIds.add(resolved.id);
  }
  return resolved;
};

const resolvePersonNameParts = (
  lines: string[],
  fallbackLine: string
): {
  displayName: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
} => {
  const source = lines.find((line: string): boolean => isLikelyPersonNameLine(line)) ?? fallbackLine;
  const normalized = normalizeText(source);
  if (!normalized) {
    return {
      displayName: fallbackLine,
    };
  }
  const tokens = normalized.split(/\s+/).filter(Boolean);
  if (tokens.length < 2) {
    return {
      displayName: normalized,
    };
  }
  const firstName = tokens[0];
  const lastName = tokens[tokens.length - 1];
  const middleTokens = tokens.slice(1, -1);
  const result: {
    displayName: string;
    firstName?: string;
    middleName?: string;
    lastName?: string;
  } = {
    displayName: normalized,
  };
  if (firstName) result.firstName = firstName;
  if (middleTokens.length > 0) result.middleName = middleTokens.join(' ');
  if (lastName) result.lastName = lastName;
  return result;
};

const resolveOrganizationName = (lines: string[], fallbackLine: string): string => {
  const organizationLine =
    lines.find((line: string): boolean => ORGANIZATION_HINT_RE.test(line)) ?? fallbackLine;
  return normalizeText(organizationLine);
};

const buildPartyCandidateFromSegment = (
  segment: PromptExploderSegment,
  role: PromptExploderCaseResolverPartyRole
): PromptExploderCaseResolverPartyCandidate | null => {
  const lines = splitSegmentLines(segment);
  if (!lines.length) return null;

  const rawText = (segment.raw || segment.text || '').trim();
  const firstLine = lines[0] ?? '';
  const likelyPersonNameLine = lines.find((line: string): boolean => isLikelyPersonNameLine(line)) ?? null;
  const likelyOrganizationLine = lines.find((line: string): boolean => ORGANIZATION_HINT_RE.test(line)) ?? null;

  const inferredKind: 'person' | 'organization' | undefined = (() => {
    if (role === 'addressee' && likelyOrganizationLine) return 'organization';
    if (likelyPersonNameLine && !likelyOrganizationLine) return 'person';
    if (likelyOrganizationLine) return 'organization';
    return undefined;
  })();

  const sourcePatternLabels = normalizeSegmentLabels(segment.matchedPatternLabels);
  const sourceSequenceLabels = normalizeSegmentLabels(segment.matchedSequenceLabels);
  const sourceSegmentTitle = resolveSegmentDisplayLabel(segment);

  const base: PromptExploderCaseResolverPartyCandidate = {
    role,
    displayName: normalizeText(firstLine) || rawText || sourceSegmentTitle,
    rawText: rawText || lines.join('\n'),
    sourceSegmentId: segment.id,
    sourceSegmentTitle,
    sourcePatternLabels,
    sourceSequenceLabels,
  };

  if (inferredKind === 'person') {
    const nameParts = resolvePersonNameParts(lines, firstLine);
    base.kind = 'person';
    base.displayName = nameParts.displayName || base.displayName;
    base.firstName = nameParts.firstName;
    base.middleName = nameParts.middleName;
    base.lastName = nameParts.lastName;
  } else if (inferredKind === 'organization') {
    const organizationName = resolveOrganizationName(lines, firstLine);
    base.kind = 'organization';
    base.organizationName = organizationName || undefined;
    base.displayName = organizationName || base.displayName;
  }

  lines.forEach((line: string): void => {
    const streetMatch = line.match(STREET_NUMBER_RE);
    if (streetMatch) {
      if (!base.street) base.street = normalizeText(streetMatch[1] ?? '');
      if (!base.streetNumber) base.streetNumber = normalizeText(streetMatch[2] ?? '');
      if (!base.houseNumber) {
        const houseNumber = normalizeText(streetMatch[3] ?? '');
        base.houseNumber = houseNumber || undefined;
      }
      return;
    }
    const postalCityMatch = line.match(POSTAL_CITY_RE);
    if (postalCityMatch) {
      if (!base.postalCode) base.postalCode = normalizeText(postalCityMatch[1] ?? '');
      if (!base.city) base.city = normalizeText(postalCityMatch[2] ?? '');
      return;
    }
    if (isCountryLine(line) && !base.country) {
      base.country = normalizeCountryName(line);
    }
  });

  if (!base.displayName.trim() && !base.rawText.trim()) return null;
  return base;
};

const resolvePlaceDateMetadata = (
  segments: PromptExploderSegment[]
): PromptExploderCaseResolverMetadata | null => {
  const candidateSegment =
    segments.find((segment: PromptExploderSegment): boolean =>
      hasPatternId(segment, 'segment.case_resolver.heading.place_date')
    ) ??
    segments.find((segment: PromptExploderSegment): boolean =>
      hasPatternPrefix(segment, 'segment.case_resolver.extract.place_date.')
    ) ??
    segments.find((segment: PromptExploderSegment): boolean =>
      splitSegmentLines(segment).some((line: string): boolean => PLACE_DATE_LINE_RE.test(line))
    );

  if (!candidateSegment) return null;

  const placeDateLine = splitSegmentLines(candidateSegment).find((line: string): boolean =>
    PLACE_DATE_CAPTURE_RE.test(line)
  );
  if (!placeDateLine) return null;

  const match = placeDateLine.match(PLACE_DATE_CAPTURE_RE);
  if (!match) return null;
  const city = normalizeText(match[1] ?? '');
  const day = padNumberValue(match[2] ?? '');
  const month = padNumberValue(match[3] ?? '');
  const year = normalizeText(match[4] ?? '');

  if (!city && !day && !month && !year) return null;

  return {
    placeDate: {
      city: city || undefined,
      day: day || undefined,
      month: month || undefined,
      year: year || undefined,
      sourceSegmentId: candidateSegment.id,
      sourceSegmentTitle: resolveSegmentDisplayLabel(candidateSegment),
      sourcePatternLabels: normalizeSegmentLabels(candidateSegment.matchedPatternLabels),
      sourceSequenceLabels: normalizeSegmentLabels(candidateSegment.matchedSequenceLabels),
    },
  };
};

export const extractCaseResolverBridgePayloadFromSegments = (
  segments: PromptExploderSegment[] | null | undefined
): {
  parties?: PromptExploderCaseResolverPartyBundle;
  metadata?: PromptExploderCaseResolverMetadata;
} => {
  if (!segments?.length) {
    return {};
  }

  const usedSegmentIds = new Set<string>();
  const addresserSegment = resolvePartySegment(segments, 'addresser', usedSegmentIds);
  const addresseeSegment = resolvePartySegment(segments, 'addressee', usedSegmentIds);

  const addresser = addresserSegment
    ? buildPartyCandidateFromSegment(addresserSegment, 'addresser')
    : null;
  const addressee = addresseeSegment
    ? buildPartyCandidateFromSegment(addresseeSegment, 'addressee')
    : null;
  const metadata = resolvePlaceDateMetadata(segments);

  const parties: PromptExploderCaseResolverPartyBundle | undefined =
    addresser || addressee
      ? {
        ...(addresser ? { addresser } : {}),
        ...(addressee ? { addressee } : {}),
      }
      : undefined;

  return {
    ...(parties ? { parties } : {}),
    ...(metadata ? { metadata } : {}),
  };
};

export const buildCaseResolverSegmentCaptureRules = (
  rules: PromptValidationRule[],
  validationScope: string
): CaseResolverSegmentCaptureRule[] => {
  const mapField = (fieldPath: string): CaseResolverCaptureField | null => {
    const normalized = fieldPath.trim();
    if (!normalized) return null;
    if (normalized === 'kind') return 'kind';
    if (normalized === 'displayName') return 'displayName';
    if (normalized === 'organizationName') return 'organizationName';
    if (normalized === 'companyName') return 'companyName';
    if (normalized === 'firstName') return 'firstName';
    if (normalized === 'name') return 'name';
    if (normalized === 'middleName') return 'middleName';
    if (normalized === 'lastName') return 'lastName';
    if (normalized === 'street') return 'street';
    if (normalized === 'streetNumber') return 'streetNumber';
    if (normalized === 'houseNumber') return 'houseNumber';
    if (normalized === 'city') return 'city';
    if (normalized === 'postalCode') return 'postalCode';
    if (normalized === 'country') return 'country';
    if (normalized === 'day') return 'day';
    if (normalized === 'month') return 'month';
    if (normalized === 'year') return 'year';
    return null;
  };

  const normalizeRole = (value: string): CaseResolverCaptureRole | null => {
    const normalized = value.trim();
    if (normalized === 'addresser') return 'addresser';
    if (normalized === 'addressee') return 'addressee';
    if (normalized === 'party') return 'party';
    if (normalized === 'place_date') return 'place_date';
    return null;
  };

  const resolvesScope = (rule: PromptValidationRule): boolean => {
    if (!rule.appliesToScopes || rule.appliesToScopes.length === 0) return true;
    return rule.appliesToScopes.some((scope) => scope === validationScope);
  };

  return rules
    .filter(
      (rule: PromptValidationRule): boolean =>
        rule.kind === 'regex' &&
        rule.enabled &&
        resolvesScope(rule) &&
        typeof rule.promptExploderCaptureTarget === 'string' &&
        rule.promptExploderCaptureTarget.trim().startsWith('case_resolver.')
    )
    .map((rule: PromptValidationRule): CaseResolverSegmentCaptureRule | null => {
      if (rule.kind !== 'regex') return null;
      const captureTarget = normalizeText(rule.promptExploderCaptureTarget || '');
      const targetMatch = captureTarget.match(
        /^case_resolver\.(addresser|addressee|party|place_date)\.([A-Za-z]+)$/i
      );
      if (!targetMatch) return null;
      const role = normalizeRole(targetMatch[1]?.toLowerCase() ?? '');
      if (!role) return null;
      const field = mapField(targetMatch[2] ?? '');
      if (!field) return null;
      const flags = rule.flags || 'imu';
      let regex: RegExp;
      try {
        regex = new RegExp(rule.pattern, flags);
      } catch {
        return null;
      }
      const applyTo = rule.promptExploderCaptureApplyTo === 'segment' ? 'segment' : 'line';
      const normalize = (() => {
        if (rule.promptExploderCaptureNormalize === 'lower') return 'lower';
        if (rule.promptExploderCaptureNormalize === 'upper') return 'upper';
        if (rule.promptExploderCaptureNormalize === 'country') return 'country';
        if (rule.promptExploderCaptureNormalize === 'day') return 'day';
        if (rule.promptExploderCaptureNormalize === 'month') return 'month';
        if (rule.promptExploderCaptureNormalize === 'year') return 'year';
        return 'trim';
      })();
      const sequence = typeof rule.sequence === 'number' && Number.isFinite(rule.sequence)
        ? rule.sequence
        : 0;
      const group =
        typeof rule.promptExploderCaptureGroup === 'number' &&
          Number.isFinite(rule.promptExploderCaptureGroup) &&
          rule.promptExploderCaptureGroup > 0
          ? Math.round(rule.promptExploderCaptureGroup)
          : 1;
      return {
        id: rule.id,
        label: rule.title,
        role,
        field,
        regex,
        applyTo,
        group,
        normalize,
        overwrite: Boolean(rule.promptExploderCaptureOverwrite),
        sequence,
      };
    })
    .filter((entry: CaseResolverSegmentCaptureRule | null): entry is CaseResolverSegmentCaptureRule => entry !== null)
    .sort((left: CaseResolverSegmentCaptureRule, right: CaseResolverSegmentCaptureRule): number => {
      if (left.sequence !== right.sequence) return left.sequence - right.sequence;
      return left.id.localeCompare(right.id);
    });
};
