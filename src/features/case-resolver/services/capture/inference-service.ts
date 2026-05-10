/**
 * Capture Inference Service
 *
 * Provides utilities for inferring party roles and proposal states
 * based on candidate metadata and labels.
 */

import { normalizeCaseResolverComparable } from '@/features/case-resolver/services/party-matching';
import type { PromptExploderCaseResolverPartyCandidate } from '@/shared/contracts/prompt-exploder';
import type { CaseResolverCaptureRole } from '@/features/case-resolver/capture/settings';

type CandidateAddressParts = {
  city: string;
  country: string;
  postalCode: string;
  street: string;
  streetNumber: string;
};

const composeCandidateStreetNumber = (
  candidate: Pick<PromptExploderCaseResolverPartyCandidate, 'streetNumber' | 'houseNumber'>
): string => {
  const streetNumber = (candidate.streetNumber ?? '').trim();
  const houseNumber = (candidate.houseNumber ?? '').trim();
  if (streetNumber.length === 0) return '';
  return houseNumber.length > 0 ? `${streetNumber}/${houseNumber}` : streetNumber;
};

export const CAPTURE_ADDRESSER_LABEL_HINTS = [
  'addresser',
  'from',
  'od',
  'nadawca',
  'sender',
  'wnioskodawca',
];
export const CAPTURE_ADDRESSEE_LABEL_HINTS = [
  'addressee',
  'to',
  'do',
  'adresat',
  'recipient',
  'odbiorca',
  'organ',
];

const countRoleHints = (source: string, hints: string[]): number =>
  hints.reduce((total, hint) => {
    const normalizedHint = normalizeCaseResolverComparable(hint);
    if (normalizedHint.length === 0) return total;
    return source.includes(normalizedHint) ? total + 1 : total;
  }, 0);

export const inferCandidateRoleFromLabels = (
  candidate: PromptExploderCaseResolverPartyCandidate
): CaseResolverCaptureRole | null => {
  const source = normalizeCaseResolverComparable(
    [
      ...(candidate.sourcePatternLabels ?? []),
      ...(candidate.sourceSequenceLabels ?? []),
      candidate.sourceSegmentTitle ?? '',
    ].join(' ')
  );
  if (source.length === 0) return null;

  const addresserScore = countRoleHints(source, CAPTURE_ADDRESSER_LABEL_HINTS);
  const addresseeScore = countRoleHints(source, CAPTURE_ADDRESSEE_LABEL_HINTS);
  if (addresserScore === addresseeScore) return null;
  return addresserScore > addresseeScore ? 'addresser' : 'addressee';
};

const areEquivalentOrMissing = (leftValue: string, rightValue: string): boolean =>
  leftValue === rightValue || leftValue.length === 0 || rightValue.length === 0;

const areSameNonEmptyValue = (leftValue: string, rightValue: string): boolean =>
  leftValue.length > 0 && rightValue.length > 0 && leftValue === rightValue;

const firstNonEmptyValue = (...values: (string | null | undefined)[]): string =>
  values.find((value) => (value ?? '').trim().length > 0) ?? '';

const normalizeCandidateCore = (
  candidate: PromptExploderCaseResolverPartyCandidate
): string =>
  normalizeCaseResolverComparable(
    firstNonEmptyValue(candidate.rawText, candidate.displayName, candidate.organizationName)
  );

const normalizeCandidateAddressParts = (
  candidate: PromptExploderCaseResolverPartyCandidate
): CandidateAddressParts => ({
  city: normalizeCaseResolverComparable(candidate.city ?? ''),
  country: normalizeCaseResolverComparable(candidate.country ?? ''),
  postalCode: normalizeCaseResolverComparable(candidate.postalCode ?? ''),
  street: normalizeCaseResolverComparable(candidate.street ?? ''),
  streetNumber: normalizeCaseResolverComparable(composeCandidateStreetNumber(candidate)),
});

const haveSameSourceSegment = (
  left: PromptExploderCaseResolverPartyCandidate,
  right: PromptExploderCaseResolverPartyCandidate
): boolean =>
  areSameNonEmptyValue(
    normalizeCaseResolverComparable(left.sourceSegmentId ?? ''),
    normalizeCaseResolverComparable(right.sourceSegmentId ?? '')
  );

const haveSameRawText = (
  left: PromptExploderCaseResolverPartyCandidate,
  right: PromptExploderCaseResolverPartyCandidate
): boolean =>
  areSameNonEmptyValue(
    normalizeCaseResolverComparable(left.rawText ?? ''),
    normalizeCaseResolverComparable(right.rawText ?? '')
  );

const haveSameCoreIdentity = (
  left: PromptExploderCaseResolverPartyCandidate,
  right: PromptExploderCaseResolverPartyCandidate
): boolean => {
  const normalizedLeftCore = normalizeCandidateCore(left);
  const normalizedRightCore = normalizeCandidateCore(right);
  return areSameNonEmptyValue(normalizedLeftCore, normalizedRightCore);
};

const areAddressPartsCompatible = (
  left: CandidateAddressParts,
  right: CandidateAddressParts
): boolean =>
  areEquivalentOrMissing(left.street, right.street) &&
  areEquivalentOrMissing(left.streetNumber, right.streetNumber) &&
  areEquivalentOrMissing(left.city, right.city) &&
  areEquivalentOrMissing(left.postalCode, right.postalCode) &&
  areEquivalentOrMissing(left.country, right.country);

export const areEquivalentCandidates = (
  left: PromptExploderCaseResolverPartyCandidate,
  right: PromptExploderCaseResolverPartyCandidate
): boolean => {
  if (haveSameSourceSegment(left, right)) return true;
  if (haveSameRawText(left, right)) return true;
  if (!haveSameCoreIdentity(left, right)) return false;
  return areAddressPartsCompatible(
    normalizeCandidateAddressParts(left),
    normalizeCandidateAddressParts(right)
  );
};
