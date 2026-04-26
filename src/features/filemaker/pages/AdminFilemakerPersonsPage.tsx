'use client';

import { Users } from 'lucide-react';
import React from 'react';

import { PanelHeader } from '@/shared/ui/templates.public';

import { FilemakerPersonsListPanel } from '../components/page/FilemakerPersonsListPanel';
import { useAdminFilemakerPersonsListState } from '../hooks/useAdminFilemakerPersonsListState';

export function AdminFilemakerPersonsPage(): React.JSX.Element {
  const state = useAdminFilemakerPersonsListState();

  return (
    <div className='page-section-compact space-y-6'>
      <PanelHeader
        title='Filemaker Persons'
        description='Search, filter, and open persons imported from FileMaker.'
        icon={<Users className='size-4' />}
        actions={state.actions}
      />
      <FilemakerPersonsListPanel {...state} />
    </div>
  );
}
