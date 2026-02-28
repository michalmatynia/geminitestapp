'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';

import { useCountries } from '@/shared/lib/internationalization/hooks/useInternationalizationQueries';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { useToast } from '@/shared/ui';

import {
  createFilemakerEvent,
  FILEMAKER_DATABASE_KEY,
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

export function useAdminFilemakerPageState() {
  const router = useRouter();
  const settingsStore = useSettingsStore();
  const updateSetting = useUpdateSetting();
  const { toast } = useToast();

  const rawDatabase = settingsStore.get(FILEMAKER_DATABASE_KEY);
  const database = useMemo(() => parseFilemakerDatabase(rawDatabase), [rawDatabase]);

  const { data: countries = [] } = useCountries();

  const [activeTab, setActiveTab] = useState('persons');
  const [searchQuery, setSearchQuery] = useState('');

  // Persons
  const [isPersonModalOpen, setIsPersonModalOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<FilemakerPerson | null>(null);
  const [personDraft, setPersonDraft] = useState<PersonDraft>({});

  // Organizations
  const [isOrgModalOpen, setIsOrgModalOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<FilemakerOrganization | null>(null);
  const [orgDraft, setOrgDraft] = useState<Partial<FilemakerOrganization>>({});

  // Emails
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [editingEmail, setEditingEmail] = useState<FilemakerEmail | null>(null);
  const [emailDraft, setEmailDraft] = useState<EmailDraft>({});

  // Events
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<FilemakerEvent | null>(null);
  const [eventDraft, setEventDraft] = useState<EventDraft>({});

  // Derived data
  const emailLinkCountByEmailId = useMemo(() => {
    const counts = new Map<string, number>();
    database.emailLinks.forEach((link) => {
      counts.set(link.emailId, (counts.get(link.emailId) ?? 0) + 1);
    });
    return counts;
  }, [database.emailLinks]);

  const persistDatabase = useCallback(
    async (next: FilemakerDatabase, message: string): Promise<void> => {
      try {
        await updateSetting.mutateAsync({
          key: FILEMAKER_DATABASE_KEY,
          value: JSON.stringify(normalizeFilemakerDatabase(next)),
        });
        toast(message, { variant: 'success' });
      } catch (_error: unknown) {
        toast('Failed to save database change.', { variant: 'error' });
      }
    },
    [updateSetting, toast]
  );

  // Person handlers
  const openCreatePerson = useCallback(() => {
    setEditingPerson(null);
    setPersonDraft({});
    setIsPersonModalOpen(true);
  }, []);

  const handleStartEditPerson = useCallback((person: FilemakerPerson) => {
    setEditingPerson(person);
    setPersonDraft({
      ...person,
      phoneNumbers: person.phoneNumbers.join(', '),
    });
    setIsPersonModalOpen(true);
  }, []);

  const handleDeletePerson = useCallback(
    async (id: string) => {
      let nextDatabase = {
        ...database,
        persons: database.persons.filter((p) => p.id !== id),
      };
      nextDatabase = removeFilemakerPartyEmailLinks(nextDatabase, 'person', id);
      nextDatabase = removeFilemakerPartyPhoneNumberLinks(nextDatabase, 'person', id);
      await persistDatabase(nextDatabase, 'Person deleted.');
    },
    [database, persistDatabase]
  );

  // Organization handlers
  const openCreateOrg = useCallback(() => {
    setEditingOrg(null);
    setOrgDraft({});
    setIsOrgModalOpen(true);
  }, []);

  const handleStartEditOrg = useCallback((org: FilemakerOrganization) => {
    setEditingOrg(org);
    setOrgDraft(org);
    setIsOrgModalOpen(true);
  }, []);

  const handleDeleteOrganization = useCallback(
    async (id: string) => {
      let nextDatabase = {
        ...database,
        organizations: database.organizations.filter((o) => o.id !== id),
      };
      nextDatabase = removeFilemakerPartyEmailLinks(nextDatabase, 'organization', id);
      nextDatabase = removeFilemakerPartyPhoneNumberLinks(nextDatabase, 'organization', id);
      nextDatabase = removeFilemakerOrganizationEventLinks(nextDatabase, id);
      await persistDatabase(nextDatabase, 'Organization deleted.');
    },
    [database, persistDatabase]
  );

  // Email handlers
  const openCreateEmail = useCallback(() => {
    setEditingEmail(null);
    setEmailDraft({});
    setIsEmailModalOpen(true);
  }, []);

  const handleStartEditEmail = useCallback((email: FilemakerEmail) => {
    setEditingEmail(email);
    setEmailDraft(email);
    setIsEmailModalOpen(true);
  }, []);

  const handleDeleteEmail = useCallback(
    async (id: string) => {
      const nextDatabase = removeFilemakerEmail(database, id);
      await persistDatabase(nextDatabase, 'Email deleted.');
    },
    [database, persistDatabase]
  );

  // Event handlers
  const openCreateEvent = useCallback(() => {
    setEditingEvent(null);
    setEventDraft({});
    setIsEventModalOpen(true);
  }, []);

  const handleStartEditEvent = useCallback((event: FilemakerEvent) => {
    setEditingEvent(event);
    setEventDraft(event);
    setIsEventModalOpen(true);
  }, []);

  const handleDeleteEvent = useCallback(
    async (id: string) => {
      const nextDatabase = removeFilemakerEvent(database, id);
      await persistDatabase(nextDatabase, 'Event deleted.');
    },
    [database, persistDatabase]
  );

  const handleCreateEvent = useCallback(async (): Promise<void> => {
    if (!eventDraft.eventName) {
      toast('Event name is required.', { variant: 'warning' });
      return;
    }

    const newEvent = createFilemakerEvent({
      eventName: eventDraft.eventName,
      id: createId('event'),
      addressId: createId('addr'),
      street: '',
      streetNumber: '',
      city: '',
      postalCode: '',
      country: '',
      countryId: '',
    });

    const nextDatabase: FilemakerDatabase = {
      ...database,
      events: [...database.events, newEvent],
    };

    await persistDatabase(nextDatabase, 'Event created.');
    setIsEventModalOpen(false);
    setEventDraft({});
  }, [database, eventDraft, persistDatabase, toast]);

  return {
    database,
    countries,
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    updateSetting,
    emailLinkCountByEmailId,
    // Persons
    isPersonModalOpen,
    setIsPersonModalOpen,
    editingPerson,
    personDraft,
    setPersonDraft,
    openCreatePerson,
    handleStartEditPerson,
    handleDeletePerson,
    // Organizations
    isOrgModalOpen,
    setIsOrgModalOpen,
    editingOrg,
    orgDraft,
    setOrgDraft,
    openCreateOrg,
    handleStartEditOrg,
    handleDeleteOrganization,
    // Emails
    isEmailModalOpen,
    setIsEmailModalOpen,
    editingEmail,
    emailDraft,
    setEmailDraft,
    openCreateEmail,
    handleStartEditEmail,
    handleDeleteEmail,
    // Events
    isEventModalOpen,
    setIsEventModalOpen,
    editingEvent,
    eventDraft,
    setEventDraft,
    openCreateEvent,
    handleStartEditEvent,
    handleDeleteEvent,
    handleCreateEvent,
    router,
  };
}
