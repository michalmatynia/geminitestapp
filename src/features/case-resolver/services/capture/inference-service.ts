/* eslint-disable complexity, @typescript-eslint/strict-boolean-expressions -- Capture inference compares multiple optional party/address signals. */
/**
 * Capture Inference Service
 * 
 * Provides utilities for inferring party roles and proposal states
 * based on candidate metadata and labels.
 */

import { normalizeCaseResolverComparable } from '@/features/case-resolver/services/party-matching';
import type { PromptExploderCaseResolverPartyCandidate } from '@/shared/contracts/prompt-exploder';
import type { CaseResolverCaptureRole } from '@/features/case-resolver/capture/settings';

const composeCandidateStreetNumber = (
  candidate: Pick<PromptExploderCaseResolverPartyCandidate, 'streetNumber' | 'houseNumber'>
): string => {
  const streetNumber = (candidate.streetNumber ?? '').trim();
  const houseNumber = (candidate.houseNumber ?? '').trim();
  if (!streetNumber) return '';
  return houseNumber ? `${streetNumber}/${houseNumber}` : streetNumber;
};

/**
 * Common role inference hints.
 */
export const CAPTURE_ADDRESSER_LABEL_HINTS = ['addresser', 'from', 'od', 'nadawca', 'sender', 'wnioskodawca'];
export const CAPTURE_ADDRESSEE_LABEL_HINTS = ['addressee', 'to', 'do', 'adresat', 'recipient', 'odbiorca', 'organ'];

/**
 * Infers a role (addresser/addressee) for a candidate based on source labels.
 */
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
  if (!source) return null;

  const countRoleHints = (hints: string[]): number =>
    hints.reduce((total, hint) => {
      const normalizedHint = normalizeCaseResolverComparable(hint);
      if (!normalizedHint) return total;
      return source.includes(normalizedHint) ? total + 1 : total;
    }, 0);

  const addresserScore = countRoleHints(CAPTURE_ADDRESSER_LABEL_HINTS);
  const addresseeScore = countRoleHints(CAPTURE_ADDRESSEE_LABEL_HINTS);
  if (addresserScore === addresseeScore) return null;
  return addresserScore > addresseeScore ? 'addresser' : 'addressee';
};

/**
 * Determines if two candidates are equivalent based on their raw text or segment ID.
 */
export const areEquivalentCandidates = (
  left: PromptExploderCaseResolverPartyCandidate,
  right: PromptExploderCaseResolverPartyCandidate
): boolean => {
  const equivalentOrMissing = (leftValue: string, rightValue: string): boolean =>
    leftValue === rightValue || !leftValue || !rightValue;

  const normalizedLeftSegmentId = normalizeCaseResolverComparable(left.sourceSegmentId ?? '');
  const normalizedRightSegmentId = normalizeCaseResolverComparable(right.sourceSegmentId ?? '');
  
  if (normalizedLeftSegmentId && normalizedRightSegmentId && normalizedLeftSegmentId === normalizedRightSegmentId) {
    return true;
  }

  const normalizedLeftRawText = normalizeCaseResolverComparable(left.rawText ?? '');
  const normalizedRightRawText = normalizeCaseResolverComparable(right.rawText ?? '');
  
  if (normalizedLeftRawText && normalizedRightRawText && normalizedLeftRawText === normalizedRightRawText) {
    return true;
  }

  const normalizedLeftCore = normalizeCaseResolverComparable(left.rawText || left.displayName || left.organizationName || '');
  const normalizedRightCore = normalizeCaseResolverComparable(right.rawText || right.displayName || right.organizationName || '');
  if (!normalizedLeftCore || !normalizedRightCore) return false;
  if (normalizedLeftCore !== normalizedRightCore) return false;

  const normalizedLeftStreet = normalizeCaseResolverComparable(left.street ?? '');
  const normalizedRightStreet = normalizeCaseResolverComparable(right.street ?? '');
  const normalizedLeftStreetNumber = normalizeCaseResolverComparable(
    composeCandidateStreetNumber(left)
  );
  const normalizedRightStreetNumber = normalizeCaseResolverComparable(
    composeCandidateStreetNumber(right)
  );
  const normalizedLeftCity = normalizeCaseResolverComparable(left.city ?? '');
  const normalizedRightCity = normalizeCaseResolverComparable(right.city ?? '');
  const normalizedLeftPostalCode = normalizeCaseResolverComparable(left.postalCode ?? '');
  const normalizedRightPostalCode = normalizeCaseResolverComparable(right.postalCode ?? '');
  const normalizedLeftCountry = normalizeCaseResolverComparable(left.country ?? '');
  const normalizedRightCountry = normalizeCaseResolverComparable(right.country ?? '');

  return (
    equivalentOrMissing(normalizedLeftStreet, normalizedRightStreet) &&
    equivalentOrMissing(normalizedLeftStreetNumber, normalizedRightStreetNumber) &&
    equivalentOrMissing(normalizedLeftCity, normalizedRightCity) &&
    equivalentOrMissing(normalizedLeftPostalCode, normalizedRightPostalCode) &&
    equivalentOrMissing(normalizedLeftCountry, normalizedRightCountry)
  );
};
