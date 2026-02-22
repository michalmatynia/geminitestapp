'use client';

import { useParams, useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useCountries } from '@/features/internationalization/hooks/useInternationalizationQueries';
import type { CountryOption } from '@/shared/contracts/internationalization';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import {
  Badge,
  Button,
  Checkbox,
  FormSection,
  FormField,
  Input,
  SectionHeader,
  SelectSimple,
  Textarea,
  useToast,
  FormActions,
  Breadcrumbs,
} from '@/shared/ui';

import {
  createFilemakerAddress,
  createFilemakerAddressLink,
  createFilemakerOrganization,
  FILEMAKER_DATABASE_KEY,
  FILEMAKER_EMAIL_PARSER_PROMPT_SETTINGS_KEY,
  formatFilemakerAddress,
  getFilemakerAddressById,
  getFilemakerAddressLinksForOwner,
  getFilemakerEmailsForParty,
  getFilemakerEventsForOrganization,
  getFilemakerPhoneNumbersForParty,
  linkFilemakerEventToOrganization,
  normalizeFilemakerDatabase,
  parseAndUpsertFilemakerEmailsForParty,
  parseFilemakerEmailParserRulesFromPromptSettings,
  parseFilemakerPhoneValidationRulesFromPromptSettings,
  parseFilemakerDatabase,
  upsertFilemakerEmailsForParty,
  upsertFilemakerPhoneNumbersForParty,
} from '../settings';
import {
  decodeRouteParam,
  formatTimestamp,
  hasAddressFields,
  resolveCountryId,
} from './filemaker-page-utils';

import type {
  FilemakerEmail,
  FilemakerEvent,
  FilemakerOrganization,
  FilemakerPhoneNumber,
} from '../types';

type EditableAddress = {
  addressId: string;
  street: string;
  streetNumber: string;
  city: string;
  postalCode: string;
  countryId: string;
  country: string;
  isDefault: boolean;
};

const createId = (prefix: string): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
};

export function AdminFilemakerOrganizationEditPage(): React.JSX.Element {
  const params = useParams();
  const router = useRouter();
  const settingsStore = useSettingsStore();
  const updateSetting = useUpdateSetting();
  const { toast } = useToast();

  const countriesQuery = useCountries();
  const countries = countriesQuery.data ?? [];
  const countryById = useMemo(
    () => new Map(countries.map((country: CountryOption) => [country.id, country])),
    [countries]
  );
  const countryOptions = useMemo(
    () =>
      countries.map((country: CountryOption) => ({
        value: country.id,
        label: country.name,
        description: country.code,
      })),
    [countries]
  );

  const organizationId = useMemo(
    () => decodeRouteParam(params['organizationId']),
    [params]
  );

  const rawDatabase = settingsStore.get(FILEMAKER_DATABASE_KEY);
  const database = useMemo(() => parseFilemakerDatabase(rawDatabase), [rawDatabase]);
  const rawPromptSettings = settingsStore.get(FILEMAKER_EMAIL_PARSER_PROMPT_SETTINGS_KEY);
  const parserRules = useMemo(
    () => parseFilemakerEmailParserRulesFromPromptSettings(rawPromptSettings),
    [rawPromptSettings]
  );
  const phoneValidationRules = useMemo(
    () => parseFilemakerPhoneValidationRulesFromPromptSettings(rawPromptSettings),
    [rawPromptSettings]
  );
  const organization = useMemo(
    () =>
      database.organizations.find(
        (entry: FilemakerOrganization): boolean => entry.id === organizationId
      ) ?? null,
    [database.organizations, organizationId]
  );
  const linkedEmails = useMemo(
    (): FilemakerEmail[] =>
      organization
        ? getFilemakerEmailsForParty(database, 'organization', organization.id)
        : [],
    [database, organization]
  );
  const linkedPhoneNumbers = useMemo(
    (): FilemakerPhoneNumber[] =>
      organization
        ? getFilemakerPhoneNumbersForParty(database, 'organization', organization.id)
        : [],
    [database, organization]
  );
  const events = useMemo(
    (): FilemakerEvent[] =>
      [...database.events].sort((left: FilemakerEvent, right: FilemakerEvent) =>
        left.eventName.localeCompare(right.eventName)
      ),
    [database.events]
  );
  const linkedEvents = useMemo(
    (): FilemakerEvent[] =>
      organization
        ? getFilemakerEventsForOrganization(database, organization.id)
        : [],
    [database, organization]
  );

  const [name, setName] = useState('');
  const [addresses, setAddresses] = useState<EditableAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [linkedEventIds, setLinkedEventIds] = useState<string[]>([]);
  const [phoneValue, setPhoneValue] = useState('');
  const [emailValue, setEmailValue] = useState('');
  const [emailParserText, setEmailParserText] = useState('');
  const [hydratedOrganizationId, setHydratedOrganizationId] = useState<string | null>(null);

  useEffect(() => {
    if (!organization) return;
    if (hydratedOrganizationId === organization.id) return;
    setName(organization.name);

    const links = getFilemakerAddressLinksForOwner(
      database,
      'organization',
      organization.id
    );
    const linkedAddresses: EditableAddress[] = links
      .map((link): EditableAddress | null => {
        const address = getFilemakerAddressById(database, link.addressId);
        if (!address) return null;
        return {
          addressId: address.id,
          street: address.street,
          streetNumber: address.streetNumber,
          city: address.city,
          postalCode: address.postalCode,
          countryId: resolveCountryId(
            address.countryId,
            address.country,
            countries,
            countryById
          ),
          country: address.country,
          isDefault: link.isDefault,
        };
      })
      .filter((entry: EditableAddress | null): entry is EditableAddress => Boolean(entry));

    const nextAddresses = linkedAddresses.length > 0
      ? linkedAddresses
      : [
        {
          addressId: organization.addressId || createId('address'),
          street: organization.street,
          streetNumber: organization.streetNumber,
          city: organization.city,
          postalCode: organization.postalCode,
          countryId: resolveCountryId(
            organization.countryId,
            organization.country,
            countries,
            countryById
          ),
          country: organization.country,
          isDefault: true,
        },
      ];
    let defaultAddressId =
      nextAddresses.find((entry: EditableAddress): boolean => entry.isDefault)?.addressId ??
      '';
    if (!defaultAddressId && nextAddresses[0]) {
      nextAddresses[0] = {
        ...nextAddresses[0],
        isDefault: true,
      };
      defaultAddressId = nextAddresses[0].addressId;
    }

    setAddresses(nextAddresses);
    setSelectedAddressId(defaultAddressId || nextAddresses[0]?.addressId || '');
    setLinkedEventIds(
      database.eventOrganizationLinks
        .filter((link): boolean => link.organizationId === organization.id)
        .map((link) => link.eventId)
    );
    setHydratedOrganizationId(organization.id);
  }, [
    countries,
    countryById,
    database,
    database.eventOrganizationLinks,
    hydratedOrganizationId,
    organization
  ]);

  const selectedAddress = useMemo(
    (): EditableAddress | null =>
      addresses.find(
        (entry: EditableAddress): boolean => entry.addressId === selectedAddressId
      ) ?? addresses[0] ?? null,
    [addresses, selectedAddressId]
  );
  const defaultAddress = useMemo(
    (): EditableAddress | null =>
      addresses.find((entry: EditableAddress): boolean => entry.isDefault) ?? null,
    [addresses]
  );

  const updateSelectedAddress = useCallback(
    (patch: Partial<EditableAddress>): void => {
      const targetId = selectedAddress?.addressId || selectedAddressId;
      if (!targetId) return;
      setAddresses((previous: EditableAddress[]) =>
        previous.map((entry: EditableAddress): EditableAddress =>
          entry.addressId === targetId
            ? {
              ...entry,
              ...patch,
            }
            : entry
        )
      );
    },
    [selectedAddress, selectedAddressId]
  );

  const handleAddAddress = useCallback((): void => {
    const nextId = createId('address');
    setAddresses((previous: EditableAddress[]) => [
      ...previous,
      {
        addressId: nextId,
        street: '',
        streetNumber: '',
        city: '',
        postalCode: '',
        countryId: '',
        country: '',
        isDefault: previous.length === 0,
      },
    ]);
    setSelectedAddressId(nextId);
  }, []);

  const handleRemoveSelectedAddress = useCallback((): void => {
    if (!selectedAddress) {
      toast('Select an address to remove.', { variant: 'error' });
      return;
    }
    if (addresses.length <= 1) {
      toast('Organization requires at least one address.', { variant: 'error' });
      return;
    }

    setAddresses((previous: EditableAddress[]) => {
      const remaining = previous.filter(
        (entry: EditableAddress): boolean =>
          entry.addressId !== selectedAddress.addressId
      );
      if (remaining.length === 0) return remaining;
      if (!remaining.some((entry: EditableAddress): boolean => entry.isDefault)) {
        const [first, ...rest] = remaining;
        if (!first) return remaining;
        return [{ ...first, isDefault: true }, ...rest];
      }
      return remaining;
    });
    setSelectedAddressId((previous: string) => {
      if (previous !== selectedAddress.addressId) return previous;
      const fallback = addresses.find(
        (entry: EditableAddress): boolean =>
          entry.addressId !== selectedAddress.addressId
      );
      return fallback?.addressId ?? '';
    });
  }, [addresses, selectedAddress, toast]);

  const handleSetDefaultSelectedAddress = useCallback((): void => {
    if (!selectedAddress) {
      toast('Select an address first.', { variant: 'error' });
      return;
    }
    setAddresses((previous: EditableAddress[]) =>
      previous.map((entry: EditableAddress): EditableAddress => ({
        ...entry,
        isDefault: entry.addressId === selectedAddress.addressId,
      }))
    );
  }, [selectedAddress, toast]);

  const handleSave = useCallback(async (): Promise<void> => {
    if (!organization) {
      toast('Organization was not found.', { variant: 'error' });
      return;
    }

    const normalizedName = name.trim();
    if (!normalizedName) {
      toast('Organization requires a name.', { variant: 'error' });
      return;
    }

    if (addresses.length === 0) {
      toast('Organization requires at least one address.', { variant: 'error' });
      return;
    }

    const preparedAddresses = addresses.map((address: EditableAddress) => {
      const normalizedStreet = address.street.trim();
      const normalizedStreetNumber = address.streetNumber.trim();
      const normalizedCity = address.city.trim();
      const normalizedPostalCode = address.postalCode.trim();
      const normalizedCountryId = address.countryId.trim();
      const normalizedCountry =
        countryById.get(normalizedCountryId)?.name ?? address.country.trim();
      return {
        addressId: address.addressId.trim(),
        street: normalizedStreet,
        streetNumber: normalizedStreetNumber,
        city: normalizedCity,
        postalCode: normalizedPostalCode,
        countryId: normalizedCountryId,
        country: normalizedCountry,
        isDefault: address.isDefault,
      };
    });

    const hasInvalidAddress = preparedAddresses.some((address): boolean =>
      !hasAddressFields(
        address.street,
        address.streetNumber,
        address.city,
        address.postalCode,
        address.countryId
      )
    );
    if (hasInvalidAddress) {
      toast(
        'Every linked address requires street, street number, city, postal code, and country.',
        { variant: 'error' }
      );
      return;
    }

    const defaultAddressId =
      preparedAddresses.find((address): boolean => address.isDefault)?.addressId ??
      preparedAddresses[0]?.addressId ??
      '';
    if (!defaultAddressId) {
      toast('Organization requires a default address.', { variant: 'error' });
      return;
    }
    const normalizedAddresses = preparedAddresses.map((address) => ({
      ...address,
      isDefault: address.addressId === defaultAddressId,
    }));
    const defaultAddress = normalizedAddresses.find(
      (address): boolean => address.addressId === defaultAddressId
    );
    if (!defaultAddress) {
      toast('Organization requires a default address.', { variant: 'error' });
      return;
    }

    const addressesById = new Map(
      database.addresses.map((address) => [address.id, address])
    );
    normalizedAddresses.forEach((address): void => {
      addressesById.set(
        address.addressId,
        createFilemakerAddress({
          id: address.addressId,
          street: address.street,
          streetNumber: address.streetNumber,
          city: address.city,
          postalCode: address.postalCode,
          country: address.country,
          countryId: address.countryId,
          updatedAt: new Date().toISOString(),
        })
      );
    });

    const ownerAddressLinks = normalizedAddresses.map((address) =>
      createFilemakerAddressLink({
        id: `filemaker-address-link-organization-${organization.id}-${address.addressId}`,
        ownerKind: 'organization',
        ownerId: organization.id,
        addressId: address.addressId,
        isDefault: address.isDefault,
      })
    );

    const detailsUpdatedDatabase = normalizeFilemakerDatabase({
      ...database,
      organizations: database.organizations.map((entry: FilemakerOrganization) =>
        entry.id === organization.id
          ? createFilemakerOrganization({
            id: entry.id,
            name: normalizedName,
            addressId: defaultAddress.addressId,
            street: defaultAddress.street,
            streetNumber: defaultAddress.streetNumber,
            city: defaultAddress.city,
            postalCode: defaultAddress.postalCode,
            country: defaultAddress.country,
            countryId: defaultAddress.countryId,
            createdAt: entry.createdAt,
            updatedAt: new Date().toISOString(),
          })
          : entry
      ),
      addresses: Array.from(addressesById.values()),
      addressLinks: [
        ...database.addressLinks.filter(
          (link): boolean =>
            !(link.ownerKind === 'organization' && link.ownerId === organization.id)
        ),
        ...ownerAddressLinks,
      ],
      eventOrganizationLinks: database.eventOrganizationLinks.filter(
        (link): boolean => link.organizationId !== organization.id
      ),
    });
    let nextDatabase = detailsUpdatedDatabase;

    linkedEventIds.forEach((eventId: string): void => {
      nextDatabase = linkFilemakerEventToOrganization(nextDatabase, {
        eventId,
        organizationId: organization.id,
      }).database;
    });

    try {
      await updateSetting.mutateAsync({
        key: FILEMAKER_DATABASE_KEY,
        value: JSON.stringify(nextDatabase),
      });
      toast('Organization updated.', { variant: 'success' });
      router.push('/admin/filemaker/organizations');
    } catch (error: unknown) {
      toast(
        error instanceof Error ? error.message : 'Failed to update organization.',
        { variant: 'error' }
      );
    }
  }, [
    addresses,
    countryById,
    database,
    linkedEventIds,
    name,
    organization,
    router,
    toast,
    updateSetting,
  ]);

  const handleAddPhoneNumber = useCallback(async (): Promise<void> => {
    if (!organization) {
      toast('Organization was not found.', { variant: 'error' });
      return;
    }

    const result = upsertFilemakerPhoneNumbersForParty(database, {
      partyKind: 'organization',
      partyId: organization.id,
      phoneNumbers: [phoneValue],
      validationRules: phoneValidationRules,
    });

    if (!result.partyFound) {
      toast('Organization was not found.', { variant: 'error' });
      return;
    }
    if (result.appliedPhoneNumbers.length === 0) {
      toast('Provide a valid phone number to add.', { variant: 'error' });
      return;
    }
    if (result.createdPhoneNumberCount === 0 && result.linkedPhoneNumberCount === 0) {
      toast('Phone number already exists and is already linked to this organization.', {
        variant: 'warning',
      });
      return;
    }

    try {
      await updateSetting.mutateAsync({
        key: FILEMAKER_DATABASE_KEY,
        value: JSON.stringify(result.database),
      });
      setPhoneValue('');
      toast(
        `Phone number processed (${result.createdPhoneNumberCount} created, ${result.linkedPhoneNumberCount} linked).`,
        { variant: 'success' }
      );
    } catch (error: unknown) {
      toast(
        error instanceof Error ? error.message : 'Failed to add phone number.',
        { variant: 'error' }
      );
    }
  }, [
    database,
    organization,
    phoneValidationRules,
    phoneValue,
    toast,
    updateSetting,
  ]);

  const handleAddEmail = useCallback(async (): Promise<void> => {
    if (!organization) {
      toast('Organization was not found.', { variant: 'error' });
      return;
    }

    const result = upsertFilemakerEmailsForParty(database, {
      partyKind: 'organization',
      partyId: organization.id,
      emails: [emailValue],
      status: 'unverified',
    });

    if (!result.partyFound) {
      toast('Organization was not found.', { variant: 'error' });
      return;
    }
    if (result.appliedEmails.length === 0) {
      toast('Provide a valid email address to add.', { variant: 'error' });
      return;
    }
    if (result.createdEmailCount === 0 && result.linkedEmailCount === 0) {
      toast('Email already exists and is already linked to this organization.', {
        variant: 'warning',
      });
      return;
    }

    try {
      await updateSetting.mutateAsync({
        key: FILEMAKER_DATABASE_KEY,
        value: JSON.stringify(result.database),
      });
      setEmailValue('');
      toast(
        `Email processed (${result.createdEmailCount} created, ${result.linkedEmailCount} linked).`,
        { variant: 'success' }
      );
    } catch (error: unknown) {
      toast(
        error instanceof Error ? error.message : 'Failed to add email.',
        { variant: 'error' }
      );
    }
  }, [database, emailValue, organization, toast, updateSetting]);

  const handleParseEmails = useCallback(async (): Promise<void> => {
    if (!organization) {
      toast('Organization was not found.', { variant: 'error' });
      return;
    }
    if (!emailParserText.trim()) {
      toast('Paste text to parse emails.', { variant: 'error' });
      return;
    }

    const result = parseAndUpsertFilemakerEmailsForParty(database, {
      partyKind: 'organization',
      partyId: organization.id,
      text: emailParserText,
      parserRules,
      status: 'unverified',
    });

    if (result.appliedEmails.length === 0) {
      toast('No valid email addresses were detected in pasted text.', {
        variant: 'warning',
      });
      return;
    }
    if (result.createdEmailCount === 0 && result.linkedEmailCount === 0) {
      toast('All parsed emails already exist and are linked to this organization.', {
        variant: 'warning',
      });
      return;
    }

    try {
      await updateSetting.mutateAsync({
        key: FILEMAKER_DATABASE_KEY,
        value: JSON.stringify(result.database),
      });
      setEmailParserText('');
      toast(
        `Parsed ${result.appliedEmails.length} email(s) (${result.createdEmailCount} created, ${result.linkedEmailCount} linked).`,
        { variant: 'success' }
      );
    } catch (error: unknown) {
      toast(
        error instanceof Error ? error.message : 'Failed to parse and add emails.',
        { variant: 'error' }
      );
    }
  }, [database, emailParserText, organization, parserRules, toast, updateSetting]);

  if (!organization) {
    return (
      <div className='container mx-auto space-y-6 py-8'>
        <SectionHeader
          title='Edit Organization'
          description='The requested organization record could not be found.'
          eyebrow={
            <Breadcrumbs
              items={[
                { label: 'Admin', href: '/admin' },
                { label: 'Filemaker', href: '/admin/filemaker' },
                { label: 'Organizations', href: '/admin/filemaker/organizations' },
                { label: 'Edit' }
              ]}
              className='mb-2'
            />
          }
          actions={(
            <FormActions
              onCancel={(): void => {
                router.push('/admin/filemaker/organizations');
              }}
              cancelText='Back to Organizations'
            />
          )}
        />
      </div>
    );
  }

  return (
    <div className='container mx-auto space-y-6 py-8'>
      <SectionHeader
        title='Edit Organization'
        description='Update an organization record used in Case Resolver document addressing.'
        eyebrow={
          <Breadcrumbs
            items={[
              { label: 'Admin', href: '/admin' },
              { label: 'Filemaker', href: '/admin/filemaker' },
              { label: 'Organizations', href: '/admin/filemaker/organizations' },
              { label: 'Edit' }
            ]}
            className='mb-2'
          />
        }
        actions={(
          <FormActions
            onCancel={(): void => {
              router.push('/admin/filemaker/organizations');
            }}
            cancelText='Back to Organizations'
            onSave={(): void => {
              void handleSave();
            }}
            saveText='Save Organization'
            isSaving={updateSetting.isPending}
          />
        )}
      />

      <div className='flex flex-wrap gap-2'>
        <Badge variant='outline' className='text-[10px]'>
          ID: {organization.id}
        </Badge>
        <Badge variant='outline' className='text-[10px]'>
          Created: {formatTimestamp(organization.createdAt)}
        </Badge>
        <Badge variant='outline' className='text-[10px]'>
          Updated: {formatTimestamp(organization.updatedAt)}
        </Badge>
        <Badge variant='outline' className='text-[10px]'>
          Linked Emails: {linkedEmails.length}
        </Badge>
        <Badge variant='outline' className='text-[10px]'>
          Linked Phones: {linkedPhoneNumbers.length}
        </Badge>
        <Badge variant='outline' className='text-[10px]'>
          Linked Events: {linkedEvents.length}
        </Badge>
        <Badge variant='outline' className='text-[10px]'>
          Linked Addresses: {addresses.length}
        </Badge>
      </div>

      <FormSection title='Organization Details' className='space-y-4 p-4'>
        <div className='grid gap-3 md:grid-cols-2'>
          <FormField label='Organization Name' className='md:col-span-2'>
            <Input
              value={name}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                setName(event.target.value);
              }}
              placeholder='Organization name'
              className='h-9'
            />
          </FormField>
        </div>
      </FormSection>

      <FormSection title='Addresses' className='space-y-4 p-4'>
        <div className='flex flex-wrap items-center gap-2'>
          <Badge variant='outline' className='text-[10px]'>
            Linked Addresses: {addresses.length}
          </Badge>
          <Badge variant='outline' className='text-[10px]'>
            Default: {defaultAddress?.addressId || 'n/a'}
          </Badge>
        </div>

        <div className='grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto_auto]'>
          <FormField label='Select Address'>
            <SelectSimple
              value={selectedAddress?.addressId ?? ''}
              onValueChange={(value: string): void => {
                setSelectedAddressId(value);
              }}
              options={addresses.map((address: EditableAddress) => ({
                value: address.addressId,
                label: address.isDefault ? `Default - ${address.addressId}` : address.addressId,
                description: formatFilemakerAddress({
                  street: address.street,
                  streetNumber: address.streetNumber,
                  city: address.city,
                  postalCode: address.postalCode,
                  country: countryById.get(address.countryId)?.name ?? address.country,
                }),
              }))}
              placeholder='Select address'
              size='sm'
            />
          </FormField>
          <div className='flex items-end'>
            <Button type='button' size='sm' className='h-9' onClick={handleAddAddress}>
              Add Address
            </Button>
          </div>
          <div className='flex items-end'>
            <Button
              type='button'
              size='sm'
              variant='outline'
              className='h-9'
              onClick={handleSetDefaultSelectedAddress}
              disabled={!selectedAddress || selectedAddress.isDefault}
            >
              Set Default
            </Button>
          </div>
          <div className='flex items-end'>
            <Button
              type='button'
              size='sm'
              variant='outline'
              className='h-9'
              onClick={handleRemoveSelectedAddress}
              disabled={!selectedAddress || addresses.length <= 1}
            >
              Remove
            </Button>
          </div>
        </div>

        <div className='grid gap-3 md:grid-cols-2'>
          <FormField label='Street'>
            <Input
              value={selectedAddress?.street ?? ''}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                updateSelectedAddress({ street: event.target.value });
              }}
              placeholder='Street'
              className='h-9'
              disabled={!selectedAddress}
            />
          </FormField>
          <FormField label='Street Number'>
            <Input
              value={selectedAddress?.streetNumber ?? ''}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                updateSelectedAddress({ streetNumber: event.target.value });
              }}
              placeholder='Street number'
              className='h-9'
              disabled={!selectedAddress}
            />
          </FormField>
          <FormField label='City'>
            <Input
              value={selectedAddress?.city ?? ''}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                updateSelectedAddress({ city: event.target.value });
              }}
              placeholder='City'
              className='h-9'
              disabled={!selectedAddress}
            />
          </FormField>
          <FormField label='Postal Code'>
            <Input
              value={selectedAddress?.postalCode ?? ''}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                updateSelectedAddress({ postalCode: event.target.value });
              }}
              placeholder='Postal code'
              className='h-9'
              disabled={!selectedAddress}
            />
          </FormField>
          <FormField label='Country'>
            <SelectSimple
              value={selectedAddress?.countryId ?? ''}
              onValueChange={(value: string): void => {
                updateSelectedAddress({
                  countryId: value,
                  country: countryById.get(value)?.name ?? '',
                });
              }}
              options={countryOptions}
              placeholder={
                countriesQuery.isLoading ? 'Loading countries...' : 'Select country'
              }
              size='sm'
              disabled={!selectedAddress || countriesQuery.isLoading || countriesQuery.isError}
            />
          </FormField>
        </div>
      </FormSection>

      <FormSection title='Preview' className='space-y-2 p-4'>
        <div className='text-sm font-semibold text-white'>{name.trim()}</div>
        <div className='text-xs text-gray-300'>
          {formatFilemakerAddress({
            street: defaultAddress?.street ?? '',
            streetNumber: defaultAddress?.streetNumber ?? '',
            city: defaultAddress?.city ?? '',
            postalCode: defaultAddress?.postalCode ?? '',
            country:
              countryById.get(defaultAddress?.countryId ?? '')?.name ??
              defaultAddress?.country ??
              '',
          })}
        </div>
      </FormSection>

      <FormSection title='Linked Events' className='space-y-2 p-4'>
        {events.length === 0 ? (
          <div className='text-xs text-gray-500'>No events available in Filemaker.</div>
        ) : (
          events.map((event: FilemakerEvent) => {
            const checked = linkedEventIds.includes(event.id);
            return (
              <label
                key={event.id}
                className='flex items-start gap-3 rounded-md border border-border/60 bg-card/25 p-2'
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(value): void => {
                    setLinkedEventIds((previous: string[]) => {
                      if (!value) {
                        return previous.filter(
                          (entry: string): boolean => entry !== event.id
                        );
                      }
                      if (previous.includes(event.id)) return previous;
                      return [...previous, event.id];
                    });
                  }}
                />
                <div className='min-w-0 flex-1'>
                  <div className='text-xs font-medium text-white'>
                    {event.eventName}
                  </div>
                  <div className='text-[11px] text-gray-400'>
                    {formatFilemakerAddress(event)}
                  </div>
                </div>
              </label>
            );
          })
        )}
      </FormSection>

      <FormSection title='Linked Phone Numbers' className='space-y-2 p-4'>
        {linkedPhoneNumbers.length === 0 ? (
          <div className='text-xs text-gray-500'>
            No linked phone numbers for this organization.
          </div>
        ) : (
          linkedPhoneNumbers
            .slice()
            .sort((left: FilemakerPhoneNumber, right: FilemakerPhoneNumber) =>
              left.phoneNumber.localeCompare(right.phoneNumber)
            )
            .map((phoneNumber: FilemakerPhoneNumber) => (
              <div key={phoneNumber.id} className='text-xs text-gray-300'>
                {phoneNumber.phoneNumber}
              </div>
            ))
        )}
      </FormSection>

      <FormSection title='Add and Link Phone Number' className='space-y-3 p-4'>
        <div className='grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]'>
          <FormField label='Phone Number'>
            <Input
              value={phoneValue}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                setPhoneValue(event.target.value);
              }}
              placeholder='+48 123 456 789'
              className='h-9'
            />
          </FormField>
          <div className='flex items-end'>
            <Button
              type='button'
              size='sm'
              className='h-9'
              onClick={(): void => {
                void handleAddPhoneNumber();
              }}
              disabled={updateSetting.isPending}
            >
              Add and Link
            </Button>
          </div>
        </div>
        <div className='text-[11px] text-gray-500'>
          {phoneValidationRules.length > 0
            ? `Using ${phoneValidationRules.length} custom phone validation rule(s).`
            : 'Using default phone validation rules (no custom validator rules found).'}
        </div>
      </FormSection>

      <FormSection title='Linked Emails' className='space-y-2 p-4'>
        {linkedEmails.length === 0 ? (
          <div className='text-xs text-gray-500'>
            No linked emails for this organization.
          </div>
        ) : (
          linkedEmails
            .slice()
            .sort((left: FilemakerEmail, right: FilemakerEmail) =>
              left.email.localeCompare(right.email)
            )
            .map((email: FilemakerEmail) => (
              <div key={email.id} className='text-xs text-gray-300'>
                {email.email} ({email.status})
              </div>
            ))
        )}
        <div className='text-[11px] text-gray-500'>
          Manage links in Filemaker Emails.
        </div>
      </FormSection>

      <FormSection title='Add and Link Email' className='space-y-3 p-4'>
        <div className='grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]'>
          <FormField label='Email Address'>
            <Input
              value={emailValue}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                setEmailValue(event.target.value);
              }}
              placeholder='name@example.com'
              className='h-9'
            />
          </FormField>
          <div className='flex items-end'>
            <Button
              type='button'
              size='sm'
              className='h-9'
              onClick={(): void => {
                void handleAddEmail();
              }}
              disabled={updateSetting.isPending}
            >
              Add and Link
            </Button>
          </div>
        </div>
      </FormSection>

      <FormSection title='Email Parser' className='space-y-3 p-4'>
        <FormField label='Paste Text'>
          <Textarea
            value={emailParserText}
            onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void => {
              setEmailParserText(event.target.value);
            }}
            placeholder='Paste any text (emails, signatures, message body)...'
            className='min-h-[120px] text-xs'
          />
        </FormField>
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <div className='text-[11px] text-gray-500'>
            {parserRules.length > 0
              ? `Using ${parserRules.length} custom validator parser rule(s).`
              : 'Using default parser rules (no custom validator rules found).'}
          </div>
          <Button
            type='button'
            size='sm'
            onClick={(): void => {
              void handleParseEmails();
            }}
            disabled={updateSetting.isPending}
          >
            Parse and Link Emails
          </Button>
        </div>
      </FormSection>
    </div>
  );
}
