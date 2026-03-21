'use client';
import { Suspense, lazy, useMemo } from 'react';
import { CaseResolverViewProvider } from '../components/CaseResolverViewContext';
import { AdminCaseResolverPageProvider, useAdminCaseResolverPageActionsContext as useActions, useAdminCaseResolverPageStateContext as useStateCtx } from '../context/AdminCaseResolverPageContext';

const LazyCaseResolverPageView = lazy(() => import('../components/CaseResolverPageView').then(m => ({ default: m.CaseResolverPageView })));

function AdminCaseResolverPageInner() {
  const state = useStateCtx(), actions = useActions();
  const val = useMemo(() => ({ ...state, ...actions }), [state, actions]);
  return (
    <CaseResolverViewProvider value={val}>
      <Suspense fallback={<div className='min-h-[420px] rounded-xl border border-border/40 bg-card/20 p-6 text-sm text-muted-foreground'>Loading case resolver...</div>}>
        <LazyCaseResolverPageView />
      </Suspense>
    </CaseResolverViewProvider>
  );
}

export function AdminCaseResolverPage() {
  return <AdminCaseResolverPageProvider><AdminCaseResolverPageInner /></AdminCaseResolverPageProvider>;
}
