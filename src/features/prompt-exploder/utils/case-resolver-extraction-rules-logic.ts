import type {
  PromptExploderSegment,
  PromptExploderCaseResolverPartyRole,
  PromptExploderCaseResolverPartyCandidate,
  PromptExploderCaseResolverMetadata,
  CaseResolverCaptureField,
  CaseResolverSegmentCaptureRule,
} from '@/shared/contracts/prompt-exploder';
import { readRegexCaptureGroup } from '@/features/prompt-exploder/helpers/capture';

import {
  CASE_RESOLVER_LABEL_ROLE_CONFIG,
  ORGANIZATION_HINT_RE,
  hasPatternId,
  hasPatternPrefix,
  normalizeRawCaptureText,
  normalizeSegmentLabels,
  normalizeText,
  padNumberValue,
  resolveSegmentDisplayLabel,
  splitSegmentLines,
  normalizeCountryName,
} from './case-resolver-extraction-utils';
import {
  isLikelyAddresserSegment,
  isLikelyAddresseeSegment,
} from './case-resolver-extraction-heuristics';

export type CaseResolverExtractionSegment = PromptExploderSegment & {
  __caseResolverForcedRole?: PromptExploderCaseResolverPartyRole | null;
  __caseResolverSourceSegmentId?: string | undefined;
  __caseResolverSourceSegmentTitle?: string | undefined;
};

export type CaseResolverPartyDraft = Partial<PromptExploderCaseResolverPartyCandidate> & {
  role: PromptExploderCaseResolverPartyRole;
  sourceSegmentId?: string;
  sourceSegmentTitle?: string;
  sourcePatternLabels?: string[];
  sourceSequenceLabels?: string[];
};

export type CaseResolverRuleExtractionDraft = {
  parties: Partial<Record<PromptExploderCaseResolverPartyRole, CaseResolverPartyDraft>>;
  metadata: PromptExploderCaseResolverMetadata;
};

export const inferSegmentRoleHint = (
  segment: CaseResolverExtractionSegment
): PromptExploderCaseResolverPartyRole | null => {
  if (segment.__caseResolverForcedRole) {
    return segment.__caseResolverForcedRole;
  }
  const hasAddresserPattern =
    hasPatternId(segment, 'segment.case_resolver.heading.addresser_label') ||
    hasPatternId(segment, 'segment.case_resolver.heading.addresser_person') ||
    hasPatternPrefix(segment, 'segment.case_resolver.extract.addresser.');
  const hasAddresseePattern =
    hasPatternId(segment, 'segment.case_resolver.heading.addressee_label') ||
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
    const hasOrganizationLine = splitSegmentLines(segment).some((line: string): boolean =>
      ORGANIZATION_HINT_RE.test(line)
    );
    if (hasOrganizationLine) return 'addressee';
  }
  return null;
};

export const normalizeCapturedValue = (
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
    if (base.length === 2) return '20${base}';
    return base;
  }
  return base;
};

export const ensurePartyDraft = (
  draft: CaseResolverRuleExtractionDraft,
  role: PromptExploderCaseResolverPartyRole,
  segment: CaseResolverExtractionSegment
): CaseResolverPartyDraft => {
  const existing = draft.parties[role];
  if (existing) return existing;
  const next: CaseResolverPartyDraft = {
    role,
    rawText: normalizeRawCaptureText(segment.raw || segment.text || '') || '',
    sourceSegmentId: segment.__caseResolverSourceSegmentId ?? segment.id,
    sourceSegmentTitle:
      segment.__caseResolverSourceSegmentTitle ?? resolveSegmentDisplayLabel(segment),
    sourcePatternLabels: normalizeSegmentLabels(segment.matchedPatternLabels),
    sourceSequenceLabels: normalizeSegmentLabels(segment.matchedSequenceLabels),
  };
  draft.parties[role] = next;
  return next;
};

export const resolveLabeledSegmentRole = (
  line: string
): PromptExploderCaseResolverPartyRole | null => {
  if (CASE_RESOLVER_LABEL_ROLE_CONFIG.addresser.pattern.test(line)) return 'addresser';
  if (CASE_RESOLVER_LABEL_ROLE_CONFIG.addressee.pattern.test(line)) return 'addressee';
  return null;
};

export const normalizeLabeledPartySegments = (
  segments: PromptExploderSegment[]
): CaseResolverExtractionSegment[] => {
  const normalizedSegments: CaseResolverExtractionSegment[] = [];

  segments.forEach((segment: PromptExploderSegment): void => {
    const sourceText = segment.raw || segment.text || '';
    if (!sourceText.trim()) {
      normalizedSegments.push(segment);
      return;
    }

    const lines = sourceText.replace(/\\r\\n/g, '\\n').split('\\n');
    const labeledBlocks: Array<{
      role: PromptExploderCaseResolverPartyRole;
      lines: string[];
    }> = [];
    let currentRole: PromptExploderCaseResolverPartyRole | null = null;
    let currentBlockLines: string[] = [];
    let sawLabel = false;
    let sawMeaningfulPrefix = false;

    const flushCurrent = (): void => {
      if (!currentRole) return;
      const hasMeaningfulContent = currentBlockLines.some((candidateLine: string): boolean =>
        normalizeText(candidateLine).length > 0
      );
      if (!hasMeaningfulContent) return;
      labeledBlocks.push({
        role: currentRole,
        lines: [...currentBlockLines],
      });
    };

    lines.forEach((line: string): void => {
      const role = resolveLabeledSegmentRole(line);
      if (role) {
        const hasCurrentContent = currentBlockLines.some((candidateLine: string): boolean =>
          normalizeText(candidateLine).length > 0
        );
        if (!sawLabel && hasCurrentContent) {
          sawMeaningfulPrefix = true;
        }
        flushCurrent();
        currentRole = role;
        currentBlockLines = [line];
        sawLabel = true;
        return;
      }

      if (currentRole) {
        currentBlockLines.push(line);
        return;
      }

      if (normalizeText(line).length > 0) {
        sawMeaningfulPrefix = true;
      }
      currentBlockLines.push(line);
    });

    flushCurrent();

    if (!sawLabel || sawMeaningfulPrefix || labeledBlocks.length === 0) {
      normalizedSegments.push(segment);
      return;
    }

    labeledBlocks.forEach((block, _index): void => {
      if (block.role !== 'addresser' && block.role !== 'addressee') return;
      const roleConfig = CASE_RESOLVER_LABEL_ROLE_CONFIG[block.role];
      const blockText = normalizeRawCaptureText(block.lines.join('\n'));
      normalizedSegments.push({
        ...segment,
        id: `${segment.id}::case_resolver::${block.role}_${index + 1}`,
        raw: blockText,
        text: blockText,
        matchedPatternIds: [
          ...new Set([...segment.matchedPatternIds, roleConfig.headingPatternId]),
        ],
        matchedPatternLabels: [
          ...new Set([
            ...(segment.matchedPatternLabels ?? []),
            roleConfig.headingPatternLabel,
            roleConfig.virtualSplitLabel,
          ]),
        ],
        matchedSequenceLabels: [
          ...new Set([...(segment.matchedSequenceLabels ?? []), 'Case Resolver Structure']),
        ],
        __caseResolverForcedRole: block.role,
        __caseResolverSourceSegmentId: segment.id,
        __caseResolverSourceSegmentTitle: resolveSegmentDisplayLabel(segment),
      });
    });
  });

  return normalizedSegments;
};

export const setPartyField = (
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
    const normalized =
      value === 'organization' ? 'organization' : value === 'person' ? 'person' : null;
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

export const setMetadataField = (
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

export const applyCaptureRulesToSegments = (args: {
  segments: PromptExploderSegment[];
  captureRules: CaseResolverSegmentCaptureRule[];
}): CaseResolverRuleExtractionDraft => {
  const draft: CaseResolverRuleExtractionDraft = {
    parties: {},
    metadata: {},
  };
  if (args.captureRules.length === 0) return draft;

  const normalizedSegments = normalizeLabeledPartySegments(args.segments);

  normalizedSegments.forEach((segment: CaseResolverExtractionSegment): void => {
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
          setMetadataField(draft.metadata, rule.field, normalizedCapture, rule.overwrite, segment);
          break;
        }

        const targetRoles: PromptExploderCaseResolverPartyRole[] =
          rule.role === 'party' ? (roleHint ? [roleHint] : []) : [rule.role];
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
