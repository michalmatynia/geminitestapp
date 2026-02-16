import {
  composeCandidateStreetNumber,
  findExistingFilemakerAddressId,
  findExistingFilemakerPartyReference,
  normalizeCaseResolverComparable,
} from '@/features/case-resolver/party-matching';
import type { CaseResolverPartyReference } from '@/features/case-resolver/types';
import type { FilemakerDatabase } from '@/features/filemaker/types';
import type {
  PromptExploderCaseResolverPartyBundle,
  PromptExploderCaseResolverPartyCandidate,
} from '@/features/prompt-exploder/bridge';

import type {
  CaseResolverCaptureAction,
  CaseResolverCaptureRole,
  CaseResolverCaptureRoleMapping,
  CaseResolverCaptureSettings,
} from './settings';

export type CaseResolverCaptureProposal = {
  role: CaseResolverCaptureRole;
  sourceRole: CaseResolverCaptureRole;
  candidate: PromptExploderCaseResolverPartyCandidate;
  existingReference: CaseResolverPartyReference | null;
  existingAddressId: string | null;
  action: CaseResolverCaptureAction;
};

export type CaseResolverCaptureProposalState = {
  targetFileId: string;
  addresser: CaseResolverCaptureProposal | null;
  addressee: CaseResolverCaptureProposal | null;
};

const CAPTURE_ADDRESSER_LABEL_HINTS = ['addresser', 'nadawca', 'sender', 'wnioskodawca'];
const CAPTURE_ADDRESSEE_LABEL_HINTS = ['addressee', 'adresat', 'recipient', 'odbiorca', 'organ'];

const inferCandidateRoleFromLabels = (
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
    hints.reduce((total: number, hint: string): number => {
      const normalizedHint = normalizeCaseResolverComparable(hint);
      if (!normalizedHint) return total;
      return source.includes(normalizedHint) ? total + 1 : total;
    }, 0);

  const addresserScore = countRoleHints(CAPTURE_ADDRESSER_LABEL_HINTS);
  const addresseeScore = countRoleHints(CAPTURE_ADDRESSEE_LABEL_HINTS);
  if (addresserScore === addresseeScore) return null;
  return addresserScore > addresseeScore ? 'addresser' : 'addressee';
};

const buildCaseResolverCaptureProposal = (args: {
  sourceRole: CaseResolverCaptureRole;
  targetRole: CaseResolverCaptureRole;
  candidate: PromptExploderCaseResolverPartyCandidate;
  mapping: CaseResolverCaptureRoleMapping;
  database: FilemakerDatabase;
}): CaseResolverCaptureProposal | null => {
  if (!args.mapping.enabled) return null;
  if (!args.candidate.rawText.trim() && !args.candidate.displayName.trim()) return null;

  const existingReference = args.mapping.autoMatchPartyReference
    ? findExistingFilemakerPartyReference(args.database, args.candidate)
    : null;

  const existingAddressId = args.mapping.autoMatchAddress
    ? findExistingFilemakerAddressId(args.database, {
      street: args.candidate.street ?? '',
      streetNumber: composeCandidateStreetNumber(args.candidate),
      city: args.candidate.city ?? '',
      postalCode: args.candidate.postalCode ?? '',
      country: args.candidate.country ?? '',
      countryId: '',
    })
    : null;

  return {
    role: args.targetRole,
    sourceRole: args.sourceRole,
    candidate: args.candidate,
    existingReference: existingReference
      ? {
        kind: existingReference.kind,
        id: String(existingReference.id),
      }
      : null,
    existingAddressId,
    action: args.mapping.defaultAction,
  };
};

export const buildCaseResolverCaptureProposalState = (
  payload: PromptExploderCaseResolverPartyBundle | undefined,
  targetFileId: string,
  database: FilemakerDatabase,
  settings: CaseResolverCaptureSettings
): CaseResolverCaptureProposalState | null => {
  if (!settings.enabled || !payload) return null;

  const resolvedCandidates: Partial<
    Record<CaseResolverCaptureRole, PromptExploderCaseResolverPartyCandidate>
  > = {
    ...(payload.addresser ? { addresser: payload.addresser } : {}),
    ...(payload.addressee ? { addressee: payload.addressee } : {}),
  };

  [payload.addresser, payload.addressee].forEach((candidate) => {
    if (!candidate) return;
    const inferredRole = inferCandidateRoleFromLabels(candidate);
    if (!inferredRole || resolvedCandidates[inferredRole]) return;
    resolvedCandidates[inferredRole] = candidate;
  });

  const proposals: Record<CaseResolverCaptureRole, CaseResolverCaptureProposal | null> = {
    addresser: null,
    addressee: null,
  };

  (['addresser', 'addressee'] as const).forEach((sourceRole) => {
    const candidate = resolvedCandidates[sourceRole];
    if (!candidate) return;

    const mapping = settings.roleMappings[sourceRole];
    const targetRole = mapping.targetRole;
    const proposal = buildCaseResolverCaptureProposal({
      sourceRole,
      targetRole,
      candidate,
      mapping,
      database,
    });
    if (!proposal) return;

    const current = proposals[targetRole];
    // If two source roles map to the same target role, prefer the direct role mapping.
    if (!current || sourceRole === targetRole) {
      proposals[targetRole] = proposal;
    }
  });

  if (!proposals.addresser && !proposals.addressee) return null;
  return {
    targetFileId,
    addresser: proposals.addresser,
    addressee: proposals.addressee,
  };
};
