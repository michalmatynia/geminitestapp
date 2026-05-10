import { Building2, CalendarDays, Database, Globe, LayoutList, Mail, Users } from 'lucide-react';
import React from 'react';

import { SearchInput } from '@/shared/ui/forms-and-actions.public';
import { EmptyState } from '@/shared/ui/navigation-and-layout.public';
import { Badge, Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/primitives.public';
import { PanelHeader, StandardDataTablePanel } from '@/shared/ui/templates.public';

import type { FilemakerListColumns } from './AdminFilemakerListPage.columns';
import type { FilemakerListCounts } from './AdminFilemakerListPage.data';
import type { FilemakerEvent, FilemakerOrganization, FilemakerPerson } from '../types';

import type { ColumnDef } from '@tanstack/react-table';
import type { LucideIcon } from 'lucide-react';

type Navigate = (href: string) => void;

type HeaderAction = {
  href: string;
  icon: LucideIcon;
  key: string;
  label: string;
  variant?: 'outline';
};

type EntityTabPanelProps<TData> = {
  badges: React.ReactNode;
  columns: ColumnDef<TData>[];
  data: TData[];
  emptyDescription: string;
  emptyTitle: string;
  isLoading: boolean;
  searchPlaceholder: string;
  tab: string;
  query: string;
  onQueryChange: (value: string) => void;
};

type FilemakerListTabsProps = {
  columns: FilemakerListColumns;
  counts: FilemakerListCounts;
  events: FilemakerEvent[];
  isLoading: boolean;
  organizations: FilemakerOrganization[];
  persons: FilemakerPerson[];
  query: string;
  onQueryChange: (value: string) => void;
};

const HEADER_ACTIONS: HeaderAction[] = [
  { key: 'persons', label: 'Persons Page', href: '/admin/filemaker/persons', icon: Users, variant: 'outline' },
  {
    key: 'organizations',
    label: 'Organizations Page',
    href: '/admin/filemaker/organizations',
    icon: Building2,
    variant: 'outline',
  },
  { key: 'emails', label: 'Email Records', href: '/admin/filemaker/emails', icon: Mail, variant: 'outline' },
  { key: 'websites', label: 'Websites', href: '/admin/filemaker/websites', icon: Globe, variant: 'outline' },
  { key: 'events', label: 'Events Page', href: '/admin/filemaker/events', icon: CalendarDays, variant: 'outline' },
  { key: 'manage', label: 'Manage Database', href: '/admin/filemaker', icon: Database },
];

export function FilemakerListHeader({ onNavigate }: { onNavigate: Navigate }): React.JSX.Element {
  return (
    <PanelHeader
      title='Filemaker List'
      description='Search persons, organizations, and events available for Case Resolver document addressing.'
      icon={<LayoutList className='size-4' />}
      actions={HEADER_ACTIONS.map((action: HeaderAction) => {
        const Icon = action.icon;
        return {
          key: action.key,
          label: action.label,
          icon: <Icon className='size-4' />,
          variant: action.variant,
          onClick: () => onNavigate(action.href),
        };
      })}
    />
  );
}

function EntityBadges(props: { counts: FilemakerListCounts; includeEventLinks?: boolean }): React.JSX.Element {
  const { counts, includeEventLinks = false } = props;
  return (
    <>
      <Badge variant='outline' className='text-[10px]'>Persons: {counts.persons}</Badge>
      <Badge variant='outline' className='text-[10px]'>Organizations: {counts.organizations}</Badge>
      <Badge variant='outline' className='text-[10px]'>Events: {counts.events}</Badge>
      <Badge variant='outline' className='text-[10px]'>Emails: {counts.emails}</Badge>
      {includeEventLinks ? (
        <Badge variant='outline' className='text-[10px]'>Event Links: {counts.eventLinks}</Badge>
      ) : null}
      <Badge variant='outline' className='text-[10px]'>Addresses: {counts.addresses}</Badge>
    </>
  );
}

function FilemakerTabsList(): React.JSX.Element {
  return (
    <TabsList className='mb-4' aria-label='FileMaker entity tabs'>
      <TabsTrigger value='persons' className='gap-2'>
        <Users className='size-3.5' />
        Persons
      </TabsTrigger>
      <TabsTrigger value='organizations' className='gap-2'>
        <Building2 className='size-3.5' />
        Organizations
      </TabsTrigger>
      <TabsTrigger value='events' className='gap-2'>
        <CalendarDays className='size-3.5' />
        Events
      </TabsTrigger>
    </TabsList>
  );
}

function FilemakerEntityTabPanel<TData>(props: EntityTabPanelProps<TData>): React.JSX.Element {
  return (
    <TabsContent value={props.tab} className='m-0'>
      <StandardDataTablePanel
        filters={
          <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
            <div className='flex items-center gap-2'>{props.badges}</div>
            <div className='w-full max-w-sm'>
              <SearchInput
                value={props.query}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                  props.onQueryChange(event.target.value);
                }}
                onClear={() => props.onQueryChange('')}
                placeholder={props.searchPlaceholder}
                size='sm'
              />
            </div>
          </div>
        }
        columns={props.columns}
        data={props.data}
        isLoading={props.isLoading}
        variant='flat'
        emptyState={<EmptyState title={props.emptyTitle} description={props.emptyDescription} />}
      />
    </TabsContent>
  );
}

function PersonsTabPanel(props: FilemakerListTabsProps): React.JSX.Element {
  const hasQuery = props.query.length > 0;
  return (
    <FilemakerEntityTabPanel
      tab='persons'
      columns={props.columns.persons}
      data={props.persons}
      searchPlaceholder='Search name, address, NIP, REGON, phone...'
      emptyTitle={hasQuery ? 'No persons found' : 'No persons yet'}
      emptyDescription={hasQuery ? 'Try adjusting your search terms.' : 'Add your first person to the database.'}
      badges={<EntityBadges counts={props.counts} />}
      isLoading={props.isLoading}
      query={props.query}
      onQueryChange={props.onQueryChange}
    />
  );
}

function OrganizationsTabPanel(props: FilemakerListTabsProps): React.JSX.Element {
  const hasQuery = props.query.length > 0;
  return (
    <FilemakerEntityTabPanel
      tab='organizations'
      columns={props.columns.organizations}
      data={props.organizations}
      searchPlaceholder='Search name, address, NIP, REGON, phone...'
      emptyTitle={hasQuery ? 'No organizations found' : 'No organizations yet'}
      emptyDescription={hasQuery ? 'Try adjusting your search terms.' : 'Add your first organization to the database.'}
      badges={<EntityBadges counts={props.counts} />}
      isLoading={props.isLoading}
      query={props.query}
      onQueryChange={props.onQueryChange}
    />
  );
}

function EventsTabPanel(props: FilemakerListTabsProps): React.JSX.Element {
  const hasQuery = props.query.length > 0;
  return (
    <FilemakerEntityTabPanel
      tab='events'
      columns={props.columns.events}
      data={props.events}
      searchPlaceholder='Search event name and address...'
      emptyTitle={hasQuery ? 'No events found' : 'No events yet'}
      emptyDescription={hasQuery ? 'Try adjusting your search terms.' : 'Add your first event to the database.'}
      badges={<EntityBadges counts={props.counts} includeEventLinks />}
      isLoading={props.isLoading}
      query={props.query}
      onQueryChange={props.onQueryChange}
    />
  );
}

export function FilemakerListTabs(props: FilemakerListTabsProps): React.JSX.Element {
  return (
    <Tabs defaultValue='persons' className='w-full'>
      <FilemakerTabsList />
      <PersonsTabPanel {...props} />
      <OrganizationsTabPanel {...props} />
      <EventsTabPanel {...props} />
    </Tabs>
  );
}
