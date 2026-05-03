'use client';

import { CalendarDays } from 'lucide-react';
import React from 'react';

import { PanelHeader } from '@/shared/ui/templates.public';

import { FilemakerEventsListPanel } from '../components/page/FilemakerEventsListPanel';
import { useAdminFilemakerEventsListState } from '../hooks/useAdminFilemakerEventsListState';

export function AdminFilemakerEventsPage(): React.JSX.Element {
  const state = useAdminFilemakerEventsListState();

  return (
    <div className='page-section-compact space-y-6'>
      <PanelHeader
        title='Filemaker Events'
        description='Search, filter, and open events imported from FileMaker.'
        icon={<CalendarDays className='size-4' />}
        actions={state.actions}
      />
      <FilemakerEventsListPanel {...state} />
    </div>
  );
}
