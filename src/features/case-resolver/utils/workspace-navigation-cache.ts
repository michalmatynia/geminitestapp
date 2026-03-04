import { type CaseResolverWorkspace } from '@/shared/contracts/case-resolver';

const CASE_RESOLVER_WORKSPACE_NAVIGATION_CACHE_KEY = '__caseResolverWorkspaceNavigationCache';
const CASE_RESOLVER_WORKSPACE_NAVIGATION_CACHE_TTL_MS = 2 * 60 * 1000;

type CaseResolverWorkspaceNavigationCache = {
  workspace: CaseResolverWorkspace;
  cachedAtMs: number;
};

const readNavigationCache = (): CaseResolverWorkspaceNavigationCache | null => {
  const scope = globalThis as typeof globalThis & {
    [CASE_RESOLVER_WORKSPACE_NAVIGATION_CACHE_KEY]?: CaseResolverWorkspaceNavigationCache;
  };
  const cache = scope[CASE_RESOLVER_WORKSPACE_NAVIGATION_CACHE_KEY];
  if (!cache || typeof cache !== 'object') return null;
  if (
    !cache.workspace ||
    typeof cache.cachedAtMs !== 'number' ||
    !Number.isFinite(cache.cachedAtMs)
  ) {
    return null;
  }
  if (Date.now() - cache.cachedAtMs > CASE_RESOLVER_WORKSPACE_NAVIGATION_CACHE_TTL_MS) {
    return null;
  }
  return cache;
};

export const primeCaseResolverNavigationWorkspace = (workspace: CaseResolverWorkspace): void => {
  const scope = globalThis as typeof globalThis & {
    [CASE_RESOLVER_WORKSPACE_NAVIGATION_CACHE_KEY]?: CaseResolverWorkspaceNavigationCache;
  };
  scope[CASE_RESOLVER_WORKSPACE_NAVIGATION_CACHE_KEY] = {
    workspace,
    cachedAtMs: Date.now(),
  };
};

export const readCaseResolverNavigationWorkspace = (): CaseResolverWorkspace | null => {
  const cache = readNavigationCache();
  return cache?.workspace ?? null;
};
