import * as React from 'react';

import { cn } from '@/shared/utils';

import { AdminSectionBreadcrumbs } from './admin-section-breadcrumbs';

type AdminSettingsBreadcrumbsProps = {
  current: string;
  className?: string;
};

export function AdminSettingsBreadcrumbs({
  current,
  className,
}: AdminSettingsBreadcrumbsProps): React.JSX.Element {
  return (
    <AdminSectionBreadcrumbs
      section={{ label: 'Settings', href: '/admin/settings' }}
      current={current}
      className={cn('mb-2', className)}
    />
  );
}
