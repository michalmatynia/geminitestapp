import React, { startTransition } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useRouter } from 'nextjs-toploader/app';
import { matchesMailClientAccountScope, matchesMailClientAccountQuery, matchesMailClientThreadQuery, type MailClientDashboardScope, normalizeMailClientFilterValue } from './AdminFilemakerMailClientPage.helpers';
import type { useAdminFilemakerMailClientPageActions } from './AdminFilemakerMailClientPage.actions';
import type { useAdminFilemakerMailClientPageState } from './AdminFilemakerMailClientPage.hooks';
import { buildMailClientDashboardHref, normalizeMailClientDashboardAccountId, parseMailClientDashboardScope } from './AdminFilemakerMailClientPage.route';

export type MailClientDashboardState = ReturnType<typeof useAdminFilemakerMailClientPageState>;
export type MailClientDashboardActions = ReturnType<typeof useAdminFilemakerMailClientPageActions>;
export type MailClientDashboardProps = MailClientDashboardState & MailClientDashboardActions;
export type MailClientDashboardFilterState = {
  dashboardAccountId: string;
  dashboardQuery: string;
  clearDashboardFilters: () => void;
  dashboardScope: MailClientDashboardScope;
  hasActiveDashboardFilter: boolean;
  setDashboardAccountId: React.Dispatch<React.SetStateAction<string>>;
  setDashboardQuery: React.Dispatch<React.SetStateAction<string>>;
  setDashboardScope: React.Dispatch<React.SetStateAction<MailClientDashboardScope>>;
  visibleAttentionAccounts: MailClientDashboardState['attentionAccounts'];
  visibleAccounts: MailClientDashboardState['accounts'];
  visibleRecentThreads: MailClientDashboardState['recentThreads'];
};

type MailClientDashboardRouteState = {
  currentDashboardHref: string;
  requestedDashboardAccountId: string;
  requestedDashboardQuery: string;
  requestedDashboardScope: MailClientDashboardScope;
  replaceDashboardRoute: (input: { accountId: string; query: string; scope: MailClientDashboardScope }) => void;
};
function useMailClientDashboardRouteState(): MailClientDashboardRouteState {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requestedDashboardAccountId = normalizeMailClientDashboardAccountId(searchParams.get('accountId'));
  const requestedDashboardQuery = searchParams.get('query') ?? '';
  const requestedDashboardScope = parseMailClientDashboardScope(searchParams.get('scope'));
  const currentDashboardHref = buildMailClientDashboardHref({ accountId: requestedDashboardAccountId, pathname, query: requestedDashboardQuery, scope: requestedDashboardScope });
  const replaceDashboardRoute = React.useCallback((input: { accountId: string; query: string; scope: MailClientDashboardScope }): void => {
    startTransition(() => {
      router.replace(buildMailClientDashboardHref({ accountId: input.accountId, pathname, query: input.query, scope: input.scope }));
    });
  }, [pathname, router]);
  return {
    currentDashboardHref,
    requestedDashboardAccountId,
    requestedDashboardQuery,
    requestedDashboardScope,
    replaceDashboardRoute,
  };
}

function useMailClientDashboardRouteHydration({
  requestedDashboardAccountId,
  currentDashboardHref,
  isApplyingExternalRouteRef,
  lastObservedRouteHrefRef,
  pendingRouteHrefRef,
  requestedDashboardQuery,
  requestedDashboardScope,
  setDashboardAccountId,
  setDashboardQuery,
  setDashboardScope,
}: {
  requestedDashboardAccountId: string;
  currentDashboardHref: string;
  isApplyingExternalRouteRef: React.MutableRefObject<boolean>;
  lastObservedRouteHrefRef: React.MutableRefObject<string>;
  pendingRouteHrefRef: React.MutableRefObject<string | null>;
  requestedDashboardQuery: string;
  requestedDashboardScope: MailClientDashboardScope;
  setDashboardAccountId: React.Dispatch<React.SetStateAction<string>>;
  setDashboardQuery: React.Dispatch<React.SetStateAction<string>>;
  setDashboardScope: React.Dispatch<React.SetStateAction<MailClientDashboardScope>>;
}): void {
  const applyingExternalRouteRef = isApplyingExternalRouteRef;
  const observedRouteHrefRef = lastObservedRouteHrefRef;
  const routeHrefPendingRef = pendingRouteHrefRef;
  React.useEffect(() => {
    if (currentDashboardHref === observedRouteHrefRef.current) {
      return;
    }
    observedRouteHrefRef.current = currentDashboardHref;
    if (routeHrefPendingRef.current === currentDashboardHref) {
      routeHrefPendingRef.current = null;
      return;
    }
    applyingExternalRouteRef.current = true;
    setDashboardAccountId(requestedDashboardAccountId);
    setDashboardQuery(requestedDashboardQuery);
    setDashboardScope(requestedDashboardScope);
  }, [currentDashboardHref, requestedDashboardAccountId, requestedDashboardQuery, requestedDashboardScope, setDashboardAccountId, setDashboardQuery, setDashboardScope]);
}
function useMailClientDashboardRouteReplacement({
  dashboardAccountId,
  currentDashboardHref,
  dashboardQuery,
  dashboardScope,
  isApplyingExternalRouteRef,
  localDashboardHref,
  pendingRouteHrefRef,
  replaceDashboardRoute,
}: {
  dashboardAccountId: string;
  currentDashboardHref: string;
  dashboardQuery: string;
  dashboardScope: MailClientDashboardScope;
  isApplyingExternalRouteRef: React.MutableRefObject<boolean>;
  localDashboardHref: string;
  pendingRouteHrefRef: React.MutableRefObject<string | null>;
  replaceDashboardRoute: MailClientDashboardRouteState['replaceDashboardRoute'];
}): void {
  const applyingExternalRouteRef = isApplyingExternalRouteRef;
  const routeHrefPendingRef = pendingRouteHrefRef;
  React.useEffect(() => {
    if (applyingExternalRouteRef.current) {
      applyingExternalRouteRef.current = false;
      return;
    }
    if (localDashboardHref === currentDashboardHref) {
      routeHrefPendingRef.current = null;
      return;
    }
    routeHrefPendingRef.current = localDashboardHref;
    replaceDashboardRoute({ accountId: dashboardAccountId, query: dashboardQuery, scope: dashboardScope });
  }, [currentDashboardHref, dashboardAccountId, dashboardQuery, dashboardScope, localDashboardHref, replaceDashboardRoute]);
}
function useMailClientDashboardFilterRouteSync({
  dashboardAccountId,
  currentDashboardHref,
  dashboardQuery,
  dashboardScope,
  replaceDashboardRoute,
  requestedDashboardAccountId,
  requestedDashboardQuery,
  requestedDashboardScope,
  setDashboardAccountId,
  setDashboardQuery,
  setDashboardScope,
}: {
  dashboardAccountId: string;
  currentDashboardHref: string;
  dashboardQuery: string;
  dashboardScope: MailClientDashboardScope;
  replaceDashboardRoute: MailClientDashboardRouteState['replaceDashboardRoute'];
  requestedDashboardAccountId: string;
  requestedDashboardQuery: string;
  requestedDashboardScope: MailClientDashboardScope;
  setDashboardAccountId: React.Dispatch<React.SetStateAction<string>>;
  setDashboardQuery: React.Dispatch<React.SetStateAction<string>>;
  setDashboardScope: React.Dispatch<React.SetStateAction<MailClientDashboardScope>>;
}): void {
  const lastObservedRouteHrefRef = React.useRef(currentDashboardHref);
  const pendingRouteHrefRef = React.useRef<string | null>(null);
  const isApplyingExternalRouteRef = React.useRef(false);
  const localDashboardHref = React.useMemo(
    () => buildMailClientDashboardHref({ accountId: dashboardAccountId, query: dashboardQuery, scope: dashboardScope }),
    [dashboardAccountId, dashboardQuery, dashboardScope]
  );
  useMailClientDashboardRouteHydration({
    requestedDashboardAccountId,
    currentDashboardHref,
    isApplyingExternalRouteRef,
    lastObservedRouteHrefRef,
    pendingRouteHrefRef,
    requestedDashboardQuery,
    requestedDashboardScope,
    setDashboardAccountId,
    setDashboardQuery,
    setDashboardScope,
  });
  useMailClientDashboardRouteReplacement({
    dashboardAccountId,
    currentDashboardHref,
    dashboardQuery,
    dashboardScope,
    isApplyingExternalRouteRef,
    localDashboardHref,
    pendingRouteHrefRef,
    replaceDashboardRoute,
  });
}
function useMailClientDashboardFilterInputs(): Pick<
  MailClientDashboardFilterState,
  'clearDashboardFilters' | 'dashboardAccountId' | 'dashboardQuery' | 'dashboardScope' | 'setDashboardAccountId' | 'setDashboardQuery' | 'setDashboardScope'
> {
  const {
    currentDashboardHref,
    requestedDashboardAccountId,
    requestedDashboardQuery,
    requestedDashboardScope,
    replaceDashboardRoute,
  } = useMailClientDashboardRouteState();
  const [dashboardAccountId, setDashboardAccountId] = React.useState(requestedDashboardAccountId);
  const [dashboardQuery, setDashboardQuery] = React.useState(requestedDashboardQuery);
  const [dashboardScope, setDashboardScope] = React.useState<MailClientDashboardScope>(requestedDashboardScope);
  const clearDashboardFilters = React.useCallback(() => {
    setDashboardAccountId('');
    setDashboardQuery('');
    setDashboardScope('all');
  }, []);
  useMailClientDashboardFilterRouteSync({
    currentDashboardHref,
    dashboardAccountId,
    dashboardQuery,
    dashboardScope,
    replaceDashboardRoute,
    requestedDashboardAccountId,
    requestedDashboardQuery,
    requestedDashboardScope,
    setDashboardAccountId,
    setDashboardQuery,
    setDashboardScope,
  });
  return {
    dashboardAccountId,
    dashboardQuery,
    clearDashboardFilters,
    dashboardScope,
    setDashboardAccountId,
    setDashboardQuery,
    setDashboardScope,
  };
}
function useMailClientDashboardVisibleData({
  dashboardAccountId,
  accounts,
  dashboardQuery,
  dashboardScope,
  foldersByAccount,
  recentThreads,
}: Pick<MailClientDashboardState, 'accounts' | 'foldersByAccount' | 'recentThreads'> &
  Pick<MailClientDashboardFilterState, 'dashboardAccountId' | 'dashboardQuery' | 'dashboardScope'>): Pick<MailClientDashboardFilterState, 'hasActiveDashboardFilter' | 'visibleAttentionAccounts' | 'visibleAccounts' | 'visibleRecentThreads'> {
  const normalizedDashboardQuery = normalizeMailClientFilterValue(dashboardQuery);
  const hasActiveDashboardFilter = dashboardAccountId !== '' || normalizedDashboardQuery !== '' || dashboardScope !== 'all';
  const visibleAccounts = React.useMemo(
    () =>
      accounts.filter((account) => {
        if (dashboardAccountId !== '' && account.id !== dashboardAccountId) return false;
        if (!matchesMailClientAccountScope(account, dashboardScope)) return false;
        return matchesMailClientAccountQuery(account, foldersByAccount.get(account.id) ?? [], dashboardQuery);
      }),
    [accounts, dashboardAccountId, dashboardQuery, dashboardScope, foldersByAccount]
  );
  const visibleAttentionAccounts = React.useMemo(() => accounts.filter((account) => {
    if (dashboardAccountId !== '' && account.id !== dashboardAccountId) return false;
    if (!matchesMailClientAccountScope(account, 'attention')) return false;
    if (!matchesMailClientAccountScope(account, dashboardScope)) return false;
    return matchesMailClientAccountQuery(account, foldersByAccount.get(account.id) ?? [], dashboardQuery);
  }), [accounts, dashboardAccountId, dashboardQuery, dashboardScope, foldersByAccount]);
  const visibleRecentThreads = React.useMemo(() => {
    const accountsById = new Map(accounts.map((account) => [account.id, account] as const));
    return recentThreads.filter((thread) => {
      if (dashboardAccountId !== '' && thread.accountId !== dashboardAccountId) return false;
      const account = accountsById.get(thread.accountId) ?? null;
      if (account !== null && !matchesMailClientAccountScope(account, dashboardScope)) return false;
      return matchesMailClientThreadQuery(thread, account, dashboardQuery);
    });
  }, [accounts, dashboardAccountId, dashboardQuery, dashboardScope, recentThreads]);
  return {
    hasActiveDashboardFilter,
    visibleAttentionAccounts,
    visibleAccounts,
    visibleRecentThreads,
  };
}
export function useMailClientDashboardFilterState({
  accounts,
  foldersByAccount,
  recentThreads,
}: Pick<MailClientDashboardState, 'accounts' | 'foldersByAccount' | 'recentThreads'>): MailClientDashboardFilterState {
  const filterInputs = useMailClientDashboardFilterInputs();
  const visibleData = useMailClientDashboardVisibleData({
    accounts,
    dashboardAccountId: filterInputs.dashboardAccountId,
    dashboardQuery: filterInputs.dashboardQuery,
    dashboardScope: filterInputs.dashboardScope,
    foldersByAccount,
    recentThreads,
  });
  return { ...filterInputs, ...visibleData };
}
