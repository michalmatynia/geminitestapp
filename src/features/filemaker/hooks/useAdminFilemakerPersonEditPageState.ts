'use client';

/* eslint-disable max-lines, max-lines-per-function, complexity */

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
  FilemakerAddress,
  FilemakerEmail,
  FilemakerDatabase,
  FilemakerPerson,
  FilemakerPhoneNumber,
} from '../types';
import type { MongoFilemakerWebsite } from '../filemaker-websites.types';
import type { FilemakerAnyParam } from '../filemaker-anyparam.types';
import type { FilemakerAnyText } from '../filemaker-anytext.types';
import type { FilemakerBankAccount } from '../filemaker-bank-account.types';
import type { FilemakerContract } from '../filemaker-contract.types';
import type { FilemakerDocument } from '../filemaker-document.types';
import type { FilemakerPersonOccupation } from '../filemaker-person-occupation.types';
import type { MongoFilemakerPerson } from '../pages/AdminFilemakerPersonsPage.types';
import type { EditableAddress } from './editable-address';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import {
  buildFilemakerCountryList,
  buildFilemakerCountryLookup,
  resolveFilemakerCountryId,
  resolveFilemakerCountryName,
} from '../settings/filemaker-country-options';

type MongoFilemakerPersonResponse = {
  linkedAddresses?: FilemakerAddress[];
  linkedAnyParams?: FilemakerAnyParam[];
  linkedAnyTexts?: FilemakerAnyText[];
  linkedBankAccounts?: FilemakerBankAccount[];
  linkedContracts?: FilemakerContract[];
  linkedDocuments?: FilemakerDocument[];
  linkedOccupations?: FilemakerPersonOccupation[];
  linkedWebsites?: MongoFilemakerWebsite[];
  person: MongoFilemakerPerson;
};

const toEditableAddress = (
  address: FilemakerAddress,
  input: {
    countries: CountryOption[];
    countryById: Map<string, CountryOption>;
    isDefault: boolean;
  }
): EditableAddress => ({
  addressId: address.id,
  street: address.street,
  streetNumber: address.streetNumber,
  city: address.city,
  postalCode: address.postalCode,
  countryId: resolveFilemakerCountryId(
    address.countryId,
    address.country,
    input.countries,
    input.countryById
  ),
  country: resolveFilemakerCountryName(
    address.countryId,
    address.country,
    input.countries,
    input.countryById
  ),
  countryValueId: address.countryValueId,
  countryValueLabel: address.countryValueLabel,
  isDefault: input.isDefault,
  legacyCountryUuid: address.legacyCountryUuid,
  legacyUuid: address.legacyUuid,
});

export type AdminFilemakerPersonEditPageContextValue = {
  isCreateMode: boolean;
  person: (FilemakerPerson | MongoFilemakerPerson) | null;
  personDraft: Partial<FilemakerPerson>;
  setPersonDraft: (value: React.SetStateAction<Partial<FilemakerPerson>>) => void;
  editableAddresses: EditableAddress[];
  setEditableAddresses: (value: React.SetStateAction<EditableAddress[]>) => void;
  emailExtractionText: string;
  setEmailExtractionText: (value: React.SetStateAction<string>) => void;
  phoneNumberExtractionText: string;
  setPhoneNumberExtractionText: (value: React.SetStateAction<string>) => void;
  emails: FilemakerEmail[];
  linkedAnyParams: FilemakerAnyParam[];
  linkedAnyTexts: FilemakerAnyText[];
  linkedBankAccounts: FilemakerBankAccount[];
  linkedContracts: FilemakerContract[];
  linkedDocuments: FilemakerDocument[];
  linkedOccupations: FilemakerPersonOccupation[];
  websites: MongoFilemakerWebsite[];
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
  const countries = useMemo(
    () => buildFilemakerCountryList(countriesQuery.data ?? []),
    [countriesQuery.data]
  );
  const countryById = useMemo(
    () => buildFilemakerCountryLookup(countries),
    [countries]
  );

  const rawDatabase = settingsStore.get(FILEMAKER_DATABASE_KEY);
  const database = useMemo(() => parseFilemakerDatabase(rawDatabase), [rawDatabase]);
  const [mongoPerson, setMongoPerson] = useState<MongoFilemakerPerson | null>(null);
  const [mongoLinkedAnyParams, setMongoLinkedAnyParams] = useState<FilemakerAnyParam[]>([]);
  const [mongoLinkedAnyTexts, setMongoLinkedAnyTexts] = useState<FilemakerAnyText[]>([]);
  const [mongoLinkedBankAccounts, setMongoLinkedBankAccounts] = useState<FilemakerBankAccount[]>([]);
  const [mongoLinkedContracts, setMongoLinkedContracts] = useState<FilemakerContract[]>([]);
  const [mongoLinkedDocuments, setMongoLinkedDocuments] = useState<FilemakerDocument[]>([]);
  const [mongoLinkedOccupations, setMongoLinkedOccupations] = useState<
    FilemakerPersonOccupation[]
  >([]);
  const [mongoLinkedAddresses, setMongoLinkedAddresses] = useState<FilemakerAddress[]>([]);
  const [mongoLinkedWebsites, setMongoLinkedWebsites] = useState<MongoFilemakerWebsite[]>([]);
  const [isMongoPersonLoading, setIsMongoPersonLoading] = useState(false);
  const [isMongoPersonSaving, setIsMongoPersonSaving] = useState(false);

  const settingsPerson = useMemo(
    () => (isCreateMode ? null : (database.persons.find((p) => p.id === personId) ?? null)),
    [database.persons, isCreateMode, personId]
  );
  const person: (FilemakerPerson | MongoFilemakerPerson) | null = isCreateMode
    ? null
    : (mongoPerson ?? settingsPerson);

  const [personDraft, setPersonDraft] = useState<Partial<FilemakerPerson>>({});
  const [editableAddresses, setEditableAddresses] = useState<EditableAddress[]>([]);
  const [emailExtractionText, setEmailExtractionText] = useState('');
  const [phoneNumberExtractionText, setPhoneNumberExtractionText] = useState('');

  useEffect(() => {
    if (isCreateMode) {
      setMongoPerson(null);
      setMongoLinkedAnyParams([]);
      setMongoLinkedAnyTexts([]);
      setMongoLinkedBankAccounts([]);
      setMongoLinkedContracts([]);
      setMongoLinkedDocuments([]);
      setMongoLinkedOccupations([]);
      setMongoLinkedAddresses([]);
      setMongoLinkedWebsites([]);
      setIsMongoPersonLoading(false);
      return undefined;
    }
    const controller = new AbortController();
    setIsMongoPersonLoading(true);
    fetch(`/api/filemaker/persons/${encodeURIComponent(personId)}`, { signal: controller.signal })
      .then(async (response: Response): Promise<MongoFilemakerPersonResponse> => {
        if (!response.ok) throw new Error(`Failed to load person (${response.status}).`);
        return (await response.json()) as MongoFilemakerPersonResponse;
      })
      .then((response: MongoFilemakerPersonResponse): void => {
        setMongoPerson(response.person);
        setMongoLinkedAnyParams(response.linkedAnyParams ?? []);
        setMongoLinkedAnyTexts(response.linkedAnyTexts ?? []);
        setMongoLinkedBankAccounts(response.linkedBankAccounts ?? []);
        setMongoLinkedContracts(response.linkedContracts ?? []);
        setMongoLinkedDocuments(response.linkedDocuments ?? []);
        setMongoLinkedOccupations(response.linkedOccupations ?? []);
        setMongoLinkedAddresses(response.linkedAddresses ?? []);
        setMongoLinkedWebsites(response.linkedWebsites ?? []);
        setIsMongoPersonLoading(false);
      })
      .catch((error: unknown): void => {
        if (controller.signal.aborted) return;
        logClientError(error);
        setMongoPerson(null);
        setMongoLinkedAnyParams([]);
        setMongoLinkedAnyTexts([]);
        setMongoLinkedBankAccounts([]);
        setMongoLinkedContracts([]);
        setMongoLinkedDocuments([]);
        setMongoLinkedOccupations([]);
        setMongoLinkedAddresses([]);
        setMongoLinkedWebsites([]);
        setIsMongoPersonLoading(false);
      });
    return () => {
      controller.abort();
    };
  }, [isCreateMode, personId]);

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
      const settingsAddresses = addressLinks.map((link) => {
        const addr = getFilemakerAddressById(database, link.addressId);
        return {
          addressId: link.addressId,
          street: addr?.street ?? '',
          streetNumber: addr?.streetNumber ?? '',
          city: addr?.city ?? '',
          postalCode: addr?.postalCode ?? '',
          countryId: resolveFilemakerCountryId(
            addr?.countryId ?? '',
            addr?.country ?? '',
            countries,
            countryById
          ),
          country: resolveFilemakerCountryName(
            addr?.countryId ?? '',
            addr?.country ?? '',
            countries,
            countryById
          ),
          countryValueId: addr?.countryValueId,
          countryValueLabel: addr?.countryValueLabel,
          isDefault: link.isDefault,
          legacyCountryUuid: addr?.legacyCountryUuid,
          legacyUuid: addr?.legacyUuid,
        };
      });
      if (settingsAddresses.length > 0 || mongoPerson === null) {
        setEditableAddresses(settingsAddresses);
      } else {
        const defaultAddressId = person.addressId;
        const mongoAddresses = mongoLinkedAddresses.map((address: FilemakerAddress) =>
          toEditableAddress(address, {
            countries,
            countryById,
            isDefault: address.id === defaultAddressId,
          })
        );
        const hasDefaultAddress = mongoAddresses.some(
          (address: EditableAddress): boolean => address.isDefault
        );
        setEditableAddresses(
          hasDefaultAddress
            ? mongoAddresses
            : mongoAddresses.map((address: EditableAddress, index: number) => ({
                ...address,
                isDefault: index === 0,
              }))
        );
      }
    }
  }, [countries, countryById, isCreateMode, mongoLinkedAddresses, mongoPerson, person, database]);

  const emails = useMemo(
    () => (person ? getFilemakerEmailsForParty(database, 'person', person.id) : []),
    [database, person]
  );
  const websites = mongoLinkedWebsites;
  const linkedAnyParams = mongoLinkedAnyParams;
  const linkedAnyTexts = mongoLinkedAnyTexts;
  const linkedBankAccounts = mongoLinkedBankAccounts;
  const linkedContracts = mongoLinkedContracts;
  const linkedDocuments = mongoLinkedDocuments;
  const linkedOccupations = mongoLinkedOccupations;

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

    if (mongoPerson !== null) {
      setIsMongoPersonSaving(true);
      try {
        const response = await fetch(`/api/filemaker/persons/${encodeURIComponent(mongoPerson.id)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: nextFirstName,
            lastName: nextLastName,
          }),
        });
        if (!response.ok) throw new Error(`Failed to save person (${response.status}).`);
        const payload = (await response.json()) as { person: MongoFilemakerPerson };
        setMongoPerson(payload.person);
        toast('Person updated.', { variant: 'success' });
        startTransition(() => {
          router.push('/admin/filemaker/persons');
        });
      } catch (error: unknown) {
        logClientError(error);
        toast('Failed to save changes.', { variant: 'error' });
      } finally {
        setIsMongoPersonSaving(false);
      }
      return;
    }

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
  }, [database, isCreateMode, mongoPerson, person, personDraft, persistDatabase, router, toast]);

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
    linkedAnyParams,
    linkedAnyTexts,
    linkedBankAccounts,
    linkedContracts,
    linkedDocuments,
    linkedOccupations,
    websites,
    phoneNumbers,
    countries,
    database,
    handleSave,
    handleExtractEmails,
    updateSetting: {
      isPending: updateSetting.isPending || isMongoPersonLoading || isMongoPersonSaving,
    },
    router,
  };
}
