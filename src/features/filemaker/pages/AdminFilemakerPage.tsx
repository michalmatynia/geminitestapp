'use client';

import { CalendarDays, Database, Mail } from 'lucide-react';
import React from 'react';

import {
  PanelHeader,
} from '@/shared/ui';
import { AdminFilemakerPageProvider, useAdminFilemakerPageContext } from '../context/AdminFilemakerPageContext';
import { FilemakerSummaryBadges } from '../components/page/FilemakerSummaryBadges';
import { FilemakerPersonsSection } from '../components/page/FilemakerPersonsSection';
import { FilemakerEmailsSection } from '../components/page/FilemakerEmailsSection';
import { FilemakerOrganizationsSection } from '../components/page/FilemakerOrganizationsSection';
import { FilemakerEventsSection } from '../components/page/FilemakerEventsSection';

function AdminFilemakerPageInner(): React.JSX.Element {
  const { router } = useAdminFilemakerPageContext();

  return (
    <div className='container mx-auto space-y-6 py-8'>
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
