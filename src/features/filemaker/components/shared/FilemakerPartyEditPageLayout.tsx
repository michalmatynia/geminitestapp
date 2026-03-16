import React from 'react';

import { AdminFilemakerBreadcrumbs, FormActions } from '@/shared/ui';

type FilemakerPartyEditPageLayoutParent = {
  label: string;
  href?: string;
};

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

      <div className='grid gap-6 lg:grid-cols-3'>
        <div className='space-y-6 lg:col-span-2'>{children}</div>
        <div className='space-y-6'>{/* Sidebar sections will be added here */}</div>
      </div>

      <FormActions onSave={onSave} onCancel={onCancel} isSaving={isSaving} />
    </div>
  );
}
