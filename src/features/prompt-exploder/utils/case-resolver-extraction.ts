/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, complexity, max-lines, max-lines-per-function, @typescript-eslint/strict-boolean-expressions */
import type { PromptValidationRule } from '@/shared/contracts/prompt-engine';
import type {
  PromptExploderCaseResolverMetadata,
  PromptExploderCaseResolverPartyBundle,
  PromptExploderCaseResolverPartyCandidate,
  PromptExploderCaseResolverExtractionMode,
  PromptExploderCaseResolverCaptureRole,
  CaseResolverCaptureField,
  CaseResolverSegmentCaptureRule,
  PromptExploderSegment,
} from '@/shared/contracts/prompt-exploder';


import {
  buildPartyCandidateFromSegment,
  resolvePartySegment,
  resolvePlaceDateMetadata,
} from './case-resolver-extraction-heuristics';
import {
  applyCaptureRulesToSegments,
  type CaseResolverPartyDraft,
} from './case-resolver-extraction-rules-logic';
import {
  ORGANIZATION_HINT_RE,
  normalizeRawCaptureText,
  normalizeText,
} from './case-resolver-extraction-utils';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


export * from './case-resolver-extraction-utils';
export * from './case-resolver-extraction-heuristics';

const toPartyCandidateFromDraft = (
  draft: CaseResolverPartyDraft | null | undefined
): PromptExploderCaseResolverPartyCandidate | null => {
  if (!draft) return null;
  const firstName = normalizeText(draft.firstName ?? '');
  const middleName = normalizeText(draft.middleName ?? '');
  const lastName = normalizeText(draft.lastName ?? '');
  const explicitDisplayName = normalizeText(draft.displayName ?? '');
  const rawText = normalizeRawCaptureText(draft.rawText ?? '');
  const rawDisplayLine =
    rawText
      .split('\\n')
      .map((line: string): string => line.trim())
      .find((line: string): boolean => line.length > 0) ?? '';
  const organizationHintLine = explicitDisplayName || rawDisplayLine;
  const inferredOrganizationName =
    !firstName &&
    !lastName &&
    organizationHintLine &&
    ORGANIZATION_HINT_RE.test(organizationHintLine)
      ? organizationHintLine
      : '';
  const organizationName = normalizeText(draft.organizationName ?? '') || inferredOrganizationName;
  const nameFromParts = [firstName, middleName, lastName].filter(Boolean).join(' ');
  const displayName = explicitDisplayName || organizationName || nameFromParts;
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

  const shouldUseHeuristics = mode === 'rules_with_heuristics';
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

  const addresser = mergePartyCandidates(ruleAddresser, heuristicPayload?.addresser ?? null);
  const addressee = mergePartyCandidates(ruleAddressee, heuristicPayload?.addressee ?? null);
  const metadata = mergeMetadata(ruleMetadata, heuristicPayload?.metadata ?? null);

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

  const normalizeRole = (value: string): PromptExploderCaseResolverCaptureRole | null => {
    const normalized = value.trim();
    if (normalized === 'addresser') return 'addresser';
    if (normalized === 'addressee') return 'addressee';
    if (normalized === 'subject') return 'subject';
    if (normalized === 'reference') return 'reference';
    if (normalized === 'other') return 'other';
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
      } catch (error) {
        logClientError(error);
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
      const sequence =
        typeof rule.sequence === 'number' && Number.isFinite(rule.sequence) ? rule.sequence : 0;
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
    .filter(
      (entry: CaseResolverSegmentCaptureRule | null): entry is CaseResolverSegmentCaptureRule =>
        entry !== null
    )
    .sort((left: CaseResolverSegmentCaptureRule, right: CaseResolverSegmentCaptureRule): number => {
      if (left.sequence !== right.sequence) return left.sequence - right.sequence;
      return left.id.localeCompare(right.id);
    });
};
