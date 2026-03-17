'use client';
import React, { useMemo } from 'react';
import { CaseResolverViewProvider } from '../components/CaseResolverViewContext';
import { AdminCaseResolverPageProvider, useAdminCaseResolverPageActionsContext, useAdminCaseResolverPageStateContext } from '../context/AdminCaseResolverPageContext';

const LazyCaseResolverPageView = React.lazy(() =>
  import('../components/CaseResolverPageView').then((mod) => ({
    default: mod.CaseResolverPageView,
  }))
);
function AdminCaseResolverPageInner(): React.JSX.Element {
  const state = useAdminCaseResolverPageStateContext();
  const actions = useAdminCaseResolverPageActionsContext();
  const contextValue = useMemo(() => ({ ...state, ...actions }), [state, actions]);

  return (
    <CaseResolverViewProvider value={contextValue}>
      <React.Suspense
        fallback={
          <div className='min-h-[420px] rounded-xl border border-border/40 bg-card/20 p-6 text-sm text-muted-foreground'>
            Loading case resolver...
          </div>
        }
      >
        <LazyCaseResolverPageView />
      </React.Suspense>
    </CaseResolverViewProvider>
  );
}

export function AdminCaseResolverPage(): React.JSX.Element {
  return (
    <AdminCaseResolverPageProvider>
      <AdminCaseResolverPageInner />
    </AdminCaseResolverPageProvider>
  );
}
