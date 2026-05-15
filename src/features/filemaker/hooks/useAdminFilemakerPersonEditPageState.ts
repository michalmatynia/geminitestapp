'use client';

import { useRouter } from 'nextjs-toploader/app';
import { useParams } from 'next/navigation';
import type React from 'react';
import { startTransition, useCallback, useEffect, useMemo, useState } from 'react';

import type { CountryOption } from '@/shared/contracts/internationalization';
import { useCountries } from '@/shared/hooks/use-i18n-queries';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { createMutationV2, createSingleQueryV2 } from '@/shared/lib/query-factories-v2';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { useToast } from '@/shared/ui/primitives.public';

/* eslint-disable max-lines */

import {
  createClientFilemakerId,
  decodeRouteParam,
  hasAddressFields,
} from '../pages/filemaker-page-utils';
import {
  FILEMAKER_DATABASE_KEY,
  FILEMAKER_EMAIL_PARSER_PROMPT_SETTINGS_KEY,
  createFilemakerAddress,
  createFilemakerAddressLink,
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
  linkedEmails?: FilemakerEmail[];
  linkedOccupations?: FilemakerPersonOccupation[];
  linkedWebsites?: MongoFilemakerWebsite[];
  person: MongoFilemakerPerson;
};

const fetchMongoFilemakerPerson = async (
  personId: string,
  signal: AbortSignal
): Promise<MongoFilemakerPersonResponse> => {
  const response = await fetch(`/api/filemaker/persons/${encodeURIComponent(personId)}`, {
    signal,
  });
  if (!response.ok) throw new Error(`Failed to load person (${response.status}).`);
  return (await response.json()) as MongoFilemakerPersonResponse;
};

const arrayOrEmpty = <T,>(value: T[] | undefined): T[] => value ?? [];

export type FilemakerPersonLinkedRecordKind =
  | 'any-param'
  | 'any-text'
  | 'bank-account'
  | 'document'
  | 'occupation';

type FilemakerPersonLinkedRecordPatch = Record<string, unknown>;

type LinkedRecordPatchResponse = {
  kind: FilemakerPersonLinkedRecordKind;
  patch: FilemakerPersonLinkedRecordPatch;
  recordId: string;
};

type LinkedRecordUpdateVariables = {
  kind: FilemakerPersonLinkedRecordKind;
  patch: FilemakerPersonLinkedRecordPatch;
  personId: string;
  recordId: string;
};

type LinkedRecordDeleteVariables = {
  kind: FilemakerPersonLinkedRecordKind;
  personId: string;
  recordId: string;
};

type MongoPersonEmailExtractionVariables = {
  parserRules: ReturnType<typeof parseFilemakerEmailParserRulesFromPromptSettings>;
  personId: string;
  text: string;
};

type MongoPersonEmailExtractionResponse = {
  createdEmailCount: number;
  linkedEmailCount: number;
  emails: FilemakerEmail[];
};

type MongoPersonSaveVariables = {
  patch: Record<string, unknown>;
  personId: string;
};

type MongoPersonSaveResponse = {
  linkedAddresses?: FilemakerAddress[];
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

type PreparedPersonAddress = EditableAddress;

const applyPersonAddresses = (
  database: FilemakerDatabase,
  personId: string,
  addresses: PreparedPersonAddress[]
): FilemakerDatabase => {
  const addressById = new Map(database.addresses.map((address) => [address.id, address]));
  // eslint-disable-next-line complexity
  addresses.forEach((address: PreparedPersonAddress): void => {
    const existing = addressById.get(address.addressId);
    addressById.set(
      address.addressId,
      createFilemakerAddress({
        id: address.addressId,
        street: address.street,
        streetNumber: address.streetNumber,
        city: address.city,
        postalCode: address.postalCode,
        country: address.country,
        countryId: address.countryId,
        countryValueId: address.countryValueId ?? existing?.countryValueId,
        countryValueLabel: address.countryValueLabel ?? existing?.countryValueLabel,
        createdAt: existing?.createdAt,
        legacyCountryUuid: address.legacyCountryUuid ?? existing?.legacyCountryUuid,
        legacyUuid: address.legacyUuid ?? existing?.legacyUuid,
        updatedAt: new Date().toISOString(),
      })
    );
  });

  const addressLinks = addresses.map((address: PreparedPersonAddress) =>
    createFilemakerAddressLink({
      id: `filemaker-address-link-person-${personId}-${address.addressId}`,
      ownerKind: 'person',
      ownerId: personId,
      addressId: address.addressId,
      isDefault: address.isDefault,
    })
  );

  return {
    ...database,
    addresses: Array.from(addressById.values()),
    addressLinks: [
      ...database.addressLinks.filter(
        (link): boolean => !(link.ownerKind === 'person' && link.ownerId === personId)
      ),
      ...addressLinks,
    ],
  };
};

const normalizePersonLanguageSkillLevel = (value: number): number =>
  Math.min(10, Math.max(1, Math.round(value)));

const normalizePersonLanguageSkillId = (value: string | undefined): string | undefined => {
  const normalized = value?.trim() ?? '';
  return normalized.length > 0 ? normalized : undefined;
};

const normalizePersonLanguageSkills = (
  value: FilemakerPerson['languageSkills'] | undefined
): NonNullable<FilemakerPerson['languageSkills']> =>
  (value ?? [])
    .map((skill): NonNullable<FilemakerPerson['languageSkills']>[number] => {
      const normalizedId = normalizePersonLanguageSkillId(skill.id);
      return {
        ...(normalizedId !== undefined ? { id: normalizedId } : {}),
        language: skill.language.trim(),
        level: normalizePersonLanguageSkillLevel(skill.level),
      };
    })
    .filter((skill): boolean => skill.language.length > 0);

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
  handleUpdateLinkedRecord: (
    kind: FilemakerPersonLinkedRecordKind,
    recordId: string,
    patch: FilemakerPersonLinkedRecordPatch
  ) => Promise<void>;
  handleDeleteLinkedRecord: (
    kind: FilemakerPersonLinkedRecordKind,
    recordId: string
  ) => Promise<void>;
  updateSetting: { isPending: boolean };
  router: AppRouterInstance;
};

// eslint-disable-next-line max-lines-per-function
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
  const [mongoLinkedEmails, setMongoLinkedEmails] = useState<FilemakerEmail[]>([]);
  const [mongoLinkedOccupations, setMongoLinkedOccupations] = useState<
    FilemakerPersonOccupation[]
  >([]);
  const [mongoLinkedAddresses, setMongoLinkedAddresses] = useState<FilemakerAddress[]>([]);
  const [mongoLinkedWebsites, setMongoLinkedWebsites] = useState<MongoFilemakerWebsite[]>([]);
  const [isMongoPersonLoading, setIsMongoPersonLoading] = useState(false);
  const [isMongoPersonSaving, setIsMongoPersonSaving] = useState(false);
  const mongoPersonQueryKey = ['filemaker', 'persons', 'detail', personId] as const;
  const mongoPersonQuery = createSingleQueryV2<
    MongoFilemakerPersonResponse,
    MongoFilemakerPersonResponse,
    typeof mongoPersonQueryKey
  >({
    queryKey: mongoPersonQueryKey,
    queryFn: async ({ signal }) => fetchMongoFilemakerPerson(personId, signal),
    enabled: !isCreateMode && personId.length > 0,
    meta: {
      source:
        'features.filemaker.hooks.useAdminFilemakerPersonEditPageState.mongoPersonDetail',
      operation: 'detail',
      resource: 'filemaker.person',
      domain: 'files',
      description: 'Load imported Mongo Filemaker person detail and linked records.',
      errorPresentation: 'inline',
    },
    telemetryContext: {
      hasPersonId: personId.length > 0,
      isCreateMode,
    },
  });

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
  const resetMongoPersonState = useCallback((): void => {
    setMongoPerson(null);
    setMongoLinkedAnyParams([]);
    setMongoLinkedAnyTexts([]);
    setMongoLinkedBankAccounts([]);
    setMongoLinkedContracts([]);
    setMongoLinkedDocuments([]);
    setMongoLinkedEmails([]);
    setMongoLinkedOccupations([]);
    setMongoLinkedAddresses([]);
    setMongoLinkedWebsites([]);
    setIsMongoPersonLoading(false);
  }, []);
  const applyMongoPersonResponse = useCallback((response: MongoFilemakerPersonResponse): void => {
    setMongoPerson(response.person);
    setMongoLinkedAnyParams(arrayOrEmpty(response.linkedAnyParams));
    setMongoLinkedAnyTexts(arrayOrEmpty(response.linkedAnyTexts));
    setMongoLinkedBankAccounts(arrayOrEmpty(response.linkedBankAccounts));
    setMongoLinkedContracts(arrayOrEmpty(response.linkedContracts));
    setMongoLinkedDocuments(arrayOrEmpty(response.linkedDocuments));
    setMongoLinkedEmails(arrayOrEmpty(response.linkedEmails));
    setMongoLinkedOccupations(arrayOrEmpty(response.linkedOccupations));
    setMongoLinkedAddresses(arrayOrEmpty(response.linkedAddresses));
    setMongoLinkedWebsites(arrayOrEmpty(response.linkedWebsites));
    setIsMongoPersonLoading(false);
  }, []);

  useEffect(() => {
    if (isCreateMode) {
      resetMongoPersonState();
      return;
    }
    if (mongoPersonQuery.data !== undefined) {
      applyMongoPersonResponse(mongoPersonQuery.data);
      return;
    }
    if (mongoPersonQuery.error !== null) {
      logClientError(mongoPersonQuery.error);
      resetMongoPersonState();
      return;
    }
    setIsMongoPersonLoading(mongoPersonQuery.isFetching);
  }, [
    applyMongoPersonResponse,
    isCreateMode,
    mongoPersonQuery.data,
    mongoPersonQuery.error,
    mongoPersonQuery.isFetching,
    resetMongoPersonState,
  ]);

  // eslint-disable-next-line max-lines-per-function
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
      const settingsAddresses = addressLinks.map(
        // eslint-disable-next-line complexity
        (link) => {
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

  const emails = useMemo(() => {
    if (mongoPerson !== null) return mongoLinkedEmails;
    return person ? getFilemakerEmailsForParty(database, 'person', person.id) : [];
  }, [database, mongoLinkedEmails, mongoPerson, person]);
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

  const mongoPersonSaveMutation = createMutationV2<
    MongoPersonSaveResponse,
    MongoPersonSaveVariables
  >({
    mutationKey: ['filemaker', 'persons', 'detail', 'save'],
    mutationFn: async (variables) => {
      const response = await fetch(`/api/filemaker/persons/${encodeURIComponent(variables.personId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(variables.patch),
      });
      if (!response.ok) throw new Error(`Failed to save person (${response.status}).`);
      return (await response.json()) as MongoPersonSaveResponse;
    },
    meta: {
      source: 'features.filemaker.hooks.useAdminFilemakerPersonEditPageState.mongoPersonSave',
      operation: 'update',
      resource: 'filemaker.person',
      domain: 'files',
      description: 'Save an imported Mongo Filemaker person from the edit page.',
      errorPresentation: 'toast',
    },
  });

  // eslint-disable-next-line complexity,max-lines-per-function
  const handleSave = useCallback(async (): Promise<void> => {
    const nextFirstName = personDraft.firstName?.trim() ?? '';
    const nextLastName = personDraft.lastName?.trim() ?? '';
    if (nextFirstName.length === 0 && nextLastName.length === 0) {
      toast('First name or last name is required.', { variant: 'warning' });
      return;
    }

    let nextDatabase = database;
    const preparedAddresses = editableAddresses.map((address: EditableAddress) => {
      const normalizedCountryId = address.countryId.trim();
      return {
        addressId: address.addressId.trim(),
        street: address.street.trim(),
        streetNumber: address.streetNumber.trim(),
        city: address.city.trim(),
        postalCode: address.postalCode.trim(),
        countryId: normalizedCountryId,
        country: resolveFilemakerCountryName(
          normalizedCountryId,
          address.country,
          countries,
          countryById
        ),
        countryValueId: address.countryValueId,
        countryValueLabel: address.countryValueLabel,
        isDefault: address.isDefault,
        legacyCountryUuid: address.legacyCountryUuid,
        legacyUuid: address.legacyUuid,
      };
    });
    const hasInvalidAddress = preparedAddresses.some(
      (address): boolean =>
        !hasAddressFields({
          city: address.city,
          countryId: address.countryId,
          postalCode: address.postalCode,
          street: address.street,
          streetNumber: address.streetNumber,
        })
    );
    const canPersistAddresses = !hasInvalidAddress;
    const defaultAddressId =
      preparedAddresses.find((address): boolean => address.isDefault)?.addressId ??
      preparedAddresses[0]?.addressId ??
      '';
    const normalizedAddresses = preparedAddresses.map((address) => ({
      ...address,
      isDefault: address.addressId === defaultAddressId,
    }));
    const defaultAddress = normalizedAddresses.find(
      (address): boolean => address.addressId === defaultAddressId
    );
    const addressForSave = canPersistAddresses ? defaultAddress : undefined;
    const normalizedLanguageSkills = normalizePersonLanguageSkills(personDraft.languageSkills);

    if (isCreateMode) {
      const now = new Date().toISOString();
      const newPersonId = createClientFilemakerId('person');
      const newPerson = createFilemakerPerson({
        id: newPersonId,
        firstName: nextFirstName,
        lastName: nextLastName,
        addressId: addressForSave?.addressId ?? '',
        street: addressForSave?.street ?? '',
        streetNumber: addressForSave?.streetNumber ?? '',
        city: addressForSave?.city ?? '',
        postalCode: addressForSave?.postalCode ?? '',
        country: addressForSave?.country ?? '',
        countryId: addressForSave?.countryId ?? '',
        nip: personDraft.nip ?? '',
        regon: personDraft.regon ?? '',
        phoneNumbers: personDraft.phoneNumbers ?? [],
        linkedinUrl: personDraft.linkedinUrl ?? '',
        githubUrl: personDraft.githubUrl ?? '',
        languageSkills: normalizedLanguageSkills,
        profileEducation: personDraft.profileEducation ?? [],
        profileJobExperience: personDraft.profileJobExperience ?? [],
        cvHeadline: personDraft.cvHeadline ?? '',
        cvProfessionalSummary: personDraft.cvProfessionalSummary ?? '',
        cvCoreStrengths: personDraft.cvCoreStrengths ?? [],
        cvSelectedTechnicalEnvironment: personDraft.cvSelectedTechnicalEnvironment ?? [],
        createdAt: now,
        updatedAt: now,
      });
      nextDatabase = {
        ...nextDatabase,
        persons: [...nextDatabase.persons, newPerson],
      };
      if (canPersistAddresses) {
        nextDatabase = applyPersonAddresses(nextDatabase, newPersonId, normalizedAddresses);
      }

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
        const addressPatch = canPersistAddresses
          ? {
              addressId: addressForSave?.addressId ?? personDraft.addressId ?? '',
              addresses: normalizedAddresses,
              city: addressForSave?.city ?? personDraft.city ?? '',
              country: addressForSave?.country ?? personDraft.country ?? '',
              countryId: addressForSave?.countryId ?? personDraft.countryId ?? '',
              postalCode: addressForSave?.postalCode ?? personDraft.postalCode ?? '',
              street: addressForSave?.street ?? personDraft.street ?? '',
              streetNumber: addressForSave?.streetNumber ?? personDraft.streetNumber ?? '',
            }
          : {};
        const payload = await mongoPersonSaveMutation.mutateAsync({
          personId: mongoPerson.id,
          patch: {
            ...addressPatch,
            cvCoreStrengths: personDraft.cvCoreStrengths ?? [],
            cvHeadline: personDraft.cvHeadline ?? '',
            cvProfessionalSummary: personDraft.cvProfessionalSummary ?? '',
            cvSelectedTechnicalEnvironment: personDraft.cvSelectedTechnicalEnvironment ?? [],
            firstName: nextFirstName,
            githubUrl: personDraft.githubUrl ?? '',
            languageSkills: normalizedLanguageSkills,
            lastName: nextLastName,
            linkedinUrl: personDraft.linkedinUrl ?? '',
            nip: personDraft.nip ?? '',
            profileEducation: personDraft.profileEducation ?? [],
            profileJobExperience: personDraft.profileJobExperience ?? [],
            regon: personDraft.regon ?? '',
          },
        });
        setMongoPerson(payload.person);
        if (payload.linkedAddresses !== undefined) {
          setMongoLinkedAddresses(payload.linkedAddresses);
        }
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

    if (canPersistAddresses) {
      nextDatabase = applyPersonAddresses(nextDatabase, person.id, normalizedAddresses);
    }
    nextDatabase = {
      ...nextDatabase,
      persons: nextDatabase.persons.map(
        // eslint-disable-next-line complexity
        (p) => {
        if (p.id !== person.id) return p;
        const basePerson = {
          ...p,
          ...personDraft,
          languageSkills: normalizedLanguageSkills,
          updatedAt: new Date().toISOString(),
        };
        if (!canPersistAddresses) return basePerson;
        return {
          ...basePerson,
          addressId: addressForSave?.addressId ?? '',
          street: addressForSave?.street ?? '',
          streetNumber: addressForSave?.streetNumber ?? '',
          city: addressForSave?.city ?? '',
          postalCode: addressForSave?.postalCode ?? '',
          country: addressForSave?.country ?? '',
          countryId: addressForSave?.countryId ?? '',
        };
      }),
    };

    await persistDatabase(nextDatabase, 'Person updated.');
    startTransition(() => {
      router.push('/admin/filemaker/persons');
    });
  }, [
    countries,
    countryById,
    database,
    editableAddresses,
    isCreateMode,
    mongoPerson,
    mongoPersonSaveMutation,
    person,
    personDraft,
    persistDatabase,
    router,
    toast,
  ]);

  const mongoPersonEmailExtractionMutation = createMutationV2<
    MongoPersonEmailExtractionResponse,
    MongoPersonEmailExtractionVariables
  >({
    mutationKey: ['filemaker', 'persons', 'emails', 'extract'],
    mutationFn: async (variables) => {
      const response = await fetch(
        `/api/filemaker/persons/${encodeURIComponent(variables.personId)}/emails`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            parserRules: variables.parserRules,
            text: variables.text,
          }),
        }
      );
      if (!response.ok) throw new Error(`Failed to extract emails (${response.status}).`);
      return (await response.json()) as MongoPersonEmailExtractionResponse;
    },
    meta: {
      source:
        'features.filemaker.hooks.useAdminFilemakerPersonEditPageState.mongoPersonEmailExtraction',
      operation: 'action',
      resource: 'filemaker.person-email-extraction',
      domain: 'files',
      description: 'Extract and link emails for an imported Mongo Filemaker person.',
      errorPresentation: 'toast',
    },
  });

  const handleExtractEmails = useCallback(async (): Promise<void> => {
    if (person === null || emailExtractionText.trim().length === 0) return;

    const promptSettings = settingsStore.get(FILEMAKER_EMAIL_PARSER_PROMPT_SETTINGS_KEY);
    const rules = parseFilemakerEmailParserRulesFromPromptSettings(promptSettings);

    if (mongoPerson !== null) {
      setIsMongoPersonSaving(true);
      try {
        const payload = await mongoPersonEmailExtractionMutation.mutateAsync({
          parserRules: rules,
          personId: mongoPerson.id,
          text: emailExtractionText,
        });
        setMongoLinkedEmails(payload.emails);
        toast(
          `Extracted ${payload.createdEmailCount} new emails and linked ${payload.linkedEmailCount} emails.`,
          { variant: 'success' }
        );
        setEmailExtractionText('');
      } catch (error: unknown) {
        logClientError(error);
        toast('Failed to extract and link emails.', { variant: 'error' });
      } finally {
        setIsMongoPersonSaving(false);
      }
      return;
    }

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
  }, [
    database,
    emailExtractionText,
    mongoPerson,
    mongoPersonEmailExtractionMutation,
    persistDatabase,
    person,
    settingsStore,
    toast,
  ]);

  const applyLinkedRecordPatch = useCallback(
    (
      kind: FilemakerPersonLinkedRecordKind,
      recordId: string,
      patch: FilemakerPersonLinkedRecordPatch
    ): void => {
      if (kind === 'any-param') {
        setMongoLinkedAnyParams((records: FilemakerAnyParam[]): FilemakerAnyParam[] =>
          records.map((record: FilemakerAnyParam): FilemakerAnyParam => {
            if (record.id !== recordId) return record;
            const nextRecord: FilemakerAnyParam = { ...record, ...patch };
            return nextRecord;
          })
        );
        return;
      }
      if (kind === 'any-text') {
        setMongoLinkedAnyTexts((records: FilemakerAnyText[]): FilemakerAnyText[] =>
          records.map((record: FilemakerAnyText): FilemakerAnyText => {
            if (record.id !== recordId) return record;
            const nextRecord: FilemakerAnyText = { ...record, ...patch };
            return nextRecord;
          })
        );
        return;
      }
      if (kind === 'bank-account') {
        setMongoLinkedBankAccounts((records: FilemakerBankAccount[]): FilemakerBankAccount[] =>
          records.map((record: FilemakerBankAccount): FilemakerBankAccount => {
            if (record.id !== recordId) return record;
            const nextRecord: FilemakerBankAccount = { ...record, ...patch };
            return nextRecord;
          })
        );
        return;
      }
      if (kind === 'document') {
        setMongoLinkedDocuments((records: FilemakerDocument[]): FilemakerDocument[] =>
          records.map((record: FilemakerDocument): FilemakerDocument => {
            if (record.id !== recordId) return record;
            const nextRecord: FilemakerDocument = { ...record, ...patch };
            return nextRecord;
          })
        );
        return;
      }
      setMongoLinkedOccupations((records: FilemakerPersonOccupation[]): FilemakerPersonOccupation[] =>
        records.map((record: FilemakerPersonOccupation): FilemakerPersonOccupation => {
          if (record.id !== recordId) return record;
          const nextRecord: FilemakerPersonOccupation = { ...record, ...patch };
          return nextRecord;
        })
      );
    },
    []
  );

  const removeLinkedRecord = useCallback(
    (kind: FilemakerPersonLinkedRecordKind, recordId: string): void => {
      if (kind === 'any-param') {
        setMongoLinkedAnyParams((records: FilemakerAnyParam[]): FilemakerAnyParam[] =>
          records.filter((record: FilemakerAnyParam): boolean => record.id !== recordId)
        );
        return;
      }
      if (kind === 'any-text') {
        setMongoLinkedAnyTexts((records: FilemakerAnyText[]): FilemakerAnyText[] =>
          records.filter((record: FilemakerAnyText): boolean => record.id !== recordId)
        );
        return;
      }
      if (kind === 'bank-account') {
        setMongoLinkedBankAccounts((records: FilemakerBankAccount[]): FilemakerBankAccount[] =>
          records.filter((record: FilemakerBankAccount): boolean => record.id !== recordId)
        );
        return;
      }
      if (kind === 'document') {
        setMongoLinkedDocuments((records: FilemakerDocument[]): FilemakerDocument[] =>
          records.filter((record: FilemakerDocument): boolean => record.id !== recordId)
        );
        return;
      }
      setMongoLinkedOccupations((records: FilemakerPersonOccupation[]): FilemakerPersonOccupation[] =>
        records.filter((record: FilemakerPersonOccupation): boolean => record.id !== recordId)
      );
    },
    []
  );

  const linkedRecordUpdateMutation = createMutationV2<
    LinkedRecordPatchResponse,
    LinkedRecordUpdateVariables
  >({
    mutationKey: ['filemaker', 'persons', 'linked-records', 'update'],
    mutationFn: async (variables) => {
      const response = await fetch(
        `/api/filemaker/persons/${encodeURIComponent(variables.personId)}/linked-records/${encodeURIComponent(variables.kind)}/${encodeURIComponent(variables.recordId)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(variables.patch),
        }
      );
      if (!response.ok) throw new Error(`Failed to update linked record (${response.status}).`);
      return (await response.json()) as LinkedRecordPatchResponse;
    },
    meta: {
      source:
        'features.filemaker.hooks.useAdminFilemakerPersonEditPageState.linkedRecordUpdate',
      operation: 'update',
      resource: 'filemaker.person-linked-record',
      domain: 'files',
      description: 'Update a linked Mongo Filemaker person record.',
      errorPresentation: 'toast',
    },
  });
  const linkedRecordDeleteMutation = createMutationV2<void, LinkedRecordDeleteVariables>({
    mutationKey: ['filemaker', 'persons', 'linked-records', 'delete'],
    mutationFn: async (variables) => {
      const response = await fetch(
        `/api/filemaker/persons/${encodeURIComponent(variables.personId)}/linked-records/${encodeURIComponent(variables.kind)}/${encodeURIComponent(variables.recordId)}`,
        { method: 'DELETE' }
      );
      if (!response.ok) throw new Error(`Failed to delete linked record (${response.status}).`);
    },
    meta: {
      source:
        'features.filemaker.hooks.useAdminFilemakerPersonEditPageState.linkedRecordDelete',
      operation: 'delete',
      resource: 'filemaker.person-linked-record',
      domain: 'files',
      description: 'Delete a linked Mongo Filemaker person record.',
      errorPresentation: 'toast',
    },
  });

  const handleUpdateLinkedRecord = useCallback(
    async (
      kind: FilemakerPersonLinkedRecordKind,
      recordId: string,
      patch: FilemakerPersonLinkedRecordPatch
    ): Promise<void> => {
      if (mongoPerson === null) {
        toast('Linked record editing is only available for imported Mongo persons.', {
          variant: 'warning',
        });
        return;
      }
      setIsMongoPersonSaving(true);
      try {
        const payload = await linkedRecordUpdateMutation.mutateAsync({
          kind,
          patch,
          personId: mongoPerson.id,
          recordId,
        });
        applyLinkedRecordPatch(payload.kind, payload.recordId, payload.patch);
        toast('Linked record updated.', { variant: 'success' });
      } catch (error: unknown) {
        logClientError(error);
        toast('Failed to update linked record.', { variant: 'error' });
        throw error;
      } finally {
        setIsMongoPersonSaving(false);
      }
    },
    [applyLinkedRecordPatch, linkedRecordUpdateMutation, mongoPerson, toast]
  );

  const handleDeleteLinkedRecord = useCallback(
    async (kind: FilemakerPersonLinkedRecordKind, recordId: string): Promise<void> => {
      if (mongoPerson === null) {
        toast('Linked record deletion is only available for imported Mongo persons.', {
          variant: 'warning',
        });
        return;
      }
      setIsMongoPersonSaving(true);
      try {
        await linkedRecordDeleteMutation.mutateAsync({
          kind,
          personId: mongoPerson.id,
          recordId,
        });
        removeLinkedRecord(kind, recordId);
        toast('Linked record deleted.', { variant: 'success' });
      } catch (error: unknown) {
        logClientError(error);
        toast('Failed to delete linked record.', { variant: 'error' });
        throw error;
      } finally {
        setIsMongoPersonSaving(false);
      }
    },
    [linkedRecordDeleteMutation, mongoPerson, removeLinkedRecord, toast]
  );

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
    handleUpdateLinkedRecord,
    handleDeleteLinkedRecord,
    updateSetting: {
      isPending: updateSetting.isPending || isMongoPersonLoading || isMongoPersonSaving,
    },
    router,
  };
}
