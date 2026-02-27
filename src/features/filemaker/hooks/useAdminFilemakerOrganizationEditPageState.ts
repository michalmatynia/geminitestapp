'use client';

import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useCountries } from '@/shared/lib/internationalization/hooks/useInternationalizationQueries';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { useToast } from '@/shared/ui';

import {
  FILEMAKER_DATABASE_KEY,
  FILEMAKER_EMAIL_PARSER_PROMPT_SETTINGS_KEY,
  getFilemakerAddressById,
  getFilemakerAddressLinksForOwner,
  getFilemakerEmailsForParty,
  getFilemakerEventsForOrganization,
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
  FilemakerOrganization,
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

export type AdminFilemakerOrganizationEditPageContextValue = {
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

  const organizationId = decodeRouteParam(params['id']);

  const countriesQuery = useCountries();
  const countries = countriesQuery.data ?? [];

  const rawDatabase = settingsStore.get(FILEMAKER_DATABASE_KEY);
  const database = useMemo(
    () => parseFilemakerDatabase(rawDatabase),
    [rawDatabase]
  );

  const organization = useMemo(
    () => database.organizations.find((o) => o.id === organizationId) ?? null,
    [database.organizations, organizationId]
  );

  const [orgDraft, setOrgDraft] = useState<Partial<FilemakerOrganization>>({});
  const [editableAddresses, setEditableAddresses] = useState<EditableAddress[]>([]);
  const [emailExtractionText, setEmailExtractionText] = useState('');
  const [phoneNumberExtractionText, setPhoneNumberExtractionText] = useState('');
  const [linkedEventIds, setLinkedEventIds] = useState<string[]>([]);

  useEffect(() => {
    if (organization) {
      setOrgDraft(organization);

      const addressLinks = getFilemakerAddressLinksForOwner(database, 'organization', organization.id);
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

      const events = getFilemakerEventsForOrganization(database, organization.id);
      setLinkedEventIds(events.map((e) => e.id));
    }
  }, [organization, database]);

  const emails = useMemo(
    () => (organization ? getFilemakerEmailsForParty(database, 'organization', organization.id) : []),
    [database, organization]
  );

  const phoneNumbers = useMemo(
    () => (organization ? getFilemakerPhoneNumbersForParty(database, 'organization', organization.id) : []),
    [database, organization]
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
    if (!organization || !orgDraft.name) return;

    let nextDatabase = database;

    nextDatabase = {
      ...nextDatabase,
      organizations: nextDatabase.organizations.map((o) =>
        o.id === organization.id ? { ...o, ...orgDraft, updatedAt: new Date().toISOString() } : o
      ),
    };

    await persistDatabase(nextDatabase, 'Organization updated.');
    router.push('/admin/filemaker');
  }, [database, organization, orgDraft, persistDatabase, router]);

  const handleExtractEmails = useCallback(async (): Promise<void> => {
    if (!organization || !emailExtractionText.trim()) return;

    const promptSettings = settingsStore.get(FILEMAKER_EMAIL_PARSER_PROMPT_SETTINGS_KEY);
    const rules = parseFilemakerEmailParserRulesFromPromptSettings(promptSettings);

    const { database: nextDatabase, createdEmailCount, linkedEmailCount } =
      parseAndUpsertFilemakerEmailsForParty(database, {
        partyKind: 'organization',
        partyId: organization.id,
        text: emailExtractionText,
        parserRules: rules,
      });

    await persistDatabase(nextDatabase, `Extracted ${createdEmailCount} new emails and linked ${linkedEmailCount} total.`);
    setEmailExtractionText('');
  }, [database, organization, emailExtractionText, persistDatabase, settingsStore]);

  return {
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
