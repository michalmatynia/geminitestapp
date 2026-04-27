'use client';

import { FileText } from 'lucide-react';
import React from 'react';

import { PanelHeader } from '@/shared/ui/templates.public';

import { FilemakerInvoicesListPanel } from '../components/page/FilemakerInvoicesListPanel';
import { useAdminFilemakerInvoicesListState } from '../hooks/useAdminFilemakerInvoicesListState';

export function AdminFilemakerInvoicesPage(): React.JSX.Element {
  const state = useAdminFilemakerInvoicesListState();

  return (
    <div className='page-section-compact space-y-6'>
      <PanelHeader
        title='Filemaker Invoices'
        description='Search imported FileMaker invoices and export PDF invoices using configured labels.'
        icon={<FileText className='size-4' />}
        actions={state.actions}
      />
      <FilemakerInvoicesListPanel {...state} />
    </div>
  );
}
