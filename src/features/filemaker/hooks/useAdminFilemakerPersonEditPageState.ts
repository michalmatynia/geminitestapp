'use client';

import { useParams, useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useCountries } from '@/features/internationalization/hooks/useInternationalizationQueries';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { useToast } from '@/shared/ui';

import {
  FILEMAKER_DATABASE_KEY,
  FILEMAKER_EMAIL_PARSER_PROMPT_SETTINGS_KEY,
  getFilemakerAddressById,
  getFilemakerAddressLinksForOwner,
  getFilemakerEmailsForParty,
  getFilemakerPhoneNumbersForParty,
  normalizeFilemakerDatabase,
  parseAndUpsertFilemakerEmailsForParty,
  parseFilemakerEmailParserRulesFromPromptSettings,
  parseFilemakerDatabase,
} from '../settings';
import {
  decodeRouteParam,
} from '../pages/filemaker-page-utils';

import type {
  FilemakerEmail,
  FilemakerPerson,
  FilemakerPhoneNumber,
  FilemakerDatabase,
} from '../types';
import type { CountryOption } from '@/shared/contracts/internationalization';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

export type EditableAddress = {
  addressId: string;
  street: string;
  streetNumber: string;
  city: string;
  postalCode: string;
  countryId: string;
  country: string;
  isDefault: boolean;
};

export type AdminFilemakerPersonEditPageContextValue = {
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

  const countriesQuery = useCountries();
  const countries = countriesQuery.data ?? [];
  
  const rawDatabase = settingsStore.get(FILEMAKER_DATABASE_KEY);
  const database = useMemo(
    () => parseFilemakerDatabase(rawDatabase),
    [rawDatabase]
  );

  const person = useMemo(
    () => database.persons.find((p) => p.id === personId) ?? null,
    [database.persons, personId]
  );

  const [personDraft, setPersonDraft] = useState<Partial<FilemakerPerson>>({});
  const [editableAddresses, setEditableAddresses] = useState<EditableAddress[]>([]);
  const [emailExtractionText, setEmailExtractionText] = useState('');
  const [phoneNumberExtractionText, setPhoneNumberExtractionText] = useState('');

  useEffect(() => {
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
  }, [person, database]);

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
          value: JSON.stringify(normalizeFilemakerDatabase(next)),
        });
        toast(message, { variant: 'success' });
      } catch (_error: unknown) {
        toast('Failed to save changes.', { variant: 'error' });
      }
    },
    [updateSetting, toast]
  );

  const handleSave = useCallback(async (): Promise<void> => {
    if (!person || !personDraft.lastName) return;

    let nextDatabase = database;

    nextDatabase = {
      ...nextDatabase,
      persons: nextDatabase.persons.map((p) =>
        p.id === person.id ? { ...p, ...personDraft, updatedAt: new Date().toISOString() } : p
      ),
    };

    await persistDatabase(nextDatabase, 'Person updated.');
    router.push('/admin/filemaker');
  }, [database, person, personDraft, persistDatabase, router]);

  const handleExtractEmails = useCallback(async (): Promise<void> => {
    if (!person || !emailExtractionText.trim()) return;

    const promptSettings = settingsStore.get(FILEMAKER_EMAIL_PARSER_PROMPT_SETTINGS_KEY);
    const rules = parseFilemakerEmailParserRulesFromPromptSettings(promptSettings);

    const { database: nextDatabase, createdEmailCount, linkedEmailCount } = 
      parseAndUpsertFilemakerEmailsForParty(database, 'person', person.id, emailExtractionText, rules);

    await persistDatabase(nextDatabase, `Extracted ${createdEmailCount} new emails and linked ${linkedEmailCount} total.`);
    setEmailExtractionText('');
  }, [database, person, emailExtractionText, persistDatabase, settingsStore]);

  return {
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
