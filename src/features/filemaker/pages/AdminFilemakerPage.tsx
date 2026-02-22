'use client';

import { CalendarDays, Edit2, Plus, Trash2, Database, Mail } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useCountries } from '@/features/internationalization/hooks/useInternationalizationQueries';
import type { CountryOption } from '@/shared/contracts/internationalization';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import {
  Badge,
  Button,
  FormSection,
  PanelHeader,
  useToast,
  Card,
  EmptyState,
} from '@/shared/ui';
import { ConfirmModal } from '@/shared/ui/templates/modals';
import { SettingsPanelBuilder, type SettingsField } from '@/shared/ui/templates/SettingsPanelBuilder';

import {
  createFilemakerEmail,
  createFilemakerEvent,
  createFilemakerOrganization,
  createFilemakerPerson,
  FILEMAKER_DATABASE_KEY,
  formatFilemakerAddress,
  normalizeFilemakerDatabase,
  parseFilemakerDatabase,
  removeFilemakerEmail,
  removeFilemakerEvent,
  removeFilemakerOrganizationEventLinks,
  removeFilemakerPartyEmailLinks,
  removeFilemakerPartyPhoneNumberLinks,
} from '../settings';

import type {
  FilemakerDatabase,
  FilemakerEmail,
  FilemakerEmailStatus,
  FilemakerEvent,
  FilemakerOrganization,
  FilemakerPerson,
} from '../types';

type PersonDraft = Partial<Omit<FilemakerPerson, 'phoneNumbers'>> & {
  phoneNumbers?: string;
};

type EmailDraft = {
  email?: string;
  status?: FilemakerEmailStatus;
};

type EventDraft = Partial<FilemakerEvent>;

const createId = (prefix: string): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
};

const formatTimestamp = (value: string | null | undefined): string => {
  if (!value) return 'Unknown';
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return 'Unknown';
  return new Date(parsed).toLocaleString();
};

const hasAddressFields = (
  street: string,
  streetNumber: string,
  city: string,
  postalCode: string,
  countryId: string
): boolean => Boolean(street && streetNumber && city && postalCode && countryId);

const EMAIL_STATUS_OPTIONS: Array<{
  value: FilemakerEmailStatus;
  label: string;
  description: string;
}> = [
  { value: 'active', label: 'Active', description: 'Deliverable and in use.' },
  { value: 'inactive', label: 'Inactive', description: 'Known email, not currently used.' },
  { value: 'bounced', label: 'Bounced', description: 'Delivery is failing.' },
  { value: 'unverified', label: 'Unverified', description: 'Not yet verified.' },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AdminFilemakerPage(): React.JSX.Element {
  const router = useRouter();
  const settingsStore = useSettingsStore();
  const updateSetting = useUpdateSetting();
  const { toast } = useToast();

  const rawDatabase = settingsStore.get(FILEMAKER_DATABASE_KEY);
  const parsedDatabase = useMemo(
    (): FilemakerDatabase => parseFilemakerDatabase(rawDatabase),
    [rawDatabase]
  );
  const [database, setDatabase] = useState<FilemakerDatabase>(parsedDatabase);
  const countriesQuery = useCountries();
  const countries = countriesQuery.data ?? [];
  const countryById = useMemo(
    () => new Map(countries.map((country: CountryOption) => [country.id, country])),
    [countries]
  );
  const countryOptions = useMemo(
    () =>
      countries.map((country: CountryOption) => ({
        value: country.id,
        label: country.name,
        description: country.code,
      })),
    [countries]
  );

  const [personDraft, setPersonDraft] = useState<PersonDraft>({});
  const [orgDraft, setOrgDraft] = useState<Partial<FilemakerOrganization>>({});
  const [eventDraft, setEventDraft] = useState<EventDraft>({});
  const [emailDraft, setEmailDraft] = useState<EmailDraft>({
    status: 'unverified',
  });
  
  const [isPersonModalOpen, setIsPersonModalOpen] = useState(false);
  const [isOrgModalOpen, setIsOrgModalOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<FilemakerPerson | null>(null);
  const [editingOrg, setEditingOrg] = useState<FilemakerOrganization | null>(null);
  const [editingEvent, setEditingEvent] = useState<FilemakerEvent | null>(null);
  const [editingEmail, setEditingEmail] = useState<FilemakerEmail | null>(null);

  const [confirmation, setConfirmation] = useState<{
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
    confirmText?: string;
    isDangerous?: boolean;
      } | null>(null);

  useEffect(() => {
    setDatabase(parsedDatabase);
  }, [parsedDatabase]);

  const persons = useMemo(
    () =>
      [...database.persons].sort((left: FilemakerPerson, right: FilemakerPerson) =>
        `${left.lastName} ${left.firstName}`.localeCompare(`${right.lastName} ${right.firstName}`)
      ),
    [database.persons]
  );
  const organizations = useMemo(
    () =>
      [...database.organizations].sort((left: FilemakerOrganization, right: FilemakerOrganization) =>
        left.name.localeCompare(right.name)
      ),
    [database.organizations]
  );
  const events = useMemo(
    () =>
      [...database.events].sort((left: FilemakerEvent, right: FilemakerEvent) =>
        left.eventName.localeCompare(right.eventName)
      ),
    [database.events]
  );
  const emails = useMemo(
    () =>
      [...database.emails].sort((left: FilemakerEmail, right: FilemakerEmail) =>
        left.email.localeCompare(right.email)
      ),
    [database.emails]
  );
  const emailLinkCountByEmailId = useMemo(() => {
    const counts = new Map<string, number>();
    database.emailLinks.forEach((link) => {
      counts.set(link.emailId, (counts.get(link.emailId) ?? 0) + 1);
    });
    return counts;
  }, [database.emailLinks]);
  const eventLinkCountByEventId = useMemo(() => {
    const counts = new Map<string, number>();
    database.eventOrganizationLinks.forEach((link) => {
      counts.set(link.eventId, (counts.get(link.eventId) ?? 0) + 1);
    });
    return counts;
  }, [database.eventOrganizationLinks]);
  const resolveCountryId = useCallback(
    (countryId: string, countryName: string): string => {
      const normalizedId = countryId.trim();
      if (normalizedId && countryById.has(normalizedId)) return normalizedId;
      const normalizedName = countryName.trim().toLowerCase();
      if (!normalizedName) return '';
      const byName = countries.find(
        (country: CountryOption) =>
          country.name.trim().toLowerCase() === normalizedName ||
          country.code.trim().toLowerCase() === normalizedName
      );
      return byName?.id ?? '';
    },
    [countries, countryById]
  );

  const persistDatabase = useCallback(
    async (nextDatabase: FilemakerDatabase, successMessage: string): Promise<void> => {
      const normalized = normalizeFilemakerDatabase(nextDatabase);
      try {
        await updateSetting.mutateAsync({
          key: FILEMAKER_DATABASE_KEY,
          value: JSON.stringify(normalized),
        });
        setDatabase(normalized);
        toast(successMessage, { variant: 'success' });
      } catch (error: unknown) {
        toast(
          error instanceof Error ? error.message : 'Failed to save Filemaker database.',
          { variant: 'error' }
        );
      }
    },
    [toast, updateSetting]
  );

  const handleSavePerson = useCallback(async (): Promise<void> => {
    const firstName = personDraft.firstName?.trim();
    const lastName = personDraft.lastName?.trim();
    const street = personDraft.street?.trim() || '';
    const streetNumber = personDraft.streetNumber?.trim() || '';
    const city = personDraft.city?.trim() || '';
    const postalCode = personDraft.postalCode?.trim() || '';
    const countryId = personDraft.countryId?.trim() || '';
    const country = countryById.get(countryId)?.name ?? '';
    const { updatedAt: draftUpdatedAt, ...personDraftWithoutUpdatedAt } = personDraft;
    const normalizedPersonDraft = {
      ...personDraftWithoutUpdatedAt,
      ...(draftUpdatedAt ? { updatedAt: draftUpdatedAt } : {}),
    };

    if (!firstName || !lastName || !hasAddressFields(street, streetNumber, city, postalCode, countryId)) {
      toast('Person requires first name, last name, street, street number, city, postal code, and country.', {
        variant: 'error',
      });
      return;
    }

    const nextPersons = editingPerson
      ? database.persons.map(p => p.id === editingPerson.id 
        ? createFilemakerPerson({
          ...p,
          ...normalizedPersonDraft,
          firstName,
          lastName,
          country,
          updatedAt: new Date().toISOString()
        }) 
        : p)
      : [...database.persons, createFilemakerPerson({
        id: createId('person'),
        ...normalizedPersonDraft,
        firstName,
        lastName,
        country,
      })];

    await persistDatabase({ ...database, persons: nextPersons }, editingPerson ? 'Person updated.' : 'Person added.');
    setIsPersonModalOpen(false);
    setEditingPerson(null);
    setPersonDraft({});
  }, [countryById, database, personDraft, editingPerson, persistDatabase, toast]);

  const handleDeletePerson = useCallback(
    async (personId: string): Promise<void> => {
      const target = database.persons.find((entry: FilemakerPerson) => entry.id === personId);
      if (!target) return;

      setConfirmation({
        title: 'Delete Person?',
        message: `Are you sure you want to delete person "${target.firstName} ${target.lastName}"?`,
        confirmText: 'Delete Record',
        isDangerous: true,
        onConfirm: async () => {
          const withoutEmailLinks = removeFilemakerPartyEmailLinks(
            {
              ...database,
              persons: database.persons.filter(
                (entry: FilemakerPerson) => entry.id !== personId
              ),
            },
            'person',
            personId
          );
          const nextDatabase = removeFilemakerPartyPhoneNumberLinks(
            withoutEmailLinks,
            'person',
            personId
          );
          await persistDatabase(
            nextDatabase,
            'Person deleted.'
          );
        }
      });
    },
    [database, persistDatabase]
  );

  const handleStartEditPerson = useCallback((person: FilemakerPerson): void => {
    setEditingPerson(person);
    setPersonDraft({
      ...person,
      countryId: resolveCountryId(person.countryId, person.country),
      phoneNumbers: person.phoneNumbers.join(', ')
    });
    setIsPersonModalOpen(true);
  }, [resolveCountryId]);

  const openCreatePerson = useCallback(() => {
    setEditingPerson(null);
    setPersonDraft({});
    setIsPersonModalOpen(true);
  }, []);

  const handleSaveOrganization = useCallback(async (): Promise<void> => {
    const name = orgDraft.name?.trim();
    const street = orgDraft.street?.trim() || '';
    const streetNumber = orgDraft.streetNumber?.trim() || '';
    const city = orgDraft.city?.trim() || '';
    const postalCode = orgDraft.postalCode?.trim() || '';
    const countryId = orgDraft.countryId?.trim() || '';
    const country = countryById.get(countryId)?.name ?? '';
    const { updatedAt: orgDraftUpdatedAt, ...orgDraftWithoutUpdatedAt } = orgDraft;
    const normalizedOrgDraft = {
      ...orgDraftWithoutUpdatedAt,
      ...(orgDraftUpdatedAt ? { updatedAt: orgDraftUpdatedAt } : {}),
    };

    if (!name || !hasAddressFields(street, streetNumber, city, postalCode, countryId)) {
      toast('Organization requires name, street, street number, city, postal code, and country.', {
        variant: 'error',
      });
      return;
    }

    const nextOrgs = editingOrg
      ? database.organizations.map(o => o.id === editingOrg.id
        ? createFilemakerOrganization({
          ...o,
          ...normalizedOrgDraft,
          name,
          country,
          updatedAt: new Date().toISOString()
        })
        : o)
      : [...database.organizations, createFilemakerOrganization({
        id: createId('organization'),
        ...normalizedOrgDraft,
        name,
        country,
      })];

    await persistDatabase({ ...database, organizations: nextOrgs }, editingOrg ? 'Organization updated.' : 'Organization added.');
    setIsOrgModalOpen(false);
    setEditingOrg(null);
    setOrgDraft({});
  }, [countryById, database, orgDraft, editingOrg, persistDatabase, toast]);

  const handleDeleteOrganization = useCallback(
    async (organizationId: string): Promise<void> => {
      const target = database.organizations.find(
        (entry: FilemakerOrganization) => entry.id === organizationId
      );
      if (!target) return;

      setConfirmation({
        title: 'Delete Organization?',
        message: `Are you sure you want to delete organization "${target.name}"?`,
        confirmText: 'Delete Record',
        isDangerous: true,
        onConfirm: async () => {
          const withoutEmailLinks = removeFilemakerPartyEmailLinks(
            {
              ...database,
              organizations: database.organizations.filter(
                (entry: FilemakerOrganization) => entry.id !== organizationId
              ),
            },
            'organization',
            organizationId
          );
          const withoutOrganization = removeFilemakerPartyPhoneNumberLinks(
            withoutEmailLinks,
            'organization',
            organizationId
          );
          const nextDatabase = removeFilemakerOrganizationEventLinks(
            withoutOrganization,
            organizationId
          );
          await persistDatabase(
            nextDatabase,
            'Organization deleted.'
          );
        }
      });
    },
    [database, persistDatabase]
  );

  const handleStartEditOrganization = useCallback((organization: FilemakerOrganization): void => {
    setEditingOrg(organization);
    setOrgDraft({
      ...organization,
      countryId: resolveCountryId(organization.countryId, organization.country)
    });
    setIsOrgModalOpen(true);
  }, [resolveCountryId]);

  const openCreateOrg = useCallback(() => {
    setEditingOrg(null);
    setOrgDraft({});
    setIsOrgModalOpen(true);
  }, []);

  const handleSaveEvent = useCallback(async (): Promise<void> => {
    const eventName = eventDraft.eventName?.trim();
    const street = eventDraft.street?.trim() || '';
    const streetNumber = eventDraft.streetNumber?.trim() || '';
    const city = eventDraft.city?.trim() || '';
    const postalCode = eventDraft.postalCode?.trim() || '';
    const countryId = eventDraft.countryId?.trim() || '';
    const country = countryById.get(countryId)?.name ?? '';
    const { updatedAt: eventDraftUpdatedAt, ...eventDraftWithoutUpdatedAt } = eventDraft;
    const normalizedEventDraft = {
      ...eventDraftWithoutUpdatedAt,
      ...(eventDraftUpdatedAt ? { updatedAt: eventDraftUpdatedAt } : {}),
    };

    if (!eventName || !hasAddressFields(street, streetNumber, city, postalCode, countryId)) {
      toast('Event requires event name, street, street number, city, postal code, and country.', {
        variant: 'error',
      });
      return;
    }

    const nextEvents = editingEvent
      ? database.events.map((event) => (event.id === editingEvent.id
        ? createFilemakerEvent({
          ...event,
          ...normalizedEventDraft,
          eventName,
          country,
          updatedAt: new Date().toISOString(),
        })
        : event))
      : [...database.events, createFilemakerEvent({
        id: createId('event'),
        ...normalizedEventDraft,
        eventName,
        country,
      })];

    await persistDatabase(
      { ...database, events: nextEvents },
      editingEvent ? 'Event updated.' : 'Event added.'
    );
    setIsEventModalOpen(false);
    setEditingEvent(null);
    setEventDraft({});
  }, [countryById, database, editingEvent, eventDraft, persistDatabase, toast]);

  const handleDeleteEvent = useCallback(
    async (eventId: string): Promise<void> => {
      const target = database.events.find((entry: FilemakerEvent) => entry.id === eventId);
      if (!target) return;

      setConfirmation({
        title: 'Delete Event?',
        message: `Are you sure you want to delete event "${target.eventName}"?`,
        confirmText: 'Delete Record',
        isDangerous: true,
        onConfirm: async () => {
          await persistDatabase(
            removeFilemakerEvent(database, eventId),
            'Event deleted.'
          );
        }
      });
    },
    [database, persistDatabase]
  );

  const handleStartEditEvent = useCallback((event: FilemakerEvent): void => {
    setEditingEvent(event);
    setEventDraft({
      ...event,
      countryId: resolveCountryId(event.countryId, event.country),
    });
    setIsEventModalOpen(true);
  }, [resolveCountryId]);

  const openCreateEvent = useCallback(() => {
    setEditingEvent(null);
    setEventDraft({});
    setIsEventModalOpen(true);
  }, []);

  const handleSaveEmail = useCallback(async (): Promise<void> => {
    const normalizedEmail = (emailDraft.email ?? '').trim().toLowerCase();
    const status = emailDraft.status ?? 'unverified';

    if (!normalizedEmail || !EMAIL_RE.test(normalizedEmail)) {
      toast('Provide a valid email address.', { variant: 'error' });
      return;
    }

    const duplicate = database.emails.some(
      (entry: FilemakerEmail): boolean =>
        entry.id !== editingEmail?.id &&
        entry.email.trim().toLowerCase() === normalizedEmail
    );
    if (duplicate) {
      toast('This email already exists in the database.', { variant: 'error' });
      return;
    }

    let nextEmails: FilemakerEmail[];
    if (editingEmail) {
      nextEmails = database.emails.map((entry: FilemakerEmail) => {
        if (entry.id !== editingEmail.id) return entry;
        return createFilemakerEmail({
          id: entry.id,
          email: normalizedEmail,
          status,
          createdAt: entry.createdAt,
          updatedAt: new Date().toISOString(),
        });
      });
    } else {
      nextEmails = [
        ...database.emails,
        createFilemakerEmail({
          id: createId('email'),
          email: normalizedEmail,
          status,
        }),
      ];
    }

    await persistDatabase(
      { ...database, emails: nextEmails },
      editingEmail ? 'Email updated.' : 'Email added.'
    );

    setIsEmailModalOpen(false);
    setEditingEmail(null);
    setEmailDraft({ status: 'unverified' });
  }, [database, editingEmail, emailDraft.email, emailDraft.status, persistDatabase, toast]);

  const handleDeleteEmail = useCallback(
    async (emailId: string): Promise<void> => {
      const target = database.emails.find((entry: FilemakerEmail) => entry.id === emailId);
      if (!target) return;

      setConfirmation({
        title: 'Delete Email?',
        message: `Are you sure you want to delete email "${target.email}"?`,
        confirmText: 'Delete Record',
        isDangerous: true,
        onConfirm: async () => {
          await persistDatabase(
            removeFilemakerEmail(database, emailId),
            'Email deleted.'
          );
        },
      });
    },
    [database, persistDatabase]
  );

  const handleStartEditEmail = useCallback((email: FilemakerEmail): void => {
    setEditingEmail(email);
    setEmailDraft({
      email: email.email,
      status: email.status,
    });
    setIsEmailModalOpen(true);
  }, []);

  const openCreateEmail = useCallback(() => {
    setEditingEmail(null);
    setEmailDraft({ status: 'unverified' });
    setIsEmailModalOpen(true);
  }, []);

  const personFields: SettingsField<PersonDraft>[] = useMemo(() => [
    { key: 'firstName', label: 'First Name', type: 'text', placeholder: 'First name', required: true },
    { key: 'lastName', label: 'Last Name', type: 'text', placeholder: 'Last name', required: true },
    { key: 'street', label: 'Street', type: 'text', placeholder: 'Street', required: true },
    { key: 'streetNumber', label: 'Street Number', type: 'text', placeholder: 'Street number', required: true },
    { key: 'city', label: 'City', type: 'text', placeholder: 'City', required: true },
    { key: 'postalCode', label: 'Postal Code', type: 'text', placeholder: 'Postal code', required: true },
    {
      key: 'countryId',
      label: 'Country',
      type: 'select',
      options: countryOptions,
      placeholder: countriesQuery.isLoading ? 'Loading countries...' : 'Select country',
      disabled: countriesQuery.isLoading,
      required: true,
    },
    { key: 'nip', label: 'NIP', type: 'text', placeholder: 'NIP code' },
    { key: 'regon', label: 'REGON', type: 'text', placeholder: 'REGON code' },
    { key: 'phoneNumbers', label: 'Telephone Numbers', type: 'text', placeholder: 'Comma-separated numbers' },
  ], [countryOptions, countriesQuery.isLoading]);

  const orgFields: SettingsField<Partial<FilemakerOrganization>>[] = useMemo(() => [
    { key: 'name', label: 'Organization Name', type: 'text', placeholder: 'Organization name', required: true },
    { key: 'street', label: 'Street', type: 'text', placeholder: 'Street', required: true },
    { key: 'streetNumber', label: 'Street Number', type: 'text', placeholder: 'Street number', required: true },
    { key: 'city', label: 'City', type: 'text', placeholder: 'City', required: true },
    { key: 'postalCode', label: 'Postal Code', type: 'text', placeholder: 'Postal code', required: true },
    {
      key: 'countryId',
      label: 'Country',
      type: 'select',
      options: countryOptions,
      placeholder: countriesQuery.isLoading ? 'Loading countries...' : 'Select country',
      disabled: countriesQuery.isLoading,
      required: true,
    },
  ], [countryOptions, countriesQuery.isLoading]);

  const eventFields: SettingsField<EventDraft>[] = useMemo(() => [
    { key: 'eventName', label: 'Event Name', type: 'text', placeholder: 'Event name', required: true },
    { key: 'street', label: 'Street', type: 'text', placeholder: 'Street', required: true },
    { key: 'streetNumber', label: 'Street Number', type: 'text', placeholder: 'Street number', required: true },
    { key: 'city', label: 'City', type: 'text', placeholder: 'City', required: true },
    { key: 'postalCode', label: 'Postal Code', type: 'text', placeholder: 'Postal code', required: true },
    {
      key: 'countryId',
      label: 'Country',
      type: 'select',
      options: countryOptions,
      placeholder: countriesQuery.isLoading ? 'Loading countries...' : 'Select country',
      disabled: countriesQuery.isLoading,
      required: true,
    },
  ], [countryOptions, countriesQuery.isLoading]);

  const emailFields: SettingsField<EmailDraft>[] = useMemo(
    () => [
      {
        key: 'email',
        label: 'Email',
        type: 'text',
        placeholder: 'name@example.com',
        required: true,
      },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: EMAIL_STATUS_OPTIONS,
        placeholder: 'Select status',
        required: true,
      },
    ],
    []
  );

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

      <div className='flex flex-wrap gap-2'>
        <Badge variant='outline' className='text-[10px]'>Persons: {persons.length}</Badge>
        <Badge variant='outline' className='text-[10px]'>Organizations: {organizations.length}</Badge>
        <Badge variant='outline' className='text-[10px]'>Events: {events.length}</Badge>
        <Badge variant='outline' className='text-[10px]'>Phone Numbers: {database.phoneNumbers.length}</Badge>
        <Badge variant='outline' className='text-[10px]'>Phone Links: {database.phoneNumberLinks.length}</Badge>
        <Badge variant='outline' className='text-[10px]'>Emails: {emails.length}</Badge>
        <Badge variant='outline' className='text-[10px]'>Email Links: {database.emailLinks.length}</Badge>
        <Badge variant='outline' className='text-[10px]'>
          Event-Organization Links: {database.eventOrganizationLinks.length}
        </Badge>
        <Badge variant='outline' className='text-[10px]'>Addresses: {database.addresses.length}</Badge>
      </div>

      <FormSection
        title='Persons'
        className='space-y-4 p-4'
        actions={(
          <Button
            type='button'
            onClick={openCreatePerson}
            disabled={updateSetting.isPending}
            className='h-8'
          >
            <Plus className='mr-1.5 size-3.5' />
            Add Person
          </Button>
        )}
      >
        <div className='space-y-2'>
          {persons.length === 0 ? (
            <EmptyState
              title='No persons'
              description='No persons added yet.'
              variant='compact'
              className='bg-card/20 border-dashed border-border/60 py-8'
            />
          ) : (
            persons.map((person: FilemakerPerson) => (
              <Card key={person.id} variant='subtle-compact' padding='md' className='border-border/60 bg-card/35'>
                <div className='flex flex-wrap items-start justify-between gap-3'>
                  <div className='min-w-0 flex-1 space-y-1'>
                    <div className='text-sm font-semibold text-white'>
                      {person.firstName} {person.lastName}
                    </div>
                    <div className='text-xs text-gray-300'>{formatFilemakerAddress(person)}</div>
                    <div className='text-[11px] text-gray-500'>
                      NIP: {person.nip || 'n/a'} | REGON: {person.regon || 'n/a'}
                    </div>
                    <div className='text-[11px] text-gray-500'>
                      Phones: {person.phoneNumbers.length > 0 ? person.phoneNumbers.join(', ') : 'n/a'}
                    </div>
                    <div className='text-[10px] text-gray-600'>
                      Updated: {formatTimestamp(person.updatedAt ?? undefined)}
                    </div>
                  </div>
                  <div className='flex items-center gap-2'>
                    <Button
                      type='button'
                      variant='outline'
                      className='h-8 w-8 p-0'
                      onClick={(): void => {
                        handleStartEditPerson(person);
                      }}
                    >
                      <Edit2 className='size-3.5' />
                    </Button>
                    <Button
                      type='button'
                      variant='outline'
                      className='h-8 w-8 p-0 text-red-200 hover:text-red-100'
                      onClick={(): void => {
                        void handleDeletePerson(person.id);
                      }}
                    >
                      <Trash2 className='size-3.5' />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </FormSection>

      <FormSection
        title='Emails'
        className='space-y-4 p-4'
        actions={(
          <Button
            type='button'
            onClick={openCreateEmail}
            disabled={updateSetting.isPending}
            className='h-8'
          >
            <Plus className='mr-1.5 size-3.5' />
            Add Email
          </Button>
        )}
      >
        <div className='space-y-2'>
          {emails.length === 0 ? (
            <EmptyState
              title='No emails'
              description='No emails added yet.'
              variant='compact'
              className='bg-card/20 border-dashed border-border/60 py-8'
            />
          ) : (
            emails.map((email: FilemakerEmail) => (
              <Card key={email.id} variant='subtle-compact' padding='md' className='border-border/60 bg-card/35'>
                <div className='flex flex-wrap items-start justify-between gap-3'>
                  <div className='min-w-0 flex-1 space-y-1'>
                    <div className='flex items-center gap-2 text-sm font-semibold text-white'>
                      <Mail className='size-3.5 text-blue-200' />
                      {email.email}
                    </div>
                    <div className='text-[11px] text-gray-500'>
                      Status: {email.status}
                    </div>
                    <div className='text-[11px] text-gray-500'>
                      Linked parties: {emailLinkCountByEmailId.get(email.id) ?? 0}
                    </div>
                    <div className='text-[10px] text-gray-600'>
                      Updated: {formatTimestamp(email.updatedAt ?? undefined)}
                    </div>
                  </div>
                  <div className='flex items-center gap-2'>
                    <Button
                      type='button'
                      variant='outline'
                      className='h-8 w-8 p-0'
                      onClick={(): void => {
                        handleStartEditEmail(email);
                      }}
                    >
                      <Edit2 className='size-3.5' />
                    </Button>
                    <Button
                      type='button'
                      variant='outline'
                      className='h-8 w-8 p-0 text-red-200 hover:text-red-100'
                      onClick={(): void => {
                        void handleDeleteEmail(email.id);
                      }}
                    >
                      <Trash2 className='size-3.5' />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </FormSection>

      <FormSection
        title='Organizations'
        className='space-y-4 p-4'
        actions={(
          <Button
            type='button'
            onClick={openCreateOrg}
            disabled={updateSetting.isPending}
            className='h-8'
          >
            <Plus className='mr-1.5 size-3.5' />
            Add Organization
          </Button>
        )}
      >
        <div className='space-y-2'>
          {organizations.length === 0 ? (
            <EmptyState
              title='No organizations'
              description='No organizations added yet.'
              variant='compact'
              className='bg-card/20 border-dashed border-border/60 py-8'
            />
          ) : (
            organizations.map((organization: FilemakerOrganization) => (
              <Card key={organization.id} variant='subtle-compact' padding='md' className='border-border/60 bg-card/35'>
                <div className='flex flex-wrap items-start justify-between gap-3'>
                  <div className='min-w-0 flex-1 space-y-1'>
                    <div className='text-sm font-semibold text-white'>{organization.name}</div>
                    <div className='text-xs text-gray-300'>{formatFilemakerAddress(organization)}</div>
                    <div className='text-[10px] text-gray-600'>
                      Updated: {formatTimestamp(organization.updatedAt ?? undefined)}
                    </div>
                  </div>
                  <div className='flex items-center gap-2'>
                    <Button
                      type='button'
                      variant='outline'
                      className='h-8 w-8 p-0'
                      onClick={(): void => {
                        handleStartEditOrganization(organization);
                      }}
                    >
                      <Edit2 className='size-3.5' />
                    </Button>
                    <Button
                      type='button'
                      variant='outline'
                      className='h-8 w-8 p-0 text-red-200 hover:text-red-100'
                      onClick={(): void => {
                        void handleDeleteOrganization(organization.id);
                      }}
                    >
                      <Trash2 className='size-3.5' />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </FormSection>

      <FormSection
        title='Events'
        className='space-y-4 p-4'
        actions={(
          <Button
            type='button'
            onClick={openCreateEvent}
            disabled={updateSetting.isPending}
            className='h-8'
          >
            <Plus className='mr-1.5 size-3.5' />
            Add Event
          </Button>
        )}
      >
        <div className='space-y-2'>
          {events.length === 0 ? (
            <EmptyState
              title='No events'
              description='No events added yet.'
              variant='compact'
              className='bg-card/20 border-dashed border-border/60 py-8'
            />
          ) : (
            events.map((event: FilemakerEvent) => (
              <Card key={event.id} variant='subtle-compact' padding='md' className='border-border/60 bg-card/35'>
                <div className='flex flex-wrap items-start justify-between gap-3'>
                  <div className='min-w-0 flex-1 space-y-1'>
                    <div className='text-sm font-semibold text-white'>{event.eventName}</div>
                    <div className='text-xs text-gray-300'>{formatFilemakerAddress(event)}</div>
                    <div className='text-[11px] text-gray-500'>
                      Linked organizations: {eventLinkCountByEventId.get(event.id) ?? 0}
                    </div>
                    <div className='text-[10px] text-gray-600'>
                      Updated: {formatTimestamp(event.updatedAt ?? undefined)}
                    </div>
                  </div>
                  <div className='flex items-center gap-2'>
                    <Button
                      type='button'
                      variant='outline'
                      className='h-8 w-8 p-0'
                      onClick={(): void => {
                        handleStartEditEvent(event);
                      }}
                    >
                      <Edit2 className='size-3.5' />
                    </Button>
                    <Button
                      type='button'
                      variant='outline'
                      className='h-8 w-8 p-0 text-red-200 hover:text-red-100'
                      onClick={(): void => {
                        void handleDeleteEvent(event.id);
                      }}
                    >
                      <Trash2 className='size-3.5' />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </FormSection>

      <SettingsPanelBuilder<PersonDraft>
        open={isPersonModalOpen}
        onClose={() => setIsPersonModalOpen(false)}
        title={editingPerson ? 'Edit Person' : 'Add Person'}
        fields={personFields}
        values={personDraft}
        onChange={(vals) => setPersonDraft(prev => ({ ...prev, ...vals }))}
        onSave={handleSavePerson}
        isSaving={updateSetting.isPending}
        size='lg'
      />

      <SettingsPanelBuilder
        open={isOrgModalOpen}
        onClose={() => setIsOrgModalOpen(false)}
        title={editingOrg ? 'Edit Organization' : 'Add Organization'}
        fields={orgFields}
        values={orgDraft}
        onChange={(vals) => setOrgDraft(prev => ({ ...prev, ...vals }))}
        onSave={handleSaveOrganization}
        isSaving={updateSetting.isPending}
        size='md'
      />

      <SettingsPanelBuilder<EventDraft>
        open={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        title={editingEvent ? 'Edit Event' : 'Add Event'}
        fields={eventFields}
        values={eventDraft}
        onChange={(vals) => setEventDraft(prev => ({ ...prev, ...vals }))}
        onSave={handleSaveEvent}
        isSaving={updateSetting.isPending}
        size='md'
      />

      <SettingsPanelBuilder<EmailDraft>
        open={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        title={editingEmail ? 'Edit Email' : 'Add Email'}
        fields={emailFields}
        values={emailDraft}
        onChange={(vals) => setEmailDraft((prev) => ({ ...prev, ...vals }))}
        onSave={handleSaveEmail}
        isSaving={updateSetting.isPending}
        size='sm'
      />

      <ConfirmModal
        isOpen={Boolean(confirmation)}
        onClose={() => setConfirmation(null)}
        title={confirmation?.title ?? ''}
        message={confirmation?.message ?? ''}
        confirmText={confirmation?.confirmText ?? 'Confirm'}
        isDangerous={confirmation?.isDangerous ?? false}
        onConfirm={async () => {
          if (confirmation?.onConfirm) {
            await confirmation.onConfirm();
          }
          setConfirmation(null);
        }}
      />
    </div>
  );
}
