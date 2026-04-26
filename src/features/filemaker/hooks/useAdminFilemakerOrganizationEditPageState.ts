/* eslint-disable complexity, max-lines, max-lines-per-function */
'use client';

import { useRouter } from 'nextjs-toploader/app';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { CountryOption } from '@/shared/contracts/internationalization';
import { useCountries } from '@/shared/hooks/use-i18n-queries';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { useToast } from '@/shared/ui/primitives.public';

import { createClientFilemakerId, decodeRouteParam } from '../pages/filemaker-page-utils';
import {
  FILEMAKER_DATABASE_KEY,
  FILEMAKER_EMAIL_PARSER_PROMPT_SETTINGS_KEY,
  createFilemakerAddress,
  createFilemakerAddressLink,
  createFilemakerOrganization,
  createFilemakerOrganizationLegacyDemand,
  getFilemakerAddressById,
  getFilemakerAddressLinksForOwner,
  getFilemakerEmailsForParty,
  getFilemakerEventsForOrganization,
  getFilemakerPhoneNumbersForParty,
  normalizeFilemakerDatabase,
  parseAndUpsertFilemakerEmailsForParty,
  parseFilemakerEmailParserRulesFromPromptSettings,
  parseFilemakerDatabase,
  toPersistedFilemakerDatabase,
} from '../settings';

import type {
  FilemakerOrganizationHarvestProfile,
  FilemakerOrganizationImportedDemand,
} from '../filemaker-organization-imported-metadata';
import type { FilemakerPartySnapshot } from '../filemaker-party-snapshot.types';
import type { MongoFilemakerEvent } from '../pages/AdminFilemakerEventsPage.types';
import type { MongoFilemakerPerson } from '../pages/AdminFilemakerPersonsPage.types';
import type {
  FilemakerAddress,
  FilemakerEmail,
  FilemakerEvent,
  FilemakerOrganization,
  FilemakerOrganizationLegacyDemand,
  FilemakerPhoneNumber,
  FilemakerValue,
  FilemakerDatabase,
} from '../types';
import type { MongoFilemakerWebsite } from '../filemaker-websites.types';
import type { EditableAddress } from './editable-address';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { hasAddressFields, resolveCountryId } from '../pages/filemaker-page-utils';
import {
  buildFilemakerCountryList,
  buildFilemakerCountryLookup,
  resolveFilemakerCountryName,
} from '../settings/filemaker-country-options';

type PreparedOrganizationAddress = EditableAddress;
type OrganizationRecordSource = 'mongo' | 'settings' | 'none';

type MongoFilemakerOrganizationState = {
  error: string | null;
  harvestProfiles: FilemakerOrganizationHarvestProfile[];
  importedDemands: FilemakerOrganizationImportedDemand[];
  isLoading: boolean;
  linkedAddresses: FilemakerAddress[];
  linkedEmails: FilemakerEmail[];
  linkedEvents: MongoFilemakerEvent[];
  linkedPersons: MongoFilemakerPerson[];
  linkedWebsites: MongoFilemakerWebsite[];
  organization: FilemakerOrganization | null;
  relationshipSummary: FilemakerPartySnapshot | null;
  valueCatalog: FilemakerValue[];
};

type MongoFilemakerOrganizationResponse = {
  harvestProfiles?: FilemakerOrganizationHarvestProfile[];
  importedDemands?: FilemakerOrganizationImportedDemand[];
  linkedAddresses?: FilemakerAddress[];
  linkedEmails?: FilemakerEmail[];
  linkedEvents?: MongoFilemakerEvent[];
  linkedPersons?: MongoFilemakerPerson[];
  linkedWebsites?: MongoFilemakerWebsite[];
  relationshipSummary?: FilemakerPartySnapshot | null;
  organization: FilemakerOrganization;
  valueCatalog?: {
    values?: FilemakerValue[];
  };
};

const EMPTY_COUNTRIES: CountryOption[] = [];
const EMPTY_MONGO_ORGANIZATION_STATE: MongoFilemakerOrganizationState = {
  error: null,
  harvestProfiles: [],
  importedDemands: [],
  isLoading: false,
  linkedAddresses: [],
  linkedEmails: [],
  linkedEvents: [],
  linkedPersons: [],
  linkedWebsites: [],
  organization: null,
  relationshipSummary: null,
  valueCatalog: [],
};

const applyOrganizationAddresses = (
  database: FilemakerDatabase,
  organizationId: string,
  addresses: PreparedOrganizationAddress[]
): FilemakerDatabase => {
  const addressById = new Map(database.addresses.map((address) => [address.id, address]));
  addresses.forEach((address: PreparedOrganizationAddress): void => {
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

  const addressLinks = addresses.map((address: PreparedOrganizationAddress) =>
    createFilemakerAddressLink({
      id: `filemaker-address-link-organization-${organizationId}-${address.addressId}`,
      ownerKind: 'organization',
      ownerId: organizationId,
      addressId: address.addressId,
      isDefault: address.isDefault,
    })
  );

  return normalizeFilemakerDatabase({
    ...database,
    addresses: Array.from(addressById.values()),
    addressLinks: [
      ...database.addressLinks.filter(
        (link): boolean => !(link.ownerKind === 'organization' && link.ownerId === organizationId)
      ),
      ...addressLinks,
    ],
  });
};

const getLegacyDemandRowsForOrganization = (
  database: FilemakerDatabase,
  organizationId: string
): FilemakerOrganizationLegacyDemand[] =>
  database.organizationLegacyDemands.filter(
    (demand: FilemakerOrganizationLegacyDemand): boolean =>
      demand.organizationId === organizationId
  );

const toLegacyDemandRows = (
  organizationId: string,
  importedDemands: FilemakerOrganizationImportedDemand[]
): FilemakerOrganizationLegacyDemand[] =>
  importedDemands
    .filter((demand: FilemakerOrganizationImportedDemand): boolean => demand.valueIds.length > 0)
    .map((demand: FilemakerOrganizationImportedDemand): FilemakerOrganizationLegacyDemand =>
      createFilemakerOrganizationLegacyDemand({
        id: demand.id,
        organizationId,
        valueIds: demand.valueIds,
        legacyUuid: demand.legacyUuid,
        createdAt: demand.createdAt,
        updatedAt: demand.updatedAt,
      })
    );

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
  countryId: resolveCountryId(
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

const applyOrganizationLegacyDemands = (
  database: FilemakerDatabase,
  organizationId: string,
  rows: FilemakerOrganizationLegacyDemand[]
): FilemakerDatabase => {
  const now = new Date().toISOString();
  const nextRows = rows
    .filter((row: FilemakerOrganizationLegacyDemand): boolean => row.valueIds.length > 0)
    .map((row: FilemakerOrganizationLegacyDemand): FilemakerOrganizationLegacyDemand =>
      createFilemakerOrganizationLegacyDemand({
        id: row.id,
        organizationId,
        valueIds: row.valueIds,
        legacyUuid: row.legacyUuid,
        createdAt: row.createdAt ?? now,
        updatedAt: now,
      })
    );

  return normalizeFilemakerDatabase({
    ...database,
    organizationLegacyDemands: [
      ...database.organizationLegacyDemands.filter(
        (row: FilemakerOrganizationLegacyDemand): boolean =>
          row.organizationId !== organizationId
      ),
      ...nextRows,
    ],
  });
};

const parseMongoFilemakerOrganizationResponse = async (
  response: Response
): Promise<MongoFilemakerOrganizationResponse> => {
  if (!response.ok) {
    throw new Error(`Failed to load Mongo organization (${response.status}).`);
  }
  return (await response.json()) as MongoFilemakerOrganizationResponse;
};

const toLoadedMongoOrganizationState = (
  response: MongoFilemakerOrganizationResponse
): MongoFilemakerOrganizationState => ({
  error: null,
  harvestProfiles: response.harvestProfiles ?? [],
  importedDemands: response.importedDemands ?? [],
  isLoading: false,
  linkedAddresses: response.linkedAddresses ?? [],
  linkedEmails: response.linkedEmails ?? [],
  linkedEvents: response.linkedEvents ?? [],
  linkedPersons: response.linkedPersons ?? [],
  linkedWebsites: response.linkedWebsites ?? [],
  organization: response.organization,
  relationshipSummary: response.relationshipSummary ?? null,
  valueCatalog: response.valueCatalog?.values ?? [],
});

export type AdminFilemakerOrganizationEditPageContextValue = {
  isCreateMode: boolean;
  organization: FilemakerOrganization | null;
  orgDraft: Partial<FilemakerOrganization>;
  setOrgDraft: (value: React.SetStateAction<Partial<FilemakerOrganization>>) => void;
  editableAddresses: EditableAddress[];
  setEditableAddresses: (value: React.SetStateAction<EditableAddress[]>) => void;
  emailExtractionText: string;
  setEmailExtractionText: (value: React.SetStateAction<string>) => void;
  phoneNumberExtractionText: string;
  setPhoneNumberExtractionText: (value: React.SetStateAction<string>) => void;
  linkedEventIds: string[];
  setLinkedEventIds: (value: React.SetStateAction<string[]>) => void;
  legacyDemandRows: FilemakerOrganizationLegacyDemand[];
  setLegacyDemandRows: (
    value: React.SetStateAction<FilemakerOrganizationLegacyDemand[]>
  ) => void;
  emails: FilemakerEmail[];
  linkedEvents: FilemakerEvent[];
  linkedPersons: MongoFilemakerPerson[];
  linkedWebsites: MongoFilemakerWebsite[];
  harvestProfiles: FilemakerOrganizationHarvestProfile[];
  importedDemands: FilemakerOrganizationImportedDemand[];
  relationshipSummary: FilemakerPartySnapshot | null;
  valueCatalog: FilemakerValue[];
  phoneNumbers: FilemakerPhoneNumber[];
  countries: CountryOption[];
  database: FilemakerDatabase;
  handleSave: () => Promise<void>;
  handleExtractEmails: () => Promise<void>;
  updateSetting: { isPending: boolean };
  router: AppRouterInstance;
  isLoading: boolean;
  organizationSource: OrganizationRecordSource;
};

function useMongoFilemakerOrganization(
  organizationId: string,
  enabled: boolean
): MongoFilemakerOrganizationState {
  const [state, setState] = useState<MongoFilemakerOrganizationState>(
    EMPTY_MONGO_ORGANIZATION_STATE
  );

  useEffect(() => {
    if (!enabled) {
      setState(EMPTY_MONGO_ORGANIZATION_STATE);
      return undefined;
    }
    const controller = new AbortController();
    setState((current: MongoFilemakerOrganizationState) => ({
      ...current,
      error: null,
      isLoading: true,
    }));
    fetch(`/api/filemaker/organizations/${encodeURIComponent(organizationId)}`, {
      signal: controller.signal,
    })
      .then(parseMongoFilemakerOrganizationResponse)
      .then((response: MongoFilemakerOrganizationResponse): void => {
        setState(toLoadedMongoOrganizationState(response));
      })
      .catch((error: unknown): void => {
        if (controller.signal.aborted) return;
        setState({
          error: error instanceof Error ? error.message : 'Failed to load Mongo organization.',
          harvestProfiles: [],
          importedDemands: [],
          isLoading: false,
          linkedAddresses: [],
          linkedEmails: [],
          linkedEvents: [],
          linkedPersons: [],
          linkedWebsites: [],
          organization: null,
          relationshipSummary: null,
          valueCatalog: [],
        });
      });

    return () => {
      controller.abort();
    };
  }, [enabled, organizationId]);

  return state;
}

const resolveOrganizationSource = (input: {
  mongoOrganization: FilemakerOrganization | null;
  settingsOrganization: FilemakerOrganization | null;
}): OrganizationRecordSource => {
  if (input.settingsOrganization !== null) return 'settings';
  if (input.mongoOrganization !== null) return 'mongo';
  return 'none';
};

const resolveOrganizationEmails = (input: {
  database: FilemakerDatabase;
  linkedMongoEmails: FilemakerEmail[];
  organization: FilemakerOrganization | null;
  source: OrganizationRecordSource;
}): FilemakerEmail[] => {
  if (input.source === 'mongo') return input.linkedMongoEmails;
  if (input.organization === null) return [];
  return getFilemakerEmailsForParty(input.database, 'organization', input.organization.id);
};

export function useAdminFilemakerOrganizationEditPageState(): AdminFilemakerOrganizationEditPageContextValue {
  const params = useParams();
  const router = useRouter();
  const settingsStore = useSettingsStore();
  const updateSetting = useUpdateSetting();
  const { toast } = useToast();

  const organizationId = decodeRouteParam(params['organizationId']);
  const isCreateMode = organizationId === 'new';

  const countriesQuery = useCountries();
  const rawCountries = countriesQuery.data ?? EMPTY_COUNTRIES;
  const countriesKey = rawCountries
    .map((country: CountryOption): string => `${country.id}:${country.name}:${country.code}`)
    .join('|');
  const countries = useMemo(() => buildFilemakerCountryList(rawCountries), [countriesKey]);
  const countryById = useMemo(
    () => buildFilemakerCountryLookup(countries),
    [countries]
  );

  const rawDatabase = settingsStore.get(FILEMAKER_DATABASE_KEY);
  const database = useMemo(() => parseFilemakerDatabase(rawDatabase), [rawDatabase]);

  const settingsOrganization = useMemo(
    () =>
      isCreateMode
        ? null
        : (database.organizations.find((o) => o.id === organizationId) ?? null),
    [database.organizations, isCreateMode, organizationId]
  );
  const shouldLoadMongoOrganization =
    !isCreateMode &&
    (settingsOrganization === null ||
      (settingsOrganization.legacyUuid?.trim().length ?? 0) > 0);
  const mongoOrganizationLookupId =
    settingsOrganization?.legacyUuid !== undefined &&
    settingsOrganization.legacyUuid.trim().length > 0
      ? settingsOrganization.legacyUuid
      : organizationId;
  const mongoOrganizationState = useMongoFilemakerOrganization(
    mongoOrganizationLookupId,
    shouldLoadMongoOrganization
  );
  const organization = settingsOrganization ?? mongoOrganizationState.organization;
  const organizationSource = resolveOrganizationSource({
    mongoOrganization: mongoOrganizationState.organization,
    settingsOrganization,
  });
  const isLoading =
    settingsStore.isLoading ||
    (!isCreateMode && settingsOrganization === null && mongoOrganizationState.isLoading);

  const [orgDraft, setOrgDraft] = useState<Partial<FilemakerOrganization>>({});
  const [editableAddresses, setEditableAddresses] = useState<EditableAddress[]>([]);
  const [emailExtractionText, setEmailExtractionText] = useState('');
  const [phoneNumberExtractionText, setPhoneNumberExtractionText] = useState('');
  const [linkedEventIds, setLinkedEventIds] = useState<string[]>([]);
  const [legacyDemandRows, setLegacyDemandRows] = useState<FilemakerOrganizationLegacyDemand[]>([]);

  useEffect(() => {
    if (isCreateMode) {
      setOrgDraft({
        name: '',
        tradingName: '',
        taxId: '',
        krs: '',
      });
      setEditableAddresses([]);
      setLinkedEventIds([]);
      setLegacyDemandRows([]);
      return;
    }
    if (organization) {
      setOrgDraft(organization);

      const addressLinks = getFilemakerAddressLinksForOwner(
        database,
        'organization',
        organization.id
      );
      const settingsAddresses = addressLinks.map((link) => {
        const addr = getFilemakerAddressById(database, link.addressId);
        return {
          addressId: link.addressId,
          street: addr?.street ?? '',
          streetNumber: addr?.streetNumber ?? '',
          city: addr?.city ?? '',
          postalCode: addr?.postalCode ?? '',
          countryId: resolveCountryId(
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
      if (settingsAddresses.length > 0 || organizationSource !== 'mongo') {
        setEditableAddresses(settingsAddresses);
      } else {
        const mongoDefaultAddressId = organization.addressId;
        const mongoAddresses = mongoOrganizationState.linkedAddresses.map(
          (address: FilemakerAddress): EditableAddress =>
            toEditableAddress(address, {
              countries,
              countryById,
              isDefault: address.id === mongoDefaultAddressId,
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

      const events = getFilemakerEventsForOrganization(database, organization.id);
      setLinkedEventIds(
        events.length > 0
          ? events.map((e) => e.id)
          : mongoOrganizationState.linkedEvents.map((e) => e.id)
      );
      const settingsDemandRows = getLegacyDemandRowsForOrganization(database, organization.id);
      setLegacyDemandRows(
        settingsDemandRows.length > 0
          ? settingsDemandRows
          : toLegacyDemandRows(organization.id, mongoOrganizationState.importedDemands)
      );
    }
  }, [
    countries,
    countriesKey,
    countryById,
    isCreateMode,
    mongoOrganizationState.importedDemands,
    mongoOrganizationState.linkedAddresses,
    mongoOrganizationState.linkedEvents,
    organization,
    organizationSource,
    database,
  ]);

  const emails = useMemo(
    () =>
      resolveOrganizationEmails({
        database,
        linkedMongoEmails: mongoOrganizationState.linkedEmails,
        organization,
        source: organizationSource,
      }),
    [database, mongoOrganizationState.linkedEmails, organization, organizationSource]
  );
  const linkedEvents = useMemo(
    (): FilemakerEvent[] => {
      const settingsEvents = organization
        ? getFilemakerEventsForOrganization(database, organization.id)
        : [];
      return settingsEvents.length > 0 ? settingsEvents : mongoOrganizationState.linkedEvents;
    },
    [database, mongoOrganizationState.linkedEvents, organization]
  );
  const linkedPersons = mongoOrganizationState.linkedPersons;
  const linkedWebsites = mongoOrganizationState.linkedWebsites;
  const harvestProfiles = mongoOrganizationState.harvestProfiles;
  const importedDemands = mongoOrganizationState.importedDemands;
  const relationshipSummary = mongoOrganizationState.relationshipSummary;
  const valueCatalog =
    mongoOrganizationState.valueCatalog.length > 0
      ? mongoOrganizationState.valueCatalog
      : database.values;

  const phoneNumbers = useMemo(
    () =>
      organization
        ? getFilemakerPhoneNumbersForParty(database, 'organization', organization.id)
        : [],
    [database, organization]
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
    const nextName = orgDraft.name?.trim() ?? '';
    if (nextName.length === 0) {
      toast('Organization name is required.', { variant: 'warning' });
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
        !hasAddressFields(
          address.street,
          address.streetNumber,
          address.city,
          address.postalCode,
          address.countryId
        )
    );
    if (hasInvalidAddress) {
      toast('Every linked address requires street, street number, city, postal code, and country.', {
        variant: 'error',
      });
      return;
    }
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

    if (isCreateMode) {
      const now = new Date().toISOString();
      const newOrganizationId = createClientFilemakerId('organization');
      const newOrganization = createFilemakerOrganization({
        id: newOrganizationId,
        name: nextName,
        addressId: defaultAddress?.addressId ?? '',
        street: defaultAddress?.street ?? '',
        streetNumber: defaultAddress?.streetNumber ?? '',
        city: defaultAddress?.city ?? '',
        postalCode: defaultAddress?.postalCode ?? '',
        country: defaultAddress?.country ?? '',
        countryId: defaultAddress?.countryId ?? '',
        tradingName: orgDraft.tradingName ?? '',
        taxId: orgDraft.taxId ?? '',
        krs: orgDraft.krs ?? '',
        cooperationStatus: orgDraft.cooperationStatus ?? '',
        establishedDate: orgDraft.establishedDate ?? '',
        createdAt: now,
        updatedAt: now,
      });
      nextDatabase = {
        ...nextDatabase,
        organizations: [...nextDatabase.organizations, newOrganization],
      };
      nextDatabase = applyOrganizationAddresses(
        nextDatabase,
        newOrganizationId,
        normalizedAddresses
      );
      nextDatabase = applyOrganizationLegacyDemands(
        nextDatabase,
        newOrganizationId,
        legacyDemandRows
      );

      await persistDatabase(nextDatabase, 'Organization created.');
      router.push('/admin/filemaker/organizations');
      return;
    }

    if (organization === null) return;

    if (organizationSource === 'mongo') {
      try {
        const response = await fetch(
          `/api/filemaker/organizations/${encodeURIComponent(organization.id)}`,
          {
            body: JSON.stringify({
              addressId: defaultAddress?.addressId ?? orgDraft.addressId ?? '',
              city: defaultAddress?.city ?? orgDraft.city ?? '',
              cooperationStatus: orgDraft.cooperationStatus,
              country: defaultAddress?.country ?? orgDraft.country ?? '',
              countryId: defaultAddress?.countryId ?? orgDraft.countryId ?? '',
              establishedDate: orgDraft.establishedDate,
              addresses: normalizedAddresses,
              krs: orgDraft.krs,
              name: nextName,
              postalCode: defaultAddress?.postalCode ?? orgDraft.postalCode ?? '',
              street: defaultAddress?.street ?? orgDraft.street ?? '',
              streetNumber: defaultAddress?.streetNumber ?? orgDraft.streetNumber ?? '',
              taxId: orgDraft.taxId,
              tradingName: orgDraft.tradingName,
            }),
            headers: { 'Content-Type': 'application/json' },
            method: 'PATCH',
          }
        );
        if (!response.ok) {
          throw new Error(`Failed to save Mongo organization (${response.status}).`);
        }
        toast('Organization updated.', { variant: 'success' });
        router.push('/admin/filemaker/organizations');
      } catch (error: unknown) {
        logClientError(error);
        toast('Failed to save changes.', { variant: 'error' });
      }
      return;
    }

    nextDatabase = applyOrganizationAddresses(nextDatabase, organization.id, normalizedAddresses);
    nextDatabase = {
      ...nextDatabase,
      organizations: nextDatabase.organizations.map((o) =>
        o.id === organization.id
          ? {
              ...o,
              ...orgDraft,
              addressId: defaultAddress?.addressId ?? '',
              street: defaultAddress?.street ?? '',
              streetNumber: defaultAddress?.streetNumber ?? '',
              city: defaultAddress?.city ?? '',
              postalCode: defaultAddress?.postalCode ?? '',
              country: defaultAddress?.country ?? '',
              countryId: defaultAddress?.countryId ?? '',
              updatedAt: new Date().toISOString(),
            }
          : o
      ),
    };
    nextDatabase = applyOrganizationLegacyDemands(
      nextDatabase,
      organization.id,
      legacyDemandRows
    );

    await persistDatabase(nextDatabase, 'Organization updated.');
    router.push('/admin/filemaker/organizations');
  }, [
    countries,
    countryById,
    database,
    editableAddresses,
    isCreateMode,
    legacyDemandRows,
    organization,
    organizationSource,
    orgDraft,
    persistDatabase,
    router,
    toast,
  ]);

  const handleExtractEmails = useCallback(async (): Promise<void> => {
    if (organization === null || emailExtractionText.trim().length === 0) return;

    const promptSettings = settingsStore.get(FILEMAKER_EMAIL_PARSER_PROMPT_SETTINGS_KEY);
    const rules = parseFilemakerEmailParserRulesFromPromptSettings(promptSettings);

    const {
      database: nextDatabase,
      createdEmailCount,
      linkedEmailCount,
    } = parseAndUpsertFilemakerEmailsForParty(database, {
      partyKind: 'organization',
      partyId: organization.id,
      text: emailExtractionText,
      parserRules: rules,
    });

    await persistDatabase(
      nextDatabase,
      `Extracted ${createdEmailCount} new emails and linked ${linkedEmailCount} total.`
    );
    setEmailExtractionText('');
  }, [database, organization, emailExtractionText, persistDatabase, settingsStore]);

  return {
    isCreateMode,
    organization,
    orgDraft,
    setOrgDraft,
    editableAddresses,
    setEditableAddresses,
    emailExtractionText,
    setEmailExtractionText,
    phoneNumberExtractionText,
    setPhoneNumberExtractionText,
    linkedEventIds,
    setLinkedEventIds,
    legacyDemandRows,
    setLegacyDemandRows,
    emails,
    linkedEvents,
    linkedPersons,
    linkedWebsites,
    harvestProfiles,
    importedDemands,
    relationshipSummary,
    valueCatalog,
    phoneNumbers,
    countries,
    database,
    handleSave,
    handleExtractEmails,
    updateSetting,
    router,
    isLoading,
    organizationSource,
  };
}
