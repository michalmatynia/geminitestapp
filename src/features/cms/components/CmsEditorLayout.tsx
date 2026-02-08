'use client';

import React, { useState } from 'react';

import { AdminLayout } from '@/features/admin/layout/AdminLayout';
import CmsSideMenu from '@/features/cms/components/CmsSideMenu';
import type { Page } from '@/features/cms/types';

export default function CmsEditorLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const [page, setPage] = useState<Page | null>(null);

  return (
    <AdminLayout>
      <div className='flex h-screen bg-gray-900 text-white'>
        <CmsSideMenu page={page} setPage={setPage} />
        <main className='flex-1 p-4 overflow-y-auto'>{children}</main>
      </div>
    </AdminLayout>
  );
}
