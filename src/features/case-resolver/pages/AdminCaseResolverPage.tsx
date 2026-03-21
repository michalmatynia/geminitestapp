'use client';
import { Suspense, lazy, useMemo } from 'react';
import { LoadingPanel } from '@/shared/ui/LoadingPanel';
import { CaseResolverViewProvider } from '../components/CaseResolverViewContext';
import { AdminCaseResolverPageProvider, useAdminCaseResolverPageActionsContext as useActions, useAdminCaseResolverPageStateContext as useStateCtx } from '../context/AdminCaseResolverPageContext';

const LazyCaseResolverPageView = lazy(() => import('../components/CaseResolverPageView').then(m => ({ default: m.CaseResolverPageView })));

function AdminCaseResolverPageInner() {
  const state = useStateCtx(), actions = useActions();
  const val = useMemo(() => ({ ...state, ...actions }), [state, actions]);
  return (
    <CaseResolverViewProvider value={val}>
      <Suspense fallback={<LoadingPanel>Loading case resolver...</LoadingPanel>}>
        <LazyCaseResolverPageView />
      </Suspense>
    </CaseResolverViewProvider>
  );
}

export function AdminCaseResolverPage() {
  return <AdminCaseResolverPageProvider><AdminCaseResolverPageInner /></AdminCaseResolverPageProvider>;
}
