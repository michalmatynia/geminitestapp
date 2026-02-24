'use client';

import React from 'react';
import { AdminCaseResolverPageProvider, useAdminCaseResolverPageContext } from '../context/AdminCaseResolverPageContext';
import { CaseResolverPageView } from '../components/CaseResolverPageView';
import { CaseResolverViewProvider } from '../components/CaseResolverViewContext';

function AdminCaseResolverPageInner(): React.JSX.Element {
  const contextValue = useAdminCaseResolverPageContext();

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
