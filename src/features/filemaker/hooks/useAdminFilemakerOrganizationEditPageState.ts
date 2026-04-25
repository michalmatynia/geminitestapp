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
  FilemakerEmail,
  FilemakerOrganization,
  FilemakerPhoneNumber,
  FilemakerDatabase,
} from '../types';
import type { EditableAddress } from './editable-address';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { hasAddressFields, resolveCountryId } from '../pages/filemaker-page-utils';

type PreparedOrganizationAddress = EditableAddress;

const EMPTY_COUNTRIES: CountryOption[] = [];

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
        createdAt: existing?.createdAt,
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
  emails: FilemakerEmail[];
  phoneNumbers: FilemakerPhoneNumber[];
  countries: CountryOption[];
  database: FilemakerDatabase;
  handleSave: () => Promise<void>;
  handleExtractEmails: () => Promise<void>;
  updateSetting: { isPending: boolean };
  router: AppRouterInstance;
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
  const countries = countriesQuery.data ?? EMPTY_COUNTRIES;
  const countriesKey = countries
    .map((country: CountryOption): string => `${country.id}:${country.name}:${country.code}`)
    .join('|');
  const countryById = useMemo(
    () => new Map(countries.map((country: CountryOption) => [country.id, country])),
    [countriesKey]
  );

  const rawDatabase = settingsStore.get(FILEMAKER_DATABASE_KEY);
  const database = useMemo(() => parseFilemakerDatabase(rawDatabase), [rawDatabase]);

  const organization = useMemo(
    () =>
      isCreateMode
        ? null
        : (database.organizations.find((o) => o.id === organizationId) ?? null),
    [database.organizations, isCreateMode, organizationId]
  );

  const [orgDraft, setOrgDraft] = useState<Partial<FilemakerOrganization>>({});
  const [editableAddresses, setEditableAddresses] = useState<EditableAddress[]>([]);
  const [emailExtractionText, setEmailExtractionText] = useState('');
  const [phoneNumberExtractionText, setPhoneNumberExtractionText] = useState('');
  const [linkedEventIds, setLinkedEventIds] = useState<string[]>([]);

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
      return;
    }
    if (organization) {
      setOrgDraft(organization);

      const addressLinks = getFilemakerAddressLinksForOwner(
        database,
        'organization',
        organization.id
      );
      const addresses = addressLinks.map((link) => {
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
          country: addr?.country ?? '',
          isDefault: link.isDefault,
        };
      });
      setEditableAddresses(addresses);

      const events = getFilemakerEventsForOrganization(database, organization.id);
      setLinkedEventIds(events.map((e) => e.id));
    }
  }, [countriesKey, isCreateMode, organization, database]);

  const emails = useMemo(
    () =>
      organization ? getFilemakerEmailsForParty(database, 'organization', organization.id) : [],
    [database, organization]
  );

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
        country: countryById.get(normalizedCountryId)?.name ?? address.country.trim(),
        isDefault: address.isDefault,
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
      const organizationId = createClientFilemakerId('organization');
      const newOrganization = createFilemakerOrganization({
        id: organizationId,
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
        createdAt: now,
        updatedAt: now,
      });
      nextDatabase = {
        ...nextDatabase,
        organizations: [...nextDatabase.organizations, newOrganization],
      };
      nextDatabase = applyOrganizationAddresses(nextDatabase, organizationId, normalizedAddresses);

      await persistDatabase(nextDatabase, 'Organization created.');
      router.push('/admin/filemaker/organizations');
      return;
    }

    if (organization === null) return;

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

    await persistDatabase(nextDatabase, 'Organization updated.');
    router.push('/admin/filemaker/organizations');
  }, [
    countryById,
    database,
    editableAddresses,
    isCreateMode,
    organization,
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
