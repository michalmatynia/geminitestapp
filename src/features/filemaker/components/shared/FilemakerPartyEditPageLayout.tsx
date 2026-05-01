import React from 'react';

import type { AdminBreadcrumbNodeDto } from '@/shared/contracts/ui/base';
import { AdminFilemakerBreadcrumbs } from '@/shared/ui/admin.public';
import { AdminTitleBreadcrumbHeader } from '@/shared/ui/admin-title-breadcrumb-header';
import { FormActions } from '@/shared/ui/forms-and-actions.public';
import { UI_GRID_ROOMY_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';

type FilemakerPartyEditPageLayoutParent = AdminBreadcrumbNodeDto;

export interface FilemakerPartyEditPageLayoutProps {
  itemName: string | null;
  notFoundMessage: string;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
  fullWidth?: boolean;
  pageTitle?: string;
  parent?: FilemakerPartyEditPageLayoutParent;
  children: React.ReactNode;
}

const renderFullWidthPanels = (children: React.ReactNode): React.JSX.Element => (
  <div className='grid w-full min-w-0 grid-cols-1 gap-3'>
    {React.Children.toArray(children).map((child: React.ReactNode, index: number) => (
      <div
        key={`filemaker-party-panel-${index}`}
        className='w-full min-w-0 overflow-hidden'
      >
        {child}
      </div>
    ))}
  </div>
);

export function FilemakerPartyEditPageLayout(
  props: FilemakerPartyEditPageLayoutProps
): React.JSX.Element {
  const {
    itemName,
    notFoundMessage,
    onSave,
    onCancel,
    isSaving,
    fullWidth = false,
    pageTitle,
    parent,
    children,
  } = props;

  if (itemName === null || itemName.trim().length === 0) {
    return (
      <div className='page-section-compact text-center text-gray-500'>{notFoundMessage}</div>
    );
  }

  return (
    <div
      className={
        fullWidth
          ? 'w-full max-w-none space-y-3 pb-4 pt-0'
          : 'container mx-auto space-y-4 pb-8 pt-2'
      }
    >
      <AdminTitleBreadcrumbHeader
        title={
          <h1 className='text-3xl font-bold tracking-tight text-white'>
            {pageTitle ?? itemName}
          </h1>
        }
        breadcrumb={<AdminFilemakerBreadcrumbs parent={parent} current={itemName} />}
        actions={
          <FormActions
            onSave={onSave}
            onCancel={onCancel}
            isSaving={isSaving}
            className='justify-end'
          />
        }
        titleStackClassName='shrink-0 min-w-max'
        actionsClassName='relative z-0 min-w-0 flex-1 justify-end pt-0'
      />

      {fullWidth ? (
        renderFullWidthPanels(children)
      ) : (
        <div className={`${UI_GRID_ROOMY_CLASSNAME} lg:grid-cols-3`}>
          <div className='space-y-6 lg:col-span-2'>{children}</div>
          <div className='space-y-6'>{/* Sidebar sections will be added here */}</div>
        </div>
      )}
    </div>
  );
}
