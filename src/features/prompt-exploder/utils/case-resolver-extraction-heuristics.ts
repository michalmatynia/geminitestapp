import type {
  PromptExploderSegment,
  PromptExploderCaseResolverPartyRole,
  PromptExploderCaseResolverPartyCandidate,
  PromptExploderCaseResolverMetadata,
} from '@/shared/contracts/prompt-exploder';

import {
  BODY_SECTION_HINT_RE,
  ORGANIZATION_HINT_RE,
  PLACE_DATE_CAPTURE_RE,
  PLACE_DATE_LINE_RE,
  POSTAL_CITY_RE,
  STREET_NUMBER_RE,
  hasAddressLikeLine,
  hasPatternId,
  hasPatternPrefix,
  isCountryLine,
  isLikelyPersonNameLine,
  normalizeCountryName,
  normalizeSegmentLabels,
  normalizeText,
  padNumberValue,
  resolveSegmentDisplayLabel,
  splitSegmentLines,
} from './case-resolver-extraction-utils';

export const isLikelyAddresserSegment = (segment: PromptExploderSegment): boolean => {
  const lines = splitSegmentLines(segment);
  if (!lines.length || BODY_SECTION_HINT_RE.test(lines.join('\n'))) return false;
  const likelyName = lines.some((line: string): boolean => isLikelyPersonNameLine(line));
  const likelyOrganization = lines.some((line: string): boolean => ORGANIZATION_HINT_RE.test(line));
  return likelyName && !likelyOrganization && hasAddressLikeLine(lines);
};

export const isLikelyAddresseeSegment = (segment: PromptExploderSegment): boolean => {
  const lines = splitSegmentLines(segment);
  if (!lines.length || BODY_SECTION_HINT_RE.test(lines.join('\n'))) return false;
  const organizationLine = lines.some((line: string): boolean => ORGANIZATION_HINT_RE.test(line));
  return organizationLine && hasAddressLikeLine(lines);
};

const ADDRESS_EXTRACT_PREFIX = 'segment.case_resolver.extract.address.';

type PartySegmentConfig = {
  preferredHeadingId: string;
  preferredExtractPrefix: string;
  fallbackPredicate: (segment: PromptExploderSegment) => boolean;
};

const NEVER_MATCH_SEGMENT = (): boolean => false;

const PARTY_SEGMENT_CONFIG: Record<PromptExploderCaseResolverPartyRole, PartySegmentConfig> = {
  addresser: {
    preferredHeadingId: 'segment.case_resolver.heading.addresser_person',
    preferredExtractPrefix: 'segment.case_resolver.extract.addresser.',
    fallbackPredicate: isLikelyAddresserSegment,
  },
  addressee: {
    preferredHeadingId: 'segment.case_resolver.heading.addressee_organization',
    preferredExtractPrefix: 'segment.case_resolver.extract.addressee.',
    fallbackPredicate: isLikelyAddresseeSegment,
  },
  subject: {
    preferredHeadingId: 'segment.case_resolver.heading.subject_or_section',
    preferredExtractPrefix: 'segment.case_resolver.extract.subject.',
    fallbackPredicate: NEVER_MATCH_SEGMENT,
  },
  reference: {
    preferredHeadingId: 'segment.case_resolver.heading.reference',
    preferredExtractPrefix: 'segment.case_resolver.extract.reference.',
    fallbackPredicate: NEVER_MATCH_SEGMENT,
  },
  other: {
    preferredHeadingId: 'segment.case_resolver.heading.other',
    preferredExtractPrefix: 'segment.case_resolver.extract.other.',
    fallbackPredicate: NEVER_MATCH_SEGMENT,
  },
};

const isUnusedSegment = (
  segment: PromptExploderSegment,
  usedSegmentIds: Set<string>
): boolean => !usedSegmentIds.has(segment.id);

const findPartySegmentCandidate = (
  segments: PromptExploderSegment[],
  usedSegmentIds: Set<string>,
  predicate: (segment: PromptExploderSegment) => boolean
): PromptExploderSegment | null =>
  segments.find(
    (segment: PromptExploderSegment): boolean =>
      isUnusedSegment(segment, usedSegmentIds) && predicate(segment)
  ) ?? null;

const resolvePartySegmentCandidates = (
  segments: PromptExploderSegment[],
  usedSegmentIds: Set<string>,
  config: PartySegmentConfig
): PromptExploderSegment[] => [
  findPartySegmentCandidate(segments, usedSegmentIds, (segment: PromptExploderSegment): boolean =>
    hasPatternId(segment, config.preferredHeadingId)
  ),
  findPartySegmentCandidate(segments, usedSegmentIds, (segment: PromptExploderSegment): boolean =>
    hasPatternPrefix(segment, config.preferredExtractPrefix)
  ),
  findPartySegmentCandidate(segments, usedSegmentIds, (segment: PromptExploderSegment): boolean =>
    hasPatternPrefix(segment, ADDRESS_EXTRACT_PREFIX) && config.fallbackPredicate(segment)
  ),
  findPartySegmentCandidate(segments, usedSegmentIds, config.fallbackPredicate),
].filter((segment): segment is PromptExploderSegment => segment !== null);

export const resolvePartySegment = (
  segments: PromptExploderSegment[],
  role: PromptExploderCaseResolverPartyRole,
  usedSegmentIds: Set<string>
): PromptExploderSegment | null => {
  const resolved =
    resolvePartySegmentCandidates(segments, usedSegmentIds, PARTY_SEGMENT_CONFIG[role])[0] ?? null;
  if (resolved) {
    usedSegmentIds.add(resolved.id);
  }
  return resolved;
};

export const resolvePersonNameParts = (
  lines: string[],
  fallbackLine: string
): {
  displayName: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
} => {
  const source =
    lines.find((line: string): boolean => isLikelyPersonNameLine(line)) ?? fallbackLine;
  const normalized = normalizeText(source);
  if (!normalized) {
    return {
      displayName: fallbackLine,
    };
  }
  const tokens = normalized.split(/\\s+/).filter(Boolean);
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

export const resolveOrganizationName = (lines: string[], fallbackLine: string): string => {
  const organizationLine =
    lines.find((line: string): boolean => ORGANIZATION_HINT_RE.test(line)) ?? fallbackLine;
  return normalizeText(organizationLine);
};

export const buildPartyCandidateFromSegment = (
  segment: PromptExploderSegment,
  role: PromptExploderCaseResolverPartyRole
): PromptExploderCaseResolverPartyCandidate | null => {
  const lines = splitSegmentLines(segment);
  if (!lines.length) return null;

  const rawText = (segment.raw || segment.text || '').trim();
  const firstLine = lines[0] ?? '';
  const likelyPersonNameLine =
    lines.find((line: string): boolean => isLikelyPersonNameLine(line)) ?? null;
  const likelyOrganizationLine =
    lines.find((line: string): boolean => ORGANIZATION_HINT_RE.test(line)) ?? null;

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

  if (!(base.displayName || '').trim() && !(base.rawText || '').trim()) return null;
  return base;
};

export const resolvePlaceDateMetadata = (
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
