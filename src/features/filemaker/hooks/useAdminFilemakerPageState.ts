'use client';

import { useRouter } from 'nextjs-toploader/app';
import { useCallback, useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

import { useCountries } from '@/shared/hooks/use-i18n-queries';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { useToast } from '@/shared/ui/primitives.public';

import {
  FILEMAKER_DATABASE_KEY,
  parseFilemakerDatabase,
  removeFilemakerEmail,
  removeFilemakerOrganizationEventLinks,
  removeFilemakerPartyEmailLinks,
  removeFilemakerPartyPhoneNumberLinks,
  toPersistedFilemakerDatabase,
} from '../settings';

import type {
  FilemakerDatabase,
  FilemakerEmail,
  FilemakerEmailStatus,
  FilemakerOrganization,
  FilemakerPerson,
} from '../types';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import {
  useEventPageState,
  type EventPageState,
} from './useAdminFilemakerPageState.events';

type PersonDraft = Partial<Omit<FilemakerPerson, 'phoneNumbers'>> & {
  phoneNumbers?: string;
};

type EmailDraft = {
  email?: string;
  status?: FilemakerEmailStatus;
};

type PersistDatabase = (next: FilemakerDatabase, message: string) => Promise<void>;
type BasePageState = {
  activeTab: string;
  countries: NonNullable<ReturnType<typeof useCountries>['data']>;
  database: FilemakerDatabase;
  emailLinkCountByEmailId: Map<string, number>;
  router: ReturnType<typeof useRouter>;
  searchQuery: string;
  setActiveTab: Dispatch<SetStateAction<string>>;
  setSearchQuery: Dispatch<SetStateAction<string>>;
  updateSetting: ReturnType<typeof useUpdateSetting>;
};
type InternalBasePageState = BasePageState & {
  persistDatabase: PersistDatabase;
};
type PersonPageState = {
  editingPerson: FilemakerPerson | null;
  handleDeletePerson: (id: string) => Promise<void>;
  handleStartEditPerson: (person: FilemakerPerson) => void;
  isPersonModalOpen: boolean;
  openCreatePerson: () => void;
  personDraft: PersonDraft;
  setIsPersonModalOpen: Dispatch<SetStateAction<boolean>>;
  setPersonDraft: Dispatch<SetStateAction<PersonDraft>>;
};
type OrganizationPageState = {
  editingOrg: FilemakerOrganization | null;
  handleDeleteOrganization: (id: string) => Promise<void>;
  handleStartEditOrg: (org: FilemakerOrganization) => void;
  isOrgModalOpen: boolean;
  openCreateOrg: () => void;
  orgDraft: Partial<FilemakerOrganization>;
  setIsOrgModalOpen: Dispatch<SetStateAction<boolean>>;
  setOrgDraft: Dispatch<SetStateAction<Partial<FilemakerOrganization>>>;
};
type EmailPageState = {
  editingEmail: FilemakerEmail | null;
  emailDraft: EmailDraft;
  handleDeleteEmail: (id: string) => Promise<void>;
  handleStartEditEmail: (email: FilemakerEmail) => void;
  isEmailModalOpen: boolean;
  openCreateEmail: () => void;
  setEmailDraft: Dispatch<SetStateAction<EmailDraft>>;
  setIsEmailModalOpen: Dispatch<SetStateAction<boolean>>;
};
type AdminFilemakerPageState =
  BasePageState &
  PersonPageState &
  OrganizationPageState &
  EmailPageState &
  EventPageState;

function useBasePageState(): InternalBasePageState {
  const router = useRouter();
  const settingsStore = useSettingsStore();
  const updateSetting = useUpdateSetting();
  const { toast } = useToast();

  const rawDatabase = settingsStore.get(FILEMAKER_DATABASE_KEY);
  const database = useMemo(() => parseFilemakerDatabase(rawDatabase), [rawDatabase]);

  const { data: countries = [] } = useCountries();

  const [activeTab, setActiveTab] = useState('persons');
  const [searchQuery, setSearchQuery] = useState('');

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
          value: JSON.stringify(toPersistedFilemakerDatabase(next)),
        });
        toast(message, { variant: 'success' });
      } catch (_error: unknown) {
        logClientError(_error);
        toast('Failed to save database change.', { variant: 'error' });
      }
    },
    [updateSetting, toast]
  );

  return {
    activeTab,
    countries,
    database,
    emailLinkCountByEmailId,
    persistDatabase,
    router,
    searchQuery,
    setActiveTab,
    setSearchQuery,
    updateSetting,
  };
}

function usePersonPageState(
  database: FilemakerDatabase,
  persistDatabase: PersistDatabase
): PersonPageState {
  const [isPersonModalOpen, setIsPersonModalOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<FilemakerPerson | null>(null);
  const [personDraft, setPersonDraft] = useState<PersonDraft>({});

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

  return {
    editingPerson,
    handleDeletePerson,
    handleStartEditPerson,
    isPersonModalOpen,
    openCreatePerson,
    personDraft,
    setIsPersonModalOpen,
    setPersonDraft,
  };
}

function useOrganizationPageState(
  database: FilemakerDatabase,
  persistDatabase: PersistDatabase
): OrganizationPageState {
  const [isOrgModalOpen, setIsOrgModalOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<FilemakerOrganization | null>(null);
  const [orgDraft, setOrgDraft] = useState<Partial<FilemakerOrganization>>({});

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

  return {
    editingOrg,
    handleDeleteOrganization,
    handleStartEditOrg,
    isOrgModalOpen,
    openCreateOrg,
    orgDraft,
    setIsOrgModalOpen,
    setOrgDraft,
  };
}

function useEmailPageState(
  database: FilemakerDatabase,
  persistDatabase: PersistDatabase
): EmailPageState {
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [editingEmail, setEditingEmail] = useState<FilemakerEmail | null>(null);
  const [emailDraft, setEmailDraft] = useState<EmailDraft>({});

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

  return {
    editingEmail,
    emailDraft,
    handleDeleteEmail,
    handleStartEditEmail,
    isEmailModalOpen,
    openCreateEmail,
    setEmailDraft,
    setIsEmailModalOpen,
  };
}

export function useAdminFilemakerPageState(): AdminFilemakerPageState {
  const { persistDatabase, ...baseState } = useBasePageState();
  const personState = usePersonPageState(baseState.database, persistDatabase);
  const organizationState = useOrganizationPageState(baseState.database, persistDatabase);
  const emailState = useEmailPageState(baseState.database, persistDatabase);
  const eventState = useEventPageState(baseState.database, persistDatabase);

  return {
    ...baseState,
    ...personState,
    ...organizationState,
    ...emailState,
    ...eventState,
  };
}
