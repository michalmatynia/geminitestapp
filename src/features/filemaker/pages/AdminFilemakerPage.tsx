'use client';

import { Building2, CalendarDays, Database, Mail, Megaphone, ShieldAlert, Tags, Users } from 'lucide-react';
import React, { startTransition } from 'react';

import type { PanelAction } from '@/shared/contracts/ui/panels';
import { PanelHeader } from '@/shared/ui/templates.public';

import { FilemakerEmailsSection } from '../components/page/FilemakerEmailsSection';
import { FilemakerEventsSection } from '../components/page/FilemakerEventsSection';
import { FilemakerOrganizationsSection } from '../components/page/FilemakerOrganizationsSection';
import { FilemakerPersonsSection } from '../components/page/FilemakerPersonsSection';
import { FilemakerSummaryBadges } from '../components/page/FilemakerSummaryBadges';
import {
  AdminFilemakerPageProvider,
  useAdminFilemakerPageStateContext,
} from '../context/AdminFilemakerPageContext';

type FilemakerPageRouter = ReturnType<typeof useAdminFilemakerPageStateContext>['router'];

const FILEMAKER_PAGE_ACTIONS = [
  { key: 'persons', label: 'Persons Page', href: '/admin/filemaker/persons', Icon: Users },
  {
    key: 'organizations',
    label: 'Organizations Page',
    href: '/admin/filemaker/organizations',
    Icon: Building2,
  },
  { key: 'mail', label: 'Email Client', href: '/admin/filemaker/mail-client', Icon: Mail },
  { key: 'campaigns', label: 'Campaigns Page', href: '/admin/filemaker/campaigns', Icon: Megaphone },
  {
    key: 'control-centre',
    label: 'Control Centre',
    href: '/admin/filemaker/campaigns/control-centre',
    Icon: ShieldAlert,
  },
  { key: 'events', label: 'Events Page', href: '/admin/filemaker/events', Icon: CalendarDays },
  { key: 'values', label: 'Values Page', href: '/admin/filemaker/values', Icon: Tags },
  { key: 'emails', label: 'Email Records', href: '/admin/filemaker/emails', Icon: Mail },
] as const;

const buildFilemakerPageActions = (router: FilemakerPageRouter): PanelAction[] =>
  FILEMAKER_PAGE_ACTIONS.map((action) => ({
    key: action.key,
    label: action.label,
    icon: <action.Icon className='size-4' />,
    variant: 'outline',
    onClick: () => startTransition(() => { router.push(action.href); }),
  }));

function AdminFilemakerPageInner(): React.JSX.Element {
  const { router } = useAdminFilemakerPageStateContext();

  return (
    <div className='page-section-compact space-y-6'>
      <PanelHeader
        title='Filemaker'
        description='Manage persons, organizations, events, and emails used in Case Resolver document addressing.'
        icon={<Database className='size-4' />}
        actions={buildFilemakerPageActions(router)}
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
