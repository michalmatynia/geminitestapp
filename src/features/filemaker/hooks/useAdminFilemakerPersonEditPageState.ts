'use client';

import { useRouter } from 'nextjs-toploader/app';
import { useParams } from 'next/navigation';
import type React from 'react';
import { startTransition, useCallback, useEffect, useMemo, useState } from 'react';

import type { CountryOption } from '@/shared/contracts/internationalization';
import { useCountries } from '@/shared/hooks/use-i18n-queries';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { useToast } from '@/shared/ui/primitives.public';

import { createClientFilemakerId, decodeRouteParam } from '../pages/filemaker-page-utils';
import {
  FILEMAKER_DATABASE_KEY,
  FILEMAKER_EMAIL_PARSER_PROMPT_SETTINGS_KEY,
  createFilemakerPerson,
  getFilemakerAddressById,
  getFilemakerAddressLinksForOwner,
  getFilemakerEmailsForParty,
  getFilemakerPhoneNumbersForParty,
  parseAndUpsertFilemakerEmailsForParty,
  parseFilemakerEmailParserRulesFromPromptSettings,
  parseFilemakerDatabase,
  toPersistedFilemakerDatabase,
} from '../settings';

import type {
  FilemakerEmail,
  FilemakerPerson,
  FilemakerPhoneNumber,
  FilemakerDatabase,
} from '../types';
import type { EditableAddress } from './editable-address';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


export type AdminFilemakerPersonEditPageContextValue = {
  isCreateMode: boolean;
  person: FilemakerPerson | null;
  personDraft: Partial<FilemakerPerson>;
  setPersonDraft: (value: React.SetStateAction<Partial<FilemakerPerson>>) => void;
  editableAddresses: EditableAddress[];
  setEditableAddresses: (value: React.SetStateAction<EditableAddress[]>) => void;
  emailExtractionText: string;
  setEmailExtractionText: (value: React.SetStateAction<string>) => void;
  phoneNumberExtractionText: string;
  setPhoneNumberExtractionText: (value: React.SetStateAction<string>) => void;
  emails: FilemakerEmail[];
  phoneNumbers: FilemakerPhoneNumber[];
  countries: CountryOption[];
  database: FilemakerDatabase;
  handleSave: () => Promise<void>;
  handleExtractEmails: () => Promise<void>;
  updateSetting: { isPending: boolean };
  router: AppRouterInstance;
};

export function useAdminFilemakerPersonEditPageState(): AdminFilemakerPersonEditPageContextValue {
  const params = useParams();
  const router = useRouter();
  const settingsStore = useSettingsStore();
  const updateSetting = useUpdateSetting();
  const { toast } = useToast();

  const personId = decodeRouteParam(params['personId']);
  const isCreateMode = personId === 'new';

  const countriesQuery = useCountries();
  const countries = countriesQuery.data ?? [];

  const rawDatabase = settingsStore.get(FILEMAKER_DATABASE_KEY);
  const database = useMemo(() => parseFilemakerDatabase(rawDatabase), [rawDatabase]);

  const person = useMemo(
    () => (isCreateMode ? null : (database.persons.find((p) => p.id === personId) ?? null)),
    [database.persons, isCreateMode, personId]
  );

  const [personDraft, setPersonDraft] = useState<Partial<FilemakerPerson>>({});
  const [editableAddresses, setEditableAddresses] = useState<EditableAddress[]>([]);
  const [emailExtractionText, setEmailExtractionText] = useState('');
  const [phoneNumberExtractionText, setPhoneNumberExtractionText] = useState('');

  useEffect(() => {
    if (isCreateMode) {
      setPersonDraft({
        firstName: '',
        lastName: '',
        nip: '',
        regon: '',
        phoneNumbers: [],
      });
      setEditableAddresses([]);
      return;
    }
    if (person) {
      setPersonDraft(person);

      const addressLinks = getFilemakerAddressLinksForOwner(database, 'person', person.id);
      const addresses = addressLinks.map((link) => {
        const addr = getFilemakerAddressById(database, link.addressId);
        return {
          addressId: link.addressId,
          street: addr?.street ?? '',
          streetNumber: addr?.streetNumber ?? '',
          city: addr?.city ?? '',
          postalCode: addr?.postalCode ?? '',
          countryId: addr?.countryId ?? '',
          country: addr?.country ?? '',
          isDefault: link.isDefault,
        };
      });
      setEditableAddresses(addresses);
    }
  }, [isCreateMode, person, database]);

  const emails = useMemo(
    () => (person ? getFilemakerEmailsForParty(database, 'person', person.id) : []),
    [database, person]
  );

  const phoneNumbers = useMemo(
    () => (person ? getFilemakerPhoneNumbersForParty(database, 'person', person.id) : []),
    [database, person]
  );

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
        toast('Failed to save changes.', { variant: 'error' });
      }
    },
    [updateSetting, toast]
  );

  const handleSave = useCallback(async (): Promise<void> => {
    const nextFirstName = personDraft.firstName?.trim() ?? '';
    const nextLastName = personDraft.lastName?.trim() ?? '';
    if (nextFirstName.length === 0 && nextLastName.length === 0) {
      toast('First name or last name is required.', { variant: 'warning' });
      return;
    }

    let nextDatabase = database;

    if (isCreateMode) {
      const now = new Date().toISOString();
      const newPerson = createFilemakerPerson({
        id: createClientFilemakerId('person'),
        firstName: nextFirstName,
        lastName: nextLastName,
        addressId: '',
        street: personDraft.street ?? '',
        streetNumber: personDraft.streetNumber ?? '',
        city: personDraft.city ?? '',
        postalCode: personDraft.postalCode ?? '',
        country: personDraft.country ?? '',
        countryId: personDraft.countryId ?? '',
        nip: personDraft.nip ?? '',
        regon: personDraft.regon ?? '',
        phoneNumbers: personDraft.phoneNumbers ?? [],
        createdAt: now,
        updatedAt: now,
      });
      nextDatabase = {
        ...nextDatabase,
        persons: [...nextDatabase.persons, newPerson],
      };

      await persistDatabase(nextDatabase, 'Person created.');
      startTransition(() => {
        router.push('/admin/filemaker/persons');
      });
      return;
    }

    if (person === null) return;

    nextDatabase = {
      ...nextDatabase,
      persons: nextDatabase.persons.map((p) =>
        p.id === person.id ? { ...p, ...personDraft, updatedAt: new Date().toISOString() } : p
      ),
    };

    await persistDatabase(nextDatabase, 'Person updated.');
    startTransition(() => {
      router.push('/admin/filemaker/persons');
    });
  }, [database, isCreateMode, person, personDraft, persistDatabase, router, toast]);

  const handleExtractEmails = useCallback(async (): Promise<void> => {
    if (person === null || emailExtractionText.trim().length === 0) return;

    const promptSettings = settingsStore.get(FILEMAKER_EMAIL_PARSER_PROMPT_SETTINGS_KEY);
    const rules = parseFilemakerEmailParserRulesFromPromptSettings(promptSettings);

    const {
      database: nextDatabase,
      createdEmailCount,
      linkedEmailCount,
    } = parseAndUpsertFilemakerEmailsForParty(database, {
      partyKind: 'person',
      partyId: person.id,
      text: emailExtractionText,
      parserRules: rules,
    });

    await persistDatabase(
      nextDatabase,
      `Extracted ${createdEmailCount} new emails and linked ${linkedEmailCount} total.`
    );
    setEmailExtractionText('');
  }, [database, person, emailExtractionText, persistDatabase, settingsStore]);

  return {
    isCreateMode,
    person,
    personDraft,
    setPersonDraft,
    editableAddresses,
    setEditableAddresses,
    emailExtractionText,
    setEmailExtractionText,
    phoneNumberExtractionText,
    setPhoneNumberExtractionText,
    emails,
    phoneNumbers,
    countries,
    database,
    handleSave,
    handleExtractEmails,
    updateSetting,
    router,
  };
}
