import type { CaseResolverWorkspace } from '@/shared/contracts/case-resolver/workspace';

export type WorkspaceRecordFetchAttempt = {
  key: string;
  url: string;
  scope: 'light' | 'heavy';
};

export type WorkspaceRecordAttemptResult =
  | {
      status: 'resolved';
      workspace: CaseResolverWorkspace;
      attemptKey: string;
      scope: 'light' | 'heavy';
    }
  | {
      status: 'incomplete';
      lastFailureMessage: string;
      sawMissingRequiredFile: boolean;
      lastMissingRequiredAttemptKey: string | null;
      sawTransportFailure: boolean;
      budgetExhausted: boolean;
    };

export interface FetchAttemptsArgs {
  source: string;
  workspaceKey: string;
  attempts: WorkspaceRecordFetchAttempt[];
  startedAt: number;
  maxTotalMs: number;
  attemptTimeoutMs: number;
  requiredFileId: string;
  logHeavyFallback: boolean;
}
