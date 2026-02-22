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
  createFilemakerOrganization,
  FILEMAKER_DATABASE_KEY,
  FILEMAKER_EMAIL_PARSER_PROMPT_SETTINGS_KEY,
  formatFilemakerAddress,
  getFilemakerEmailsForParty,
  normalizeFilemakerDatabase,
  parseAndUpsertFilemakerEmailsForParty,
  parseFilemakerEmailParserRulesFromPromptSettings,
  parseFilemakerDatabase,
  upsertFilemakerEmailsForParty,
} from '../settings';
import {
  decodeRouteParam,
  formatTimestamp,
  hasAddressFields,
  resolveCountryId,
} from './filemaker-page-utils';

import type { FilemakerEmail, FilemakerOrganization } from '../types';

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

  const [name, setName] = useState('');
  const [street, setStreet] = useState('');
  const [streetNumber, setStreetNumber] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [countryId, setCountryId] = useState('');
  const [emailValue, setEmailValue] = useState('');
  const [emailParserText, setEmailParserText] = useState('');
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
