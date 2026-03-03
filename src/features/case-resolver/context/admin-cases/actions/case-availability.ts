'use client';

 
 
 
 
 
 

import { 
  fetchCaseResolverWorkspaceSnapshot, 
  getCaseResolverWorkspaceRevision, 
  logCaseResolverWorkspaceEvent 
} from '../../../workspace-persistence';
import { 
  CASE_RESOLVER_CASE_READY_MAX_ATTEMPTS, 
  CASE_RESOLVER_CASE_READY_INTERVAL_MS 
} from '../utils';
import type { CaseResolverFile, CaseResolverWorkspace } from '@/shared/contracts/case-resolver';

export const waitForCaseAvailability = async (
  caseId: string,
  args: {
    lastPersistedWorkspaceRevisionRef: React.MutableRefObject<number>;
    lastPersistedWorkspaceValueRef: React.MutableRefObject<string>;
    setWorkspace: (w: CaseResolverWorkspace) => void;
    settingsStoreRefetchRef: React.MutableRefObject<() => void>;
    options?: {
      source?: string;
      maxAttempts?: number;
      intervalMs?: number;
    };
  }
): Promise<boolean> => {
  const { lastPersistedWorkspaceRevisionRef, lastPersistedWorkspaceValueRef, setWorkspace, settingsStoreRefetchRef, options } = args;
  const source = options?.source ?? 'cases_page_case_sync';
  const maxAttempts = options?.maxAttempts ?? CASE_RESOLVER_CASE_READY_MAX_ATTEMPTS;
  const intervalMs = options?.intervalMs ?? CASE_RESOLVER_CASE_READY_INTERVAL_MS;
  const wait = async (ms: number): Promise<void> =>
    new Promise<void>((resolve) => {
      window.setTimeout(resolve, ms);
    });

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const snapshot = await fetchCaseResolverWorkspaceSnapshot(source);
    if (snapshot) {
      const hasCase = snapshot.files.some(
        (file: CaseResolverFile): boolean => file.id === caseId && file.fileType === 'case'
      );
      if (hasCase) {
        const serialized = JSON.stringify(snapshot);
        const revision = getCaseResolverWorkspaceRevision(snapshot);
        if (revision >= lastPersistedWorkspaceRevisionRef.current) {
          lastPersistedWorkspaceValueRef.current = serialized;
          lastPersistedWorkspaceRevisionRef.current = revision;
          setWorkspace(snapshot);
        }
        settingsStoreRefetchRef.current();
        logCaseResolverWorkspaceEvent({
          source,
          action: 'case_availability_confirmed',
          workspaceRevision: revision,
        });
        return true;
      }
    }

    if (attempt === 0) {
      settingsStoreRefetchRef.current();
    }
    if (attempt < maxAttempts - 1) {
      await wait(intervalMs);
    }
  }

  logCaseResolverWorkspaceEvent({
    source,
    action: 'case_availability_missing',
    message: `Case was not visible after sync attempts: ${caseId}`,
  });
  return false;
};
