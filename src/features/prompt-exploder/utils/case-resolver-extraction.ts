'use client';

import type { PromptValidationRule } from '@/features/prompt-engine/settings';
import { readRegexCaptureGroup } from '@/features/prompt-exploder/helpers/capture';

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
  /\b(sp\.|s\.a\.|sa|llc|inc|corp|company|inspektorat|urzad|urząd|organ|fundacja|stowarzyszenie|office|department|instytut|zakład|zaklad|zus|oddział|oddzial)\b/i;

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

export type PromptExploderCaseResolverExtractionMode =
  | 'rules_only'
  | 'rules_with_heuristics';

// --- Utilities ---

export const normalizeText = (value: string): string => value.trim().replace(/\s+/g, ' ');
export const normalizeComparable = (value: string): string => normalizeText(value).toLowerCase();
const normalizeRawCaptureText = (value: string): string =>
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
  const likelyOrganization = lines.some((line: string): boolean => ORGANIZATION_HINT_RE.test(line));
  return likelyName && !likelyOrganization && hasAddressLikeLine(lines);
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

type CaseResolverPartyDraft = Partial<PromptExploderCaseResolverPartyCandidate> & {
  role: PromptExploderCaseResolverPartyRole;
  sourceSegmentId?: string;
  sourceSegmentTitle?: string;
  sourcePatternLabels?: string[];
  sourceSequenceLabels?: string[];
};

type CaseResolverRuleExtractionDraft = {
  parties: Partial<Record<PromptExploderCaseResolverPartyRole, CaseResolverPartyDraft>>;
  metadata: PromptExploderCaseResolverMetadata;
};

const inferSegmentRoleHint = (
  segment: PromptExploderSegment
): PromptExploderCaseResolverPartyRole | null => {
  const hasAddresserPattern =
    hasPatternId(segment, 'segment.case_resolver.heading.addresser_person') ||
    hasPatternPrefix(segment, 'segment.case_resolver.extract.addresser.');
  const hasAddresseePattern =
    hasPatternId(segment, 'segment.case_resolver.heading.addressee_organization') ||
    hasPatternPrefix(segment, 'segment.case_resolver.extract.addressee.');

  if (hasAddresserPattern && !hasAddresseePattern) {
    return 'addresser';
  }
  if (hasAddresseePattern && !hasAddresserPattern) {
    return 'addressee';
  }
  const likelyAddresser = isLikelyAddresserSegment(segment);
  const likelyAddressee = isLikelyAddresseeSegment(segment);
  if (likelyAddresser && !likelyAddressee) return 'addresser';
  if (likelyAddressee && !likelyAddresser) return 'addressee';

  if (hasAddresserPattern && hasAddresseePattern) {
    const hasOrganizationLine = splitSegmentLines(segment).some(
      (line: string): boolean => ORGANIZATION_HINT_RE.test(line)
    );
    if (hasOrganizationLine) return 'addressee';
  }
  return null;
};

const normalizeCapturedValue = (
  value: string,
  normalize: CaseResolverSegmentCaptureRule['normalize']
): string => {
  const base = normalizeText(value);
  if (!base) return '';
  if (normalize === 'lower') return base.toLowerCase();
  if (normalize === 'upper') return base.toUpperCase();
  if (normalize === 'country') return normalizeCountryName(base);
  if (normalize === 'day' || normalize === 'month') return padNumberValue(base);
  if (normalize === 'year') {
    if (base.length === 2) return `20${base}`;
    return base;
  }
  return base;
};

const ensurePartyDraft = (
  draft: CaseResolverRuleExtractionDraft,
  role: PromptExploderCaseResolverPartyRole,
  segment: PromptExploderSegment
): CaseResolverPartyDraft => {
  const existing = draft.parties[role];
  if (existing) return existing;
  const next: CaseResolverPartyDraft = {
    role,
    rawText: normalizeRawCaptureText(segment.raw || segment.text || '') || '',
    sourceSegmentId: segment.id,
    sourceSegmentTitle: resolveSegmentDisplayLabel(segment),
    sourcePatternLabels: normalizeSegmentLabels(segment.matchedPatternLabels),
    sourceSequenceLabels: normalizeSegmentLabels(segment.matchedSequenceLabels),
  };
  draft.parties[role] = next;
  return next;
};

const setPartyField = (
  party: CaseResolverPartyDraft,
  field: CaseResolverCaptureField,
  value: string,
  overwrite: boolean
): void => {
  const assign = <K extends keyof CaseResolverPartyDraft>(
    key: K,
    nextValue: CaseResolverPartyDraft[K]
  ): void => {
    const current = party[key];
    if (!overwrite && typeof current === 'string' && current.trim().length > 0) return;
    party[key] = nextValue;
  };

  if (field === 'kind') {
    const normalized = value === 'organization' ? 'organization' : value === 'person' ? 'person' : null;
    if (!normalized) return;
    assign('kind', normalized);
    return;
  }
  if (field === 'displayName' || field === 'name') {
    assign('displayName', value);
    return;
  }
  if (field === 'organizationName' || field === 'companyName') {
    assign('organizationName', value);
    return;
  }
  if (field === 'firstName') {
    assign('firstName', value);
    return;
  }
  if (field === 'middleName') {
    assign('middleName', value);
    return;
  }
  if (field === 'lastName') {
    assign('lastName', value);
    return;
  }
  if (field === 'street') {
    assign('street', value);
    return;
  }
  if (field === 'streetNumber') {
    assign('streetNumber', value);
    return;
  }
  if (field === 'houseNumber') {
    assign('houseNumber', value);
    return;
  }
  if (field === 'city') {
    assign('city', value);
    return;
  }
  if (field === 'postalCode') {
    assign('postalCode', value);
    return;
  }
  if (field === 'country') {
    assign('country', value);
  }
};

const setMetadataField = (
  metadata: PromptExploderCaseResolverMetadata,
  field: CaseResolverCaptureField,
  value: string,
  overwrite: boolean,
  segment: PromptExploderSegment
): void => {
  const current = metadata.placeDate ?? {
    sourceSegmentId: segment.id,
    sourceSegmentTitle: resolveSegmentDisplayLabel(segment),
    sourcePatternLabels: normalizeSegmentLabels(segment.matchedPatternLabels),
    sourceSequenceLabels: normalizeSegmentLabels(segment.matchedSequenceLabels),
  };
  const assign = (key: 'city' | 'day' | 'month' | 'year', nextValue: string): void => {
    const existing = current[key];
    if (!overwrite && typeof existing === 'string' && existing.trim().length > 0) return;
    current[key] = nextValue || undefined;
  };

  if (field === 'city') assign('city', value);
  if (field === 'day') assign('day', value);
  if (field === 'month') assign('month', value);
  if (field === 'year') assign('year', value);
  metadata.placeDate = current;
};

const applyCaptureRulesToSegments = (args: {
  segments: PromptExploderSegment[];
  captureRules: CaseResolverSegmentCaptureRule[];
}): CaseResolverRuleExtractionDraft => {
  const draft: CaseResolverRuleExtractionDraft = {
    parties: {},
    metadata: {},
  };
  if (args.captureRules.length === 0) return draft;

  args.segments.forEach((segment: PromptExploderSegment): void => {
    const roleHint = inferSegmentRoleHint(segment);
    const sourceText = segment.raw || segment.text || '';
    const sourceLines = splitSegmentLines(segment);

    args.captureRules.forEach((rule: CaseResolverSegmentCaptureRule): void => {
      if (
        (rule.role === 'addresser' || rule.role === 'addressee') &&
        roleHint &&
        roleHint !== rule.role
      ) {
        return;
      }
      const captureSources = rule.applyTo === 'line' ? sourceLines : [sourceText];
      if (captureSources.length === 0) return;
      const regex = new RegExp(rule.regex.source, rule.regex.flags);

      for (const captureSource of captureSources) {
        const match = regex.exec(captureSource);
        if (!match) continue;
        const rawCapture = readRegexCaptureGroup(match, rule.group);
        const normalizedCapture = normalizeCapturedValue(rawCapture, rule.normalize);
        if (!normalizedCapture) continue;

        if (rule.role === 'place_date') {
          setMetadataField(
            draft.metadata,
            rule.field,
            normalizedCapture,
            rule.overwrite,
            segment
          );
          break;
        }

        const targetRoles: PromptExploderCaseResolverPartyRole[] =
          rule.role === 'party'
            ? roleHint
              ? [roleHint]
              : []
            : [rule.role];
        if (targetRoles.length === 0) continue;

        targetRoles.forEach((role: PromptExploderCaseResolverPartyRole): void => {
          const partyDraft = ensurePartyDraft(draft, role, segment);
          setPartyField(partyDraft, rule.field, normalizedCapture, rule.overwrite);
        });
        break;
      }
    });
  });

  return draft;
};

const toPartyCandidateFromDraft = (
  draft: CaseResolverPartyDraft | null | undefined
): PromptExploderCaseResolverPartyCandidate | null => {
  if (!draft) return null;
  const firstName = normalizeText(draft.firstName ?? '');
  const middleName = normalizeText(draft.middleName ?? '');
  const lastName = normalizeText(draft.lastName ?? '');
  const organizationName = normalizeText(draft.organizationName ?? '');
  const explicitDisplayName = normalizeText(draft.displayName ?? '');
  const nameFromParts = [firstName, middleName, lastName].filter(Boolean).join(' ');
  const displayName = explicitDisplayName || organizationName || nameFromParts;
  const rawText = normalizeRawCaptureText(draft.rawText ?? '');
  const rawDisplayLine = rawText
    .split('\n')
    .map((line: string): string => line.trim())
    .find((line: string): boolean => line.length > 0) ?? '';
  if (!displayName && !rawText) return null;

  const candidate: PromptExploderCaseResolverPartyCandidate = {
    role: draft.role,
    displayName: displayName || rawDisplayLine,
    rawText: rawText || displayName,
    sourceSegmentId: draft.sourceSegmentId,
    sourceSegmentTitle: draft.sourceSegmentTitle,
    sourcePatternLabels: draft.sourcePatternLabels,
    sourceSequenceLabels: draft.sourceSequenceLabels,
  };
  if (firstName) candidate.firstName = firstName;
  if (middleName) candidate.middleName = middleName;
  if (lastName) candidate.lastName = lastName;
  if (organizationName) candidate.organizationName = organizationName;
  if (draft.street) candidate.street = draft.street;
  if (draft.streetNumber) candidate.streetNumber = draft.streetNumber;
  if (draft.houseNumber) candidate.houseNumber = draft.houseNumber;
  if (draft.city) candidate.city = draft.city;
  if (draft.postalCode) candidate.postalCode = draft.postalCode;
  if (draft.country) candidate.country = draft.country;
  if (draft.kind === 'person' || draft.kind === 'organization') {
    candidate.kind = draft.kind;
  } else if (organizationName) {
    candidate.kind = 'organization';
  } else if (firstName || lastName) {
    candidate.kind = 'person';
  }

  return candidate;
};

const mergePartyCandidates = (
  primary: PromptExploderCaseResolverPartyCandidate | null,
  fallback: PromptExploderCaseResolverPartyCandidate | null
): PromptExploderCaseResolverPartyCandidate | null => {
  if (!primary) return fallback;
  if (!fallback) return primary;
  return {
    ...fallback,
    ...primary,
    role: primary.role,
    sourcePatternLabels:
      primary.sourcePatternLabels && primary.sourcePatternLabels.length > 0
        ? primary.sourcePatternLabels
        : fallback.sourcePatternLabels,
    sourceSequenceLabels:
      primary.sourceSequenceLabels && primary.sourceSequenceLabels.length > 0
        ? primary.sourceSequenceLabels
        : fallback.sourceSequenceLabels,
  };
};

const mergeMetadata = (
  primary: PromptExploderCaseResolverMetadata | null,
  fallback: PromptExploderCaseResolverMetadata | null
): PromptExploderCaseResolverMetadata | null => {
  if (!primary) return fallback;
  if (!fallback) return primary;
  const mergedPlaceDate = {
    ...(fallback.placeDate ?? {}),
    ...(primary.placeDate ?? {}),
  };
  if (
    !mergedPlaceDate.city &&
    !mergedPlaceDate.day &&
    !mergedPlaceDate.month &&
    !mergedPlaceDate.year
  ) {
    return null;
  }
  return { placeDate: mergedPlaceDate };
};

export const extractCaseResolverBridgePayloadFromSegments = (
  segments: PromptExploderSegment[] | null | undefined,
  options?: {
    captureRules?: CaseResolverSegmentCaptureRule[] | null | undefined;
    mode?: PromptExploderCaseResolverExtractionMode | null | undefined;
  }
): {
  parties?: PromptExploderCaseResolverPartyBundle;
  metadata?: PromptExploderCaseResolverMetadata;
} => {
  if (!segments?.length) {
    return {};
  }

  const mode: PromptExploderCaseResolverExtractionMode =
    options?.mode === 'rules_with_heuristics' ? 'rules_with_heuristics' : 'rules_only';
  const captureRules = (options?.captureRules ?? []).slice();
  const ruleDraft = applyCaptureRulesToSegments({
    segments,
    captureRules,
  });

  const ruleAddresser = toPartyCandidateFromDraft(ruleDraft.parties.addresser ?? null);
  const ruleAddressee = toPartyCandidateFromDraft(ruleDraft.parties.addressee ?? null);
  const ruleMetadata = ruleDraft.metadata.placeDate ? ruleDraft.metadata : null;
  const hasAnyRuleCapture = Boolean(ruleAddresser || ruleAddressee || ruleMetadata);

  const shouldUseHeuristics = (
    mode === 'rules_with_heuristics' ||
    (mode === 'rules_only' && captureRules.length > 0 && hasAnyRuleCapture)
  );
  const heuristicPayload = shouldUseHeuristics
    ? (() => {
      const usedSegmentIds = new Set<string>();
      const addresserSegment = resolvePartySegment(segments, 'addresser', usedSegmentIds);
      const addresseeSegment = resolvePartySegment(segments, 'addressee', usedSegmentIds);
      return {
        addresser: addresserSegment
          ? buildPartyCandidateFromSegment(addresserSegment, 'addresser')
          : null,
        addressee: addresseeSegment
          ? buildPartyCandidateFromSegment(addresseeSegment, 'addressee')
          : null,
        metadata: resolvePlaceDateMetadata(segments),
      };
    })()
    : null;

  const addresser = mergePartyCandidates(
    ruleAddresser,
    heuristicPayload?.addresser ?? null
  );
  const addressee = mergePartyCandidates(
    ruleAddressee,
    heuristicPayload?.addressee ?? null
  );
  const metadata = mergeMetadata(
    ruleMetadata,
    heuristicPayload?.metadata ?? null
  );

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

export const resolveCaseResolverBridgePayloadForTransfer = (args: {
  segments: PromptExploderSegment[] | null | undefined;
  captureRules?: CaseResolverSegmentCaptureRule[] | null | undefined;
  mode?: PromptExploderCaseResolverExtractionMode | null | undefined;
}): {
  payload: {
    parties?: PromptExploderCaseResolverPartyBundle;
    metadata?: PromptExploderCaseResolverMetadata;
  };
  requestedMode: PromptExploderCaseResolverExtractionMode;
  effectiveMode: PromptExploderCaseResolverExtractionMode;
  usedFallback: boolean;
  hasCaptureData: boolean;
} => {
  const requestedMode: PromptExploderCaseResolverExtractionMode =
    args.mode === 'rules_with_heuristics' ? 'rules_with_heuristics' : 'rules_only';

  const initialPayload = extractCaseResolverBridgePayloadFromSegments(args.segments, {
    captureRules: args.captureRules,
    mode: requestedMode,
  });
  const initialAddresser = initialPayload.parties?.addresser;
  const initialAddressee = initialPayload.parties?.addressee;
  const initialMetadata = initialPayload.metadata;
  const initialHasCaptureData = Boolean(initialAddresser || initialAddressee || initialMetadata);

  return {
    payload: initialPayload,
    requestedMode,
    effectiveMode: requestedMode,
    usedFallback: false,
    hasCaptureData: initialHasCaptureData,
  };
};

export const buildCaseResolverSegmentCaptureRules = (
  rules: PromptValidationRule[],
  validationScope: string
): CaseResolverSegmentCaptureRule[] => {
  const normalizeScopeToken = (value: string): string =>
    normalizeText(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

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
    const normalizedValidationScope = normalizeScopeToken(validationScope);
    return rule.appliesToScopes.some(
      (scope) => normalizeScopeToken(scope) === normalizedValidationScope
    );
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
