import type { CaseResolverPartyReference } from '@/shared/contracts/case-resolver';
import type { PromptExploderCaseResolverPartyCandidate } from '@/shared/contracts/prompt-exploder';
import type { CaseResolverCaptureAction, CaseResolverCaptureRole } from '../settings';

export type CaseResolverCaptureProposalMatchKind =
  | 'none'
  | 'party'
  | 'address'
  | 'party_and_address';

export type CaseResolverCaptureProposal = {
  role: CaseResolverCaptureRole;
  sourceRole: CaseResolverCaptureRole;
  candidate: PromptExploderCaseResolverPartyCandidate;
  existingReference: CaseResolverPartyReference | null;
  existingAddressId: string | null;
  matchKind: CaseResolverCaptureProposalMatchKind;
  hasAddressCandidate: boolean;
  action: CaseResolverCaptureAction;
};

export type CaseResolverCaptureDocumentDateAction = 'useDetectedDate' | 'keepText' | 'ignore';

export type CaseResolverCaptureDocumentDateProposal = {
  isoDate: string;
  source: 'metadata' | 'text';
  sourceLine: string | null;
  cityHint: string | null;
  city: string | null;
  action: CaseResolverCaptureDocumentDateAction;
};

export type CaseResolverCaptureProposalState = {
  targetFileId: string;
  addresser: CaseResolverCaptureProposal | null;
  addressee: CaseResolverCaptureProposal | null;
  documentDate: CaseResolverCaptureDocumentDateProposal | null;
};

export type CaseResolverCaptureCleanupReport = {
  changed: boolean;
  sourceWasHtml: boolean;
  removedAddressLineCount: number;
  removedAddresserLineCount: number;
  removedAddresseeLineCount: number;
  removedDateLineCount: number;
};

export type CaseResolverCaptureCleanupResult = {
  text: string;
  report: CaseResolverCaptureCleanupReport;
};
