'use client';

import React, { useMemo } from 'react';

import { CaseResolverPageView } from '../components/CaseResolverPageView';
import { CaseResolverViewProvider } from '../components/CaseResolverViewContext';
import {
  AdminCaseResolverPageProvider,
  useAdminCaseResolverPageActionsContext,
  useAdminCaseResolverPageStateContext,
} from '../context/AdminCaseResolverPageContext';

function AdminCaseResolverPageInner(): React.JSX.Element {
  const state = useAdminCaseResolverPageStateContext();
  const actions = useAdminCaseResolverPageActionsContext();
  const contextValue = useMemo(() => ({ ...state, ...actions }), [state, actions]);

  return (
    <CaseResolverViewProvider value={contextValue}>
      <CaseResolverPageView />
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
