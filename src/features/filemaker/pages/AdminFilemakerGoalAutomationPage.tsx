'use client';

import React from 'react';

import { AdminFilemakerBreadcrumbs } from '@/shared/ui/admin.public';
import { AdminTitleBreadcrumbHeader } from '@/shared/ui/admin-title-breadcrumb-header';

import { FilemakerGoalAutomationPanel } from '../components/shared/FilemakerGoalAutomationPanel';

export function AdminFilemakerGoalAutomationPage(): React.JSX.Element {
  return (
    <div className='w-full max-w-none space-y-3 pb-4 pt-0'>
      <AdminTitleBreadcrumbHeader
        title={
          <h1 className='text-3xl font-bold tracking-tight text-white'>Goal Automation</h1>
        }
        breadcrumb={
          <AdminFilemakerBreadcrumbs
            parent={{ label: 'FileMaker', href: '/admin/filemaker' }}
            current='Goal Automation'
          />
        }
        titleStackClassName='shrink-0 min-w-max'
        actionsClassName='relative z-0 min-w-0 flex-1 justify-end pt-0'
      />
      <div className='max-w-3xl'>
        <FilemakerGoalAutomationPanel />
      </div>
    </div>
  );
}
