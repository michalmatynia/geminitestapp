'use client';

import { useParams, useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useCountries } from '@/features/internationalization/hooks/useInternationalizationQueries';
import type { CountryOption } from '@/shared/contracts/internationalization';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import {
  Badge,
  FormSection,
  FormField,
  Input,
  SectionHeader,
  SelectSimple,
  useToast,
  FormActions,
  Breadcrumbs,
} from '@/shared/ui';

import {
  createFilemakerOrganization,
  FILEMAKER_DATABASE_KEY,
  formatFilemakerAddress,
  normalizeFilemakerDatabase,
  parseFilemakerDatabase,
} from '../settings';
import {
  decodeRouteParam,
  formatTimestamp,
  hasAddressFields,
  resolveCountryId,
} from './filemaker-page-utils';

import type { FilemakerOrganization } from '../types';

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
  const organization = useMemo(
    () =>
      database.organizations.find(
        (entry: FilemakerOrganization): boolean => entry.id === organizationId
      ) ?? null,
    [database.organizations, organizationId]
  );

  const [name, setName] = useState('');
  const [street, setStreet] = useState('');
  const [streetNumber, setStreetNumber] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [countryId, setCountryId] = useState('');
  const [hydratedOrganizationId, setHydratedOrganizationId] = useState<string | null>(null);

  useEffect(() => {
    if (!organization) return;
    if (hydratedOrganizationId === organization.id) return;
    setName(organization.name);
    setStreet(organization.street);
    setStreetNumber(organization.streetNumber);
    setCity(organization.city);
    setPostalCode(organization.postalCode);
    setCountryId(
      resolveCountryId(
        organization.countryId,
        organization.country,
        countries,
        countryById
      )
    );
    setHydratedOrganizationId(organization.id);
  }, [countries, countryById, hydratedOrganizationId, organization]);

  const handleSave = useCallback(async (): Promise<void> => {
    if (!organization) {
      toast('Organization was not found.', { variant: 'error' });
      return;
    }

    const normalizedName = name.trim();
    const normalizedStreet = street.trim();
    const normalizedStreetNumber = streetNumber.trim();
    const normalizedCity = city.trim();
    const normalizedPostalCode = postalCode.trim();
    const normalizedCountryId = countryId.trim();
    const normalizedCountry = countryById.get(normalizedCountryId)?.name ?? '';

    if (
      !normalizedName ||
      !hasAddressFields(
        normalizedStreet,
        normalizedStreetNumber,
        normalizedCity,
        normalizedPostalCode,
        normalizedCountryId
      )
    ) {
      toast(
        'Organization requires name, street, street number, city, postal code, and country.',
        { variant: 'error' }
      );
      return;
    }

    const nextDatabase = normalizeFilemakerDatabase({
      ...database,
      organizations: database.organizations.map((entry: FilemakerOrganization) =>
        entry.id === organization.id
          ? createFilemakerOrganization({
            id: entry.id,
            name: normalizedName,
            addressId: entry.addressId,
            street: normalizedStreet,
            streetNumber: normalizedStreetNumber,
            city: normalizedCity,
            postalCode: normalizedPostalCode,
            country: normalizedCountry,
            countryId: normalizedCountryId,
            createdAt: entry.createdAt,
            updatedAt: new Date().toISOString(),
          })
          : entry
      ),
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
    city,
    countryById,
    countryId,
    database,
    name,
    organization,
    postalCode,
    router,
    street,
    streetNumber,
    toast,
    updateSetting,
  ]);

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
          <FormField label='Street'>
            <Input
              value={street}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                setStreet(event.target.value);
              }}
              placeholder='Street'
              className='h-9'
            />
          </FormField>
          <FormField label='Street Number'>
            <Input
              value={streetNumber}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                setStreetNumber(event.target.value);
              }}
              placeholder='Street number'
              className='h-9'
            />
          </FormField>
          <FormField label='City'>
            <Input
              value={city}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                setCity(event.target.value);
              }}
              placeholder='City'
              className='h-9'
            />
          </FormField>
          <FormField label='Postal Code'>
            <Input
              value={postalCode}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                setPostalCode(event.target.value);
              }}
              placeholder='Postal code'
              className='h-9'
            />
          </FormField>
          <FormField label='Country'>
            <SelectSimple
              value={countryId}
              onValueChange={(value: string): void => {
                setCountryId(value);
              }}
              options={countryOptions}
              placeholder={
                countriesQuery.isLoading ? 'Loading countries...' : 'Select country'
              }
              size='sm'
              disabled={countriesQuery.isLoading || countriesQuery.isError}
            />
          </FormField>
        </div>
      </FormSection>

      <FormSection title='Preview' className='space-y-2 p-4'>
        <div className='text-sm font-semibold text-white'>{name.trim()}</div>
        <div className='text-xs text-gray-300'>
          {formatFilemakerAddress({
            street,
            streetNumber,
            city,
            postalCode,
            country: countryById.get(countryId)?.name ?? organization.country,
          })}
        </div>
      </FormSection>
    </div>
  );
}
