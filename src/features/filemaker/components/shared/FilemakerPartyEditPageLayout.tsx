import React from 'react';

import type { AdminBreadcrumbNodeDto } from '@/shared/contracts/ui';
import { AdminFilemakerBreadcrumbs } from '@/shared/ui/admin.public';
import { FormActions } from '@/shared/ui/forms-and-actions.public';
import { UI_GRID_ROOMY_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';

type FilemakerPartyEditPageLayoutParent = AdminBreadcrumbNodeDto;

export interface FilemakerPartyEditPageLayoutProps {
  itemName: string | null;
  notFoundMessage: string;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
  parent?: FilemakerPartyEditPageLayoutParent;
  children: React.ReactNode;
}

export function FilemakerPartyEditPageLayout(
  props: FilemakerPartyEditPageLayoutProps
): React.JSX.Element {
  const { itemName, notFoundMessage, onSave, onCancel, isSaving, parent, children } = props;

  if (!itemName) {
    return (
      <div className='page-section-compact text-center text-gray-500'>{notFoundMessage}</div>
    );
  }

  return (
    <div className='page-section-compact space-y-6'>
      <div className='flex flex-wrap items-center justify-between gap-4'>
        <AdminFilemakerBreadcrumbs parent={parent} current={itemName} />
      </div>

      <div className={`${UI_GRID_ROOMY_CLASSNAME} lg:grid-cols-3`}>
        <div className='space-y-6 lg:col-span-2'>{children}</div>
        <div className='space-y-6'>{/* Sidebar sections will be added here */}</div>
      </div>

      <FormActions onSave={onSave} onCancel={onCancel} isSaving={isSaving} />
    </div>
  );
}
