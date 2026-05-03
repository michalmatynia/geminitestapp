import { normalizeString } from '../filemaker-settings.helpers';
import type { FilemakerPartyKind, FilemakerPartyReference } from '../types';

export const matchesPartyReferenceFilter = (
  references: FilemakerPartyReference[],
  partyKind: FilemakerPartyKind,
  partyId: string
): boolean =>
  references.some(
    (reference: FilemakerPartyReference): boolean =>
      reference.kind === partyKind && reference.id === partyId
  );

export const matchesLocationFilter = (
  values: string[],
  candidate: string
): boolean => {
  if (values.length === 0) return true;
  const normalizedCandidate = normalizeString(candidate).toLowerCase();
  if (normalizedCandidate.length === 0) return false;
  return values.some((value: string): boolean => value.trim().toLowerCase() === normalizedCandidate);
};
