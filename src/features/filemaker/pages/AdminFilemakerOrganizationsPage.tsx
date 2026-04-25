'use client';

import { Building2 } from 'lucide-react';
import React from 'react';

import { PanelHeader } from '@/shared/ui/templates.public';

import { FilemakerOrganizationsListPanel } from '../components/page/FilemakerOrganizationsListPanel';
import { useAdminFilemakerOrganizationsListState } from '../hooks/useAdminFilemakerOrganizationsListState';

export function AdminFilemakerOrganizationsPage(): React.JSX.Element {
  const state = useAdminFilemakerOrganizationsListState();

  return (
    <div className='page-section-compact space-y-6'>
      <PanelHeader
        title='Filemaker Organisations'
        description='Search, filter, and open organisations imported from FileMaker.'
        icon={<Building2 className='size-4' />}
        actions={state.actions}
        customActions={state.customActions}
      />
      <FilemakerOrganizationsListPanel {...state} />
    </div>
  );
}
