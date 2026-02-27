'use client';

import { useParams, useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useCountries } from '@/shared/lib/internationalization/hooks/useInternationalizationQueries';
import type { CountryOption } from '@/shared/contracts/internationalization';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import {
  Badge,
  Button,
  Breadcrumbs,
  Checkbox,
  FormActions,
  FormField,
  FormSection,
  Input,
  SectionHeader,
  SelectSimple,
  useToast,
} from '@/shared/ui';

import {
  createFilemakerAddress,
  createFilemakerAddressLink,
  createFilemakerEvent,
  FILEMAKER_DATABASE_KEY,
  formatFilemakerAddress,
  getFilemakerAddressById,
  getFilemakerAddressLinksForOwner,
  getFilemakerOrganizationsForEvent,
  linkFilemakerEventToOrganization,
  normalizeFilemakerDatabase,
  parseFilemakerDatabase,
} from '../settings';
import {
  decodeRouteParam,
  formatTimestamp,
  hasAddressFields,
  resolveCountryId,
} from './filemaker-page-utils';

import type { FilemakerEvent, FilemakerOrganization } from '../types';

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

const toggleSelection = (
  value: string,
  checked: boolean,
  previous: string[]
): string[] => {
  if (!value.trim()) return previous;
  if (checked) {
    if (previous.includes(value)) return previous;
    return [...previous, value];
  }
  return previous.filter((entry: string): boolean => entry !== value);
};

export function AdminFilemakerEventEditPage(): React.JSX.Element {
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

  const eventId = useMemo(() => decodeRouteParam(params['eventId']), [params]);

  const rawDatabase = settingsStore.get(FILEMAKER_DATABASE_KEY);
  const database = useMemo(() => parseFilemakerDatabase(rawDatabase), [rawDatabase]);
  const event = useMemo(
    () => database.events.find((entry: FilemakerEvent): boolean => entry.id === eventId) ?? null,
    [database.events, eventId]
  );
  const organizations = useMemo(
    (): FilemakerOrganization[] =>
      [...database.organizations].sort(
        (left: FilemakerOrganization, right: FilemakerOrganization) =>
          left.name.localeCompare(right.name)
      ),
    [database.organizations]
  );
  const linkedOrganizations = useMemo(
    (): FilemakerOrganization[] =>
      event ? getFilemakerOrganizationsForEvent(database, event.id) : [],
    [database, event]
  );

  const [eventName, setEventName] = useState('');
  const [addresses, setAddresses] = useState<EditableAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [linkedOrganizationIds, setLinkedOrganizationIds] = useState<string[]>([]);
  const [hydratedEventId, setHydratedEventId] = useState<string | null>(null);

  useEffect(() => {
    if (!event) return;
    if (hydratedEventId === event.id) return;

    setEventName(event.eventName);

    const links = getFilemakerAddressLinksForOwner(database, 'event', event.id);
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
          addressId: event.addressId || createId('address'),
          street: event.street,
          streetNumber: event.streetNumber,
          city: event.city,
          postalCode: event.postalCode,
          countryId: resolveCountryId(event.countryId, event.country, countries, countryById),
          country: event.country,
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
    setLinkedOrganizationIds(
      database.eventOrganizationLinks
        .filter((link): boolean => link.eventId === event.id)
        .map((link) => link.organizationId)
    );
    setHydratedEventId(event.id);
  }, [countries, countryById, database, database.eventOrganizationLinks, event, hydratedEventId]);

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
      toast('Event requires at least one address.', { variant: 'error' });
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
    if (!event) {
      toast('Event was not found.', { variant: 'error' });
      return;
    }

    const normalizedEventName = eventName.trim();
    if (!normalizedEventName) {
      toast('Event requires an event name.', { variant: 'error' });
      return;
    }

    if (addresses.length === 0) {
      toast('Event requires at least one address.', { variant: 'error' });
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
      toast('Event requires a default address.', { variant: 'error' });
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
      toast('Event requires a default address.', { variant: 'error' });
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
        id: `filemaker-address-link-event-${event.id}-${address.addressId}`,
        ownerKind: 'event',
        ownerId: event.id,
        addressId: address.addressId,
        isDefault: address.isDefault,
      })
    );

    const detailsUpdatedDatabase = normalizeFilemakerDatabase({
      ...database,
      events: database.events.map((entry: FilemakerEvent) =>
        entry.id === event.id
          ? createFilemakerEvent({
            id: entry.id,
            eventName: normalizedEventName,
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
          (link): boolean => !(link.ownerKind === 'event' && link.ownerId === event.id)
        ),
        ...ownerAddressLinks,
      ],
      eventOrganizationLinks: database.eventOrganizationLinks.filter(
        (link): boolean => link.eventId !== event.id
      ),
    });

    let nextDatabase = detailsUpdatedDatabase;
    linkedOrganizationIds.forEach((organizationId: string): void => {
      nextDatabase = linkFilemakerEventToOrganization(nextDatabase, {
        eventId: event.id,
        organizationId,
      }).database;
    });

    try {
      await updateSetting.mutateAsync({
        key: FILEMAKER_DATABASE_KEY,
        value: JSON.stringify(nextDatabase),
      });
      toast('Event updated.', { variant: 'success' });
      router.push('/admin/filemaker/events');
    } catch (error: unknown) {
      toast(
        error instanceof Error ? error.message : 'Failed to update event.',
        { variant: 'error' }
      );
    }
  }, [
    addresses,
    countryById,
    database,
    event,
    eventName,
    linkedOrganizationIds,
    router,
    toast,
    updateSetting,
  ]);

  if (!event) {
    return (
      <div className='container mx-auto space-y-6 py-8'>
        <SectionHeader
          title='Edit Event'
          description='The requested event record could not be found.'
          eyebrow={
            <Breadcrumbs
              items={[
                { label: 'Admin', href: '/admin' },
                { label: 'Filemaker', href: '/admin/filemaker' },
                { label: 'Events', href: '/admin/filemaker/events' },
                { label: 'Edit' },
              ]}
              className='mb-2'
            />
          }
          actions={
            <FormActions
              onCancel={(): void => {
                router.push('/admin/filemaker/events');
              }}
              cancelText='Back to Events'
            />
          }
        />
      </div>
    );
  }

  return (
    <div className='container mx-auto space-y-6 py-8'>
      <SectionHeader
        title='Edit Event'
        description='Update an event record and linked organizations.'
        eyebrow={
          <Breadcrumbs
            items={[
              { label: 'Admin', href: '/admin' },
              { label: 'Filemaker', href: '/admin/filemaker' },
              { label: 'Events', href: '/admin/filemaker/events' },
              { label: 'Edit' },
            ]}
            className='mb-2'
          />
        }
        actions={
          <FormActions
            onCancel={(): void => {
              router.push('/admin/filemaker/events');
            }}
            cancelText='Back to Events'
            onSave={(): void => {
              void handleSave();
            }}
            saveText='Save Event'
            isSaving={updateSetting.isPending}
          />
        }
      />

      <div className='flex flex-wrap gap-2'>
        <Badge variant='outline' className='text-[10px]'>
          ID: {event.id}
        </Badge>
        <Badge variant='outline' className='text-[10px]'>
          Created: {formatTimestamp(event.createdAt)}
        </Badge>
        <Badge variant='outline' className='text-[10px]'>
          Updated: {formatTimestamp(event.updatedAt)}
        </Badge>
        <Badge variant='outline' className='text-[10px]'>
          Linked Organizations: {linkedOrganizations.length}
        </Badge>
        <Badge variant='outline' className='text-[10px]'>
          Linked Addresses: {addresses.length}
        </Badge>
      </div>

      <FormSection title='Event Details' className='space-y-4 p-4'>
        <div className='grid gap-3 md:grid-cols-2'>
          <FormField label='Event Name' className='md:col-span-2'>
            <Input
              value={eventName}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                setEventName(event.target.value);
              }}
              placeholder='Event name'
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
        <div className='text-sm font-semibold text-white'>{eventName.trim()}</div>
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

      <FormSection title='Linked Organizations' className='space-y-2 p-4'>
        {organizations.length === 0 ? (
          <div className='text-xs text-gray-500'>
            No organizations available in Filemaker.
          </div>
        ) : (
          organizations.map((organization: FilemakerOrganization) => {
            const checked = linkedOrganizationIds.includes(organization.id);
            return (
              <label
                key={organization.id}
                className='flex items-start gap-3 rounded-md border border-border/60 bg-card/25 p-2'
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(value): void => {
                    setLinkedOrganizationIds((previous: string[]) =>
                      toggleSelection(organization.id, Boolean(value), previous)
                    );
                  }}
                />
                <div className='min-w-0 flex-1'>
                  <div className='text-xs font-medium text-white'>
                    {organization.name}
                  </div>
                  <div className='text-[11px] text-gray-400'>
                    {formatFilemakerAddress(organization)}
                  </div>
                </div>
              </label>
            );
          })
        )}
      </FormSection>
    </div>
  );
}
