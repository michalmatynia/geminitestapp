'use client';

import { useParams, useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useCountries } from '@/features/internationalization/hooks/useInternationalizationQueries';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import type { CountryOption } from '@/shared/contracts/internationalization';
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
  createFilemakerPerson,
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

import type { FilemakerPerson } from '../types';

export function AdminFilemakerPersonEditPage(): React.JSX.Element {
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

  const personId = useMemo(
    () => decodeRouteParam(params['personId']),
    [params]
  );

  const rawDatabase = settingsStore.get(FILEMAKER_DATABASE_KEY);
  const database = useMemo(() => parseFilemakerDatabase(rawDatabase), [rawDatabase]);
  const person = useMemo(
    () =>
      database.persons.find(
        (entry: FilemakerPerson): boolean => entry.id === personId
      ) ?? null,
    [database.persons, personId]
  );

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [street, setStreet] = useState('');
  const [streetNumber, setStreetNumber] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [countryId, setCountryId] = useState('');
  const [nip, setNip] = useState('');
  const [regon, setRegon] = useState('');
  const [phones, setPhones] = useState('');
  const [hydratedPersonId, setHydratedPersonId] = useState<string | null>(null);

  useEffect(() => {
    if (!person) return;
    if (hydratedPersonId === person.id) return;
    setFirstName(person.firstName);
    setLastName(person.lastName);
    setStreet(person.street);
    setStreetNumber(person.streetNumber);
    setCity(person.city);
    setPostalCode(person.postalCode);
    setCountryId(
      resolveCountryId(person.countryId, person.country, countries, countryById)
    );
    setNip(person.nip);
    setRegon(person.regon);
    setPhones(person.phoneNumbers.join(', '));
    setHydratedPersonId(person.id);
  }, [countries, countryById, hydratedPersonId, person]);

  const handleSave = useCallback(async (): Promise<void> => {
    if (!person) {
      toast('Person was not found.', { variant: 'error' });
      return;
    }

    const normalizedFirstName = firstName.trim();
    const normalizedLastName = lastName.trim();
    const normalizedStreet = street.trim();
    const normalizedStreetNumber = streetNumber.trim();
    const normalizedCity = city.trim();
    const normalizedPostalCode = postalCode.trim();
    const normalizedCountryId = countryId.trim();
    const normalizedCountry = countryById.get(normalizedCountryId)?.name ?? '';

    if (
      !normalizedFirstName ||
      !normalizedLastName ||
      !hasAddressFields(
        normalizedStreet,
        normalizedStreetNumber,
        normalizedCity,
        normalizedPostalCode,
        normalizedCountryId
      )
    ) {
      toast(
        'Person requires first name, last name, street, street number, city, postal code, and country.',
        { variant: 'error' }
      );
      return;
    }

    const nextDatabase = normalizeFilemakerDatabase({
      ...database,
      persons: database.persons.map((entry: FilemakerPerson) =>
        entry.id === person.id
          ? createFilemakerPerson({
            id: entry.id,
            firstName: normalizedFirstName,
            lastName: normalizedLastName,
            addressId: entry.addressId,
            street: normalizedStreet,
            streetNumber: normalizedStreetNumber,
            city: normalizedCity,
            postalCode: normalizedPostalCode,
            country: normalizedCountry,
            countryId: normalizedCountryId,
            nip,
            regon,
            phoneNumbers: phones,
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
      toast('Person updated.', { variant: 'success' });
      router.push('/admin/filemaker/persons');
    } catch (error: unknown) {
      toast(
        error instanceof Error ? error.message : 'Failed to update person.',
        { variant: 'error' }
      );
    }
  }, [
    city,
    countryById,
    countryId,
    database,
    firstName,
    lastName,
    nip,
    person,
    phones,
    postalCode,
    regon,
    router,
    street,
    streetNumber,
    toast,
    updateSetting,
  ]);

  if (!person) {
    return (
      <div className='container mx-auto space-y-6 py-8'>
        <SectionHeader
          title='Edit Person'
          description='The requested person record could not be found.'
          eyebrow={
            <Breadcrumbs
              items={[
                { label: 'Admin', href: '/admin' },
                { label: 'Filemaker', href: '/admin/filemaker' },
                { label: 'Persons', href: '/admin/filemaker/persons' },
                { label: 'Edit' }
              ]}
              className='mb-2'
            />
          }
          actions={(
            <FormActions
              onCancel={(): void => {
                router.push('/admin/filemaker/persons');
              }}
              cancelText='Back to Persons'
            />
          )}
        />
      </div>
    );
  }

  return (
    <div className='container mx-auto space-y-6 py-8'>
      <SectionHeader
        title='Edit Person'
        description='Update a person record used in Case Resolver document addressing.'
        eyebrow={
          <Breadcrumbs
            items={[
              { label: 'Admin', href: '/admin' },
              { label: 'Filemaker', href: '/admin/filemaker' },
              { label: 'Persons', href: '/admin/filemaker/persons' },
              { label: 'Edit' }
            ]}
            className='mb-2'
          />
        }
        actions={(
          <FormActions
            onCancel={(): void => {
              router.push('/admin/filemaker/persons');
            }}
            cancelText='Back to Persons'
            onSave={(): void => {
              void handleSave();
            }}
            saveText='Save Person'
            isSaving={updateSetting.isPending}
          />
        )}
      />

      <div className='flex flex-wrap gap-2'>
        <Badge variant='outline' className='text-[10px]'>
          ID: {person.id}
        </Badge>
        <Badge variant='outline' className='text-[10px]'>
          Created: {formatTimestamp(person.createdAt)}
        </Badge>
        <Badge variant='outline' className='text-[10px]'>
          Updated: {formatTimestamp(person.updatedAt)}
        </Badge>
      </div>

      <FormSection title='Person Details' className='space-y-4 p-4'>
        <div className='grid gap-3 md:grid-cols-2'>
          <FormField label='First Name'>
            <Input
              value={firstName}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                setFirstName(event.target.value);
              }}
              placeholder='First name'
              className='h-9'
            />
          </FormField>
          <FormField label='Last Name'>
            <Input
              value={lastName}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                setLastName(event.target.value);
              }}
              placeholder='Last name'
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
          <FormField label='NIP'>
            <Input
              value={nip}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                setNip(event.target.value);
              }}
              placeholder='NIP code'
              className='h-9'
            />
          </FormField>
          <FormField label='REGON'>
            <Input
              value={regon}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                setRegon(event.target.value);
              }}
              placeholder='REGON code'
              className='h-9'
            />
          </FormField>
          <FormField label='Telephone Numbers' className='md:col-span-2'>
            <Input
              value={phones}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                setPhones(event.target.value);
              }}
              placeholder='Comma-separated numbers'
              className='h-9'
            />
          </FormField>
        </div>
      </FormSection>

      <FormSection title='Preview' className='space-y-2 p-4'>
        <div className='text-sm font-semibold text-white'>
          {firstName.trim()} {lastName.trim()}
        </div>
        <div className='text-xs text-gray-300'>
          {formatFilemakerAddress({
            street,
            streetNumber,
            city,
            postalCode,
            country: countryById.get(countryId)?.name ?? person.country,
          })}
        </div>
      </FormSection>
    </div>
  );
}
