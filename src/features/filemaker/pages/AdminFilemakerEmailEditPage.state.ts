'use client';

import { useParams } from 'next/navigation';
import { useRouter } from 'nextjs-toploader/app';
import { startTransition, useCallback, useEffect, useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { useToast } from '@/shared/ui/primitives.public';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import {
  createFilemakerEmail,
  FILEMAKER_DATABASE_KEY,
  linkFilemakerEmailToParty,
  normalizeFilemakerDatabase,
  parseFilemakerDatabase,
  toPersistedFilemakerDatabase,
} from '../settings';
import type {
  FilemakerDatabase,
  FilemakerEmail,
  FilemakerEmailStatus,
  FilemakerOrganization,
  FilemakerPerson,
} from '../types';
import { decodeRouteParam } from './filemaker-page-utils';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type EmailEditSaveActionInput = {
  database: FilemakerDatabase;
  email: FilemakerEmail | null;
  emailValue: string;
  linkedOrganizationIds: string[];
  linkedPersonIds: string[];
  router: ReturnType<typeof useRouter>;
  status: FilemakerEmailStatus;
  toast: ReturnType<typeof useToast>['toast'];
  updateSetting: ReturnType<typeof useUpdateSetting>;
};

export type AdminFilemakerEmailEditPageState = {
  email: FilemakerEmail | null;
  emailValue: string;
  isSaving: boolean;
  linkedOrganizationIds: string[];
  linkedPersonIds: string[];
  organizations: FilemakerOrganization[];
  persons: FilemakerPerson[];
  status: FilemakerEmailStatus;
  handleBack: () => void;
  handleSave: () => void;
  setEmailValue: Dispatch<SetStateAction<string>>;
  setStatus: Dispatch<SetStateAction<FilemakerEmailStatus>>;
  toggleOrganizationLink: (organizationId: string, checked: boolean) => void;
  togglePersonLink: (personId: string, checked: boolean) => void;
};

type EmailEditFormState = Pick<
  AdminFilemakerEmailEditPageState,
  | 'emailValue'
  | 'linkedOrganizationIds'
  | 'linkedPersonIds'
  | 'setEmailValue'
  | 'setStatus'
  | 'status'
  | 'toggleOrganizationLink'
  | 'togglePersonLink'
> & {
  hydratedEmailId: string | null;
  setHydratedEmailId: Dispatch<SetStateAction<string | null>>;
  setLinkedOrganizationIds: Dispatch<SetStateAction<string[]>>;
  setLinkedPersonIds: Dispatch<SetStateAction<string[]>>;
};

const toggleSelection = (value: string, checked: boolean, previous: string[]): string[] => {
  if (value.trim().length === 0) return previous;
  if (checked) return previous.includes(value) ? previous : [...previous, value];
  return previous.filter((entry: string): boolean => entry !== value);
};

const sortPersons = (persons: FilemakerPerson[]): FilemakerPerson[] =>
  [...persons].sort((left: FilemakerPerson, right: FilemakerPerson) =>
    `${left.lastName} ${left.firstName}`.localeCompare(`${right.lastName} ${right.firstName}`)
  );

const sortOrganizations = (organizations: FilemakerOrganization[]): FilemakerOrganization[] =>
  [...organizations].sort((left: FilemakerOrganization, right: FilemakerOrganization) =>
    left.name.localeCompare(right.name)
  );

const normalizeEmailValue = (value: string): string => value.trim().toLowerCase();

const getEmailValidationError = (
  database: FilemakerDatabase,
  email: FilemakerEmail,
  normalizedEmail: string
): string | null => {
  if (normalizedEmail.length === 0 || !EMAIL_RE.test(normalizedEmail)) {
    return 'Provide a valid email address.';
  }
  const duplicate = database.emails.some(
    (entry: FilemakerEmail): boolean =>
      entry.id !== email.id && entry.email.trim().toLowerCase() === normalizedEmail
  );
  return duplicate ? 'This email already exists in Filemaker.' : null;
};

const linkEmailToParties = (
  database: FilemakerDatabase,
  emailId: string,
  partyKind: 'organization' | 'person',
  partyIds: string[]
): FilemakerDatabase =>
  partyIds.reduce(
    (nextDatabase, partyId) =>
      linkFilemakerEmailToParty(nextDatabase, { emailId, partyKind, partyId }).database,
    database
  );

const buildUpdatedEmailDatabase = (input: {
  database: FilemakerDatabase;
  email: FilemakerEmail;
  linkedOrganizationIds: string[];
  linkedPersonIds: string[];
  normalizedEmail: string;
  status: FilemakerEmailStatus;
}): FilemakerDatabase => {
  const nextEmails = input.database.emails.map((entry: FilemakerEmail): FilemakerEmail => {
    if (entry.id !== input.email.id) return entry;
    return createFilemakerEmail({
      id: entry.id,
      email: input.normalizedEmail,
      status: input.status,
      createdAt: entry.createdAt,
      updatedAt: new Date().toISOString(),
    });
  });
  const baseDatabase = normalizeFilemakerDatabase({
    ...input.database,
    emails: nextEmails,
    emailLinks: input.database.emailLinks.filter((link): boolean => link.emailId !== input.email.id),
  });
  const withPersons = linkEmailToParties(baseDatabase, input.email.id, 'person', input.linkedPersonIds);
  return linkEmailToParties(withPersons, input.email.id, 'organization', input.linkedOrganizationIds);
};

const useEmailEditFormHydration = ({
  database,
  email,
  hydratedEmailId,
  setEmailValue,
  setHydratedEmailId,
  setLinkedOrganizationIds,
  setLinkedPersonIds,
  setStatus,
}: {
  database: FilemakerDatabase;
  email: FilemakerEmail | null;
  hydratedEmailId: string | null;
  setEmailValue: Dispatch<SetStateAction<string>>;
  setHydratedEmailId: Dispatch<SetStateAction<string | null>>;
  setLinkedOrganizationIds: Dispatch<SetStateAction<string[]>>;
  setLinkedPersonIds: Dispatch<SetStateAction<string[]>>;
  setStatus: Dispatch<SetStateAction<FilemakerEmailStatus>>;
}): void => {
  useEffect(() => {
    if (email === null) return;
    if (hydratedEmailId === email.id) return;
    const linksForEmail = database.emailLinks.filter((link): boolean => link.emailId === email.id);
    setEmailValue(email.email);
    setStatus(email.status);
    setLinkedPersonIds(
      linksForEmail.filter((link): boolean => link.partyKind === 'person').map((link) => link.partyId)
    );
    setLinkedOrganizationIds(
      linksForEmail
        .filter((link): boolean => link.partyKind === 'organization')
        .map((link) => link.partyId)
    );
    setHydratedEmailId(email.id);
  }, [database.emailLinks, email, hydratedEmailId, setEmailValue, setHydratedEmailId, setLinkedOrganizationIds, setLinkedPersonIds, setStatus]);
};

const useEmailEditSaveAction = ({
  database,
  email,
  emailValue,
  linkedOrganizationIds,
  linkedPersonIds,
  router,
  status,
  toast,
  updateSetting,
}: EmailEditSaveActionInput): (() => void) =>
  useCallback((): void => {
    void (async (): Promise<void> => {
      if (email === null) {
        toast('Email was not found.', { variant: 'error' });
        return;
      }
      const normalizedEmail = normalizeEmailValue(emailValue);
      const validationError = getEmailValidationError(database, email, normalizedEmail);
      if (validationError !== null) {
        toast(validationError, { variant: 'error' });
        return;
      }
      const linkedDatabase = buildUpdatedEmailDatabase({
        database,
        email,
        linkedOrganizationIds,
        linkedPersonIds,
        normalizedEmail,
        status,
      });
      try {
        await updateSetting.mutateAsync({
          key: FILEMAKER_DATABASE_KEY,
          value: JSON.stringify(toPersistedFilemakerDatabase(linkedDatabase)),
        });
        toast('Email updated.', { variant: 'success' });
        startTransition(() => { router.push('/admin/filemaker/emails'); });
      } catch (error: unknown) {
        logClientError(error);
        toast(error instanceof Error ? error.message : 'Failed to update email.', { variant: 'error' });
      }
    })();
  }, [database, email, emailValue, linkedOrganizationIds, linkedPersonIds, router, status, toast, updateSetting]);

const useEmailEditFormState = (): EmailEditFormState => {
  const [emailValue, setEmailValue] = useState('');
  const [status, setStatus] = useState<FilemakerEmailStatus>('unverified');
  const [linkedPersonIds, setLinkedPersonIds] = useState<string[]>([]);
  const [linkedOrganizationIds, setLinkedOrganizationIds] = useState<string[]>([]);
  const [hydratedEmailId, setHydratedEmailId] = useState<string | null>(null);
  const toggleOrganizationLink = useCallback((organizationId: string, checked: boolean): void => {
    setLinkedOrganizationIds((previous) => toggleSelection(organizationId, checked, previous));
  }, []);
  const togglePersonLink = useCallback((personId: string, checked: boolean): void => {
    setLinkedPersonIds((previous) => toggleSelection(personId, checked, previous));
  }, []);
  return {
    emailValue,
    hydratedEmailId,
    linkedOrganizationIds,
    linkedPersonIds,
    status,
    setEmailValue,
    setHydratedEmailId,
    setLinkedOrganizationIds,
    setLinkedPersonIds,
    setStatus,
    toggleOrganizationLink,
    togglePersonLink,
  };
};

export const useAdminFilemakerEmailEditPageState = (): AdminFilemakerEmailEditPageState => {
  const params = useParams<{ emailId?: string | string[] }>();
  const router = useRouter();
  const settingsStore = useSettingsStore();
  const updateSetting = useUpdateSetting();
  const { toast } = useToast();
  const emailId = useMemo(() => decodeRouteParam(params.emailId), [params.emailId]);
  const rawDatabase = settingsStore.get(FILEMAKER_DATABASE_KEY);
  const database = useMemo(() => parseFilemakerDatabase(rawDatabase), [rawDatabase]);
  const email = useMemo(
    () => database.emails.find((entry: FilemakerEmail): boolean => entry.id === emailId) ?? null,
    [database.emails, emailId]
  );
  const persons = useMemo((): FilemakerPerson[] => sortPersons(database.persons), [database.persons]);
  const organizations = useMemo(
    (): FilemakerOrganization[] => sortOrganizations(database.organizations),
    [database.organizations]
  );
  const formState = useEmailEditFormState();
  const handleBack = useCallback((): void => {
    startTransition(() => { router.push('/admin/filemaker/emails'); });
  }, [router]);
  const handleSave = useEmailEditSaveAction({
    database,
    email,
    emailValue: formState.emailValue,
    linkedOrganizationIds: formState.linkedOrganizationIds,
    linkedPersonIds: formState.linkedPersonIds,
    router,
    status: formState.status,
    toast,
    updateSetting,
  });
  useEmailEditFormHydration({
    database,
    email,
    hydratedEmailId: formState.hydratedEmailId,
    setEmailValue: formState.setEmailValue,
    setHydratedEmailId: formState.setHydratedEmailId,
    setLinkedOrganizationIds: formState.setLinkedOrganizationIds,
    setLinkedPersonIds: formState.setLinkedPersonIds,
    setStatus: formState.setStatus,
  });
  return {
    ...formState,
    email,
    isSaving: updateSetting.isPending,
    organizations,
    persons,
    handleBack,
    handleSave,
  };
};
