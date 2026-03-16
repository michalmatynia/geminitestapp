'use client';

import { CalendarDays, Database, Mail } from 'lucide-react';
import React from 'react';

import { PanelHeader } from '@/shared/ui';

import { FilemakerEmailsSection } from '../components/page/FilemakerEmailsSection';
import { FilemakerEventsSection } from '../components/page/FilemakerEventsSection';
import { FilemakerOrganizationsSection } from '../components/page/FilemakerOrganizationsSection';
import { FilemakerPersonsSection } from '../components/page/FilemakerPersonsSection';
import { FilemakerSummaryBadges } from '../components/page/FilemakerSummaryBadges';
import {
  AdminFilemakerPageProvider,
  useAdminFilemakerPageStateContext,
} from '../context/AdminFilemakerPageContext';

function AdminFilemakerPageInner(): React.JSX.Element {
  const { router } = useAdminFilemakerPageStateContext();

  return (
    <div className='page-section-compact space-y-6'>
      <PanelHeader
        title='Filemaker'
        description='Manage persons, organizations, events, and emails used in Case Resolver document addressing.'
        icon={<Database className='size-4' />}
        actions={[
          {
            key: 'events',
            label: 'Events Page',
            icon: <CalendarDays className='size-4' />,
            variant: 'outline',
            onClick: () => router.push('/admin/filemaker/events'),
          },
          {
            key: 'emails',
            label: 'Emails Page',
            icon: <Mail className='size-4' />,
            variant: 'outline',
            onClick: () => router.push('/admin/filemaker/emails'),
          },
        ]}
      />

      <FilemakerSummaryBadges />

      <FilemakerPersonsSection />
      <FilemakerEmailsSection />
      <FilemakerOrganizationsSection />
      <FilemakerEventsSection />

      {/* Modals will be added here */}
    </div>
  );
}

export function AdminFilemakerPage(): React.JSX.Element {
  return (
    <AdminFilemakerPageProvider>
      <AdminFilemakerPageInner />
    </AdminFilemakerPageProvider>
  );
}
