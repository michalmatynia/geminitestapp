'use client';

import React from 'react';

import { KangurAdminContentShell } from '@/features/kangur/admin/components/KangurAdminContentShell';
import { KangurThemeSettingsPanel } from '@/features/kangur/admin/components/KangurThemeSettingsPanel';
import { Breadcrumbs } from '@/features/kangur/shared/ui';
import { AdminFavoriteBreadcrumbRow } from '@/shared/ui/admin-favorite-breadcrumb-row';

export function AdminKangurAppearancePage(): React.JSX.Element {
  const breadcrumbs = [
    { label: 'Admin', href: '/admin' },
    { label: 'Kangur', href: '/admin/kangur' },
    { label: 'Appearance' },
  ];

  return (
    <KangurAdminContentShell
      title='Storefront Appearance'
      description={
        <div className='flex flex-wrap items-center gap-3'>
          <AdminFavoriteBreadcrumbRow>
            <Breadcrumbs items={breadcrumbs} className='mt-0' />
          </AdminFavoriteBreadcrumbRow>
          <span className='hidden h-4 w-px bg-white/12 md:block' />
          <span className='text-xs text-slate-300/80'>
            Customize CSS, colors, and visual branding for Kangur portal instances.
          </span>
        </div>
      }
      breadcrumbs={breadcrumbs}
      headerLayout='stacked'
      className='mx-0 max-w-none px-0 py-0'
      panelVariant='flat'
      panelClassName='rounded-none'
      showBreadcrumbs={false}
    >
      <KangurThemeSettingsPanel />
    </KangurAdminContentShell>
  );
}

export default AdminKangurAppearancePage;
