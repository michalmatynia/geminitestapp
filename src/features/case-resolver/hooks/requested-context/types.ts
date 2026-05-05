import type { CaseResolverRequestedCaseIssue, CaseResolverRequestedCaseStatus } from '@/shared/contracts/case-resolver/base';

export interface UseCaseResolverRequestedContextValue {
  requestedCaseStatus: CaseResolverRequestedCaseStatus;
  requestedCaseIssue: CaseResolverRequestedCaseIssue | null;
  requestedContextAutoClearRequestKey: string | null;
  setRequestedCaseStatus: (status: CaseResolverRequestedCaseStatus) => void;
  handleAcknowledgeRequestedContextAutoClear: (requestKey: string | null) => void;
  handleRetryCaseContext: () => void;
  resetRequestedContextState: () => void;
}
