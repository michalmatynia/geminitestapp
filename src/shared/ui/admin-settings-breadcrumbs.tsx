import * as React from 'react';

import { cn } from '@/shared/utils';

import { Breadcrumbs } from './Breadcrumbs';
import { buildAdminSectionBreadcrumbItems } from './admin-section-breadcrumbs';

type AdminSettingsBreadcrumbsProps = {
  current: string;
  className?: string;
};

export function AdminSettingsBreadcrumbs({
  current,
  className,
}: AdminSettingsBreadcrumbsProps): React.JSX.Element {
  const items = buildAdminSectionBreadcrumbItems({
    section: { label: 'Settings', href: '/admin/settings' },
    current,
  });
  const resolvedClassName = cn('mb-2', className);

  return (
    <Breadcrumbs items={items} className={resolvedClassName} />
  );
}
