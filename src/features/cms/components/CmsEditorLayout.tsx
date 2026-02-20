'use client';

import React, { useState } from 'react';

import { AdminLayout } from '@/features/admin/layout/AdminLayout';
import { CmsEditorProvider } from '@/features/cms/components/CmsEditorContext';
import CmsSideMenu from '@/features/cms/components/CmsSideMenu';
import type { Page } from '@/shared/contracts/cms';

export default function CmsEditorLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const [page, setPage] = useState<Page | null>(null);
  const editorContextValue = React.useMemo(
    () => ({
      page,
      setPage,
    }),
    [page]
  );

  return (
    <AdminLayout>
      <CmsEditorProvider value={editorContextValue}>
        <div className='flex h-screen bg-background text-white'>
          <CmsSideMenu />
          <main className='flex-1 p-4 overflow-y-auto'>{children}</main>
        </div>
      </CmsEditorProvider>
    </AdminLayout>
  );
}
