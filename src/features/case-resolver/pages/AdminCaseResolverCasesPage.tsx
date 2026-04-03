'use client';

import React from 'react';

import { AdminCaseResolverPageLayout } from '@/shared/ui';

import { CaseListPanel } from '../components/CaseListPanel';
import { AdminCaseResolverCasesProvider } from '../context/AdminCaseResolverCasesContext';

export function AdminCaseResolverCasesPage(): React.JSX.Element {
  return (
    <AdminCaseResolverPageLayout
      title='Case Resolver Cases'
      current='Cases'
      containerClassName='page-section-compact'
    >
      <AdminCaseResolverCasesProvider>
        <CaseListPanel />
      </AdminCaseResolverCasesProvider>
    </AdminCaseResolverPageLayout>
  );
}
