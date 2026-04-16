'use client';

import { useRouter } from 'nextjs-toploader/app';
import { useParams } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useState, startTransition } from 'react';

import type { LabeledOptionWithDescriptionDto } from '@/shared/contracts/base';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { AdminFilemakerBreadcrumbs } from '@/shared/ui/admin.public';
import { Badge, Checkbox, Input, useToast } from '@/shared/ui/primitives.public';
import { FormActions, FormField, FormSection, SelectSimple } from '@/shared/ui/forms-and-actions.public';
import { SectionHeader } from '@/shared/ui/navigation-and-layout.public';

import {
  createFilemakerEmail,
  FILEMAKER_DATABASE_KEY,
  formatFilemakerAddress,
  linkFilemakerEmailToParty,
  normalizeFilemakerDatabase,
  parseFilemakerDatabase,
  toPersistedFilemakerDatabase,
} from '../settings';
import { decodeRouteParam, formatTimestamp } from './filemaker-page-utils';

import type {
  FilemakerEmail,
  FilemakerEmailStatus,
  FilemakerOrganization,
  FilemakerPerson,
} from '../types';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EMAIL_STATUS_OPTIONS: Array<LabeledOptionWithDescriptionDto<FilemakerEmailStatus>> = [
  { value: 'active', label: 'Active', description: 'Deliverable and in use.' },
  { value: 'inactive', label: 'Inactive', description: 'Known email, not currently used.' },
  { value: 'bounced', label: 'Bounced', description: 'Delivery is failing.' },
  { value: 'unverified', label: 'Unverified', description: 'Not yet verified.' },
];

const toggleSelection = (value: string, checked: boolean, previous: string[]): string[] => {
  if (!value.trim()) return previous;
  if (checked) {
    if (previous.includes(value)) return previous;
    return [...previous, value];
  }
  return previous.filter((entry: string): boolean => entry !== value);
};

export function AdminFilemakerEmailEditPage(): React.JSX.Element {
  const params = useParams();
  const router = useRouter();
  const settingsStore = useSettingsStore();
  const updateSetting = useUpdateSetting();
  const { toast } = useToast();

  const emailId = useMemo(() => decodeRouteParam(params['emailId']), [params]);

  const rawDatabase = settingsStore.get(FILEMAKER_DATABASE_KEY);
  const database = useMemo(() => parseFilemakerDatabase(rawDatabase), [rawDatabase]);
  const email = useMemo(
    () => database.emails.find((entry: FilemakerEmail): boolean => entry.id === emailId) ?? null,
    [database.emails, emailId]
  );

  const persons = useMemo(
    (): FilemakerPerson[] =>
      [...database.persons].sort((left: FilemakerPerson, right: FilemakerPerson) =>
        `${left.lastName} ${left.firstName}`.localeCompare(`${right.lastName} ${right.firstName}`)
      ),
    [database.persons]
  );
  const organizations = useMemo(
    (): FilemakerOrganization[] =>
      [...database.organizations].sort(
        (left: FilemakerOrganization, right: FilemakerOrganization) =>
          left.name.localeCompare(right.name)
      ),
    [database.organizations]
  );

  const [emailValue, setEmailValue] = useState('');
  const [status, setStatus] = useState<FilemakerEmailStatus>('unverified');
  const [linkedPersonIds, setLinkedPersonIds] = useState<string[]>([]);
  const [linkedOrganizationIds, setLinkedOrganizationIds] = useState<string[]>([]);
  const [hydratedEmailId, setHydratedEmailId] = useState<string | null>(null);

  useEffect(() => {
    if (!email) return;
    if (hydratedEmailId === email.id) return;

    const linksForEmail = database.emailLinks.filter((link): boolean => link.emailId === email.id);

    setEmailValue(email.email);
    setStatus(email.status);
    setLinkedPersonIds(
      linksForEmail
        .filter((link): boolean => link.partyKind === 'person')
        .map((link) => link.partyId)
    );
    setLinkedOrganizationIds(
      linksForEmail
        .filter((link): boolean => link.partyKind === 'organization')
        .map((link) => link.partyId)
    );
    setHydratedEmailId(email.id);
  }, [database.emailLinks, email, hydratedEmailId]);

  const handleSave = useCallback(async (): Promise<void> => {
    if (!email) {
      toast('Email was not found.', { variant: 'error' });
      return;
    }

    const normalizedEmail = emailValue.trim().toLowerCase();
    if (!normalizedEmail || !EMAIL_RE.test(normalizedEmail)) {
      toast('Provide a valid email address.', { variant: 'error' });
      return;
    }

    const duplicate = database.emails.some(
      (entry: FilemakerEmail): boolean =>
        entry.id !== email.id && entry.email.trim().toLowerCase() === normalizedEmail
    );
    if (duplicate) {
      toast('This email already exists in Filemaker.', { variant: 'error' });
      return;
    }

    const nextEmails = database.emails.map((entry: FilemakerEmail) => {
      if (entry.id !== email.id) return entry;
      return createFilemakerEmail({
        id: entry.id,
        email: normalizedEmail,
        status,
        createdAt: entry.createdAt,
        updatedAt: new Date().toISOString(),
      });
    });

    const baseDatabase = normalizeFilemakerDatabase({
      ...database,
      emails: nextEmails,
      emailLinks: database.emailLinks.filter((link): boolean => link.emailId !== email.id),
    });

    let linkedDatabase = baseDatabase;
    linkedPersonIds.forEach((personIdEntry: string): void => {
      linkedDatabase = linkFilemakerEmailToParty(linkedDatabase, {
        emailId: email.id,
        partyKind: 'person',
        partyId: personIdEntry,
      }).database;
    });
    linkedOrganizationIds.forEach((organizationIdEntry: string): void => {
      linkedDatabase = linkFilemakerEmailToParty(linkedDatabase, {
        emailId: email.id,
        partyKind: 'organization',
        partyId: organizationIdEntry,
      }).database;
    });

    try {
      await updateSetting.mutateAsync({
        key: FILEMAKER_DATABASE_KEY,
        value: JSON.stringify(toPersistedFilemakerDatabase(linkedDatabase)),
      });
      toast('Email updated.', { variant: 'success' });
      startTransition(() => { router.push('/admin/filemaker/emails'); });
    } catch (error: unknown) {
      logClientError(error);
      toast(error instanceof Error ? error.message : 'Failed to update email.', {
        variant: 'error',
      });
    }
  }, [
    database,
    email,
    emailValue,
    linkedOrganizationIds,
    linkedPersonIds,
    router,
    status,
    toast,
    updateSetting,
  ]);

  if (!email) {
    return (
      <div className='page-section-compact space-y-6'>
        <SectionHeader
          title='Edit Email'
          description='The requested email record could not be found.'
          eyebrow={
            <AdminFilemakerBreadcrumbs
              parent={{ label: 'Emails', href: '/admin/filemaker/emails' }}
              current='Edit'
              className='mb-2'
            />
          }
          actions={
            <FormActions
              onCancel={(): void => {
                startTransition(() => { router.push('/admin/filemaker/emails'); });
              }}
              cancelText='Back to Emails'
            />
          }
        />
      </div>
    );
  }

  return (
    <div className='page-section-compact space-y-6'>
        <SectionHeader
          title='Edit Email'
          description='Update email status and links to persons and organizations.'
          eyebrow={
          <AdminFilemakerBreadcrumbs
            parent={{ label: 'Emails', href: '/admin/filemaker/emails' }}
            current='Edit'
            className='mb-2'
          />
        }
        actions={
          <FormActions
            onCancel={(): void => {
              startTransition(() => { router.push('/admin/filemaker/emails'); });
            }}
            cancelText='Back to Emails'
            onSave={(): void => {
              void handleSave();
            }}
            saveText='Save Email'
            isSaving={updateSetting.isPending}
          />
        }
      />

      <div className='flex flex-wrap gap-2'>
        <Badge variant='outline' className='text-[10px]'>
          ID: {email.id}
        </Badge>
        <Badge variant='outline' className='text-[10px]'>
          Created: {formatTimestamp(email.createdAt)}
        </Badge>
        <Badge variant='outline' className='text-[10px]'>
          Updated: {formatTimestamp(email.updatedAt)}
        </Badge>
        <Badge variant='outline' className='text-[10px]'>
          Linked Parties: {linkedPersonIds.length + linkedOrganizationIds.length}
        </Badge>
      </div>

      <FormSection title='Email Details' className='space-y-4 p-4'>
        <div className='grid gap-3 md:grid-cols-2'>
          <FormField label='Email' className='md:col-span-2'>
            <Input
              value={emailValue}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                setEmailValue(event.target.value);
              }}
              placeholder='name@example.com'
              className='h-9'
             aria-label='name@example.com' title='name@example.com'/>
          </FormField>
          <FormField label='Status'>
            <SelectSimple
              value={status}
              onValueChange={(value: string): void => {
                setStatus((value as FilemakerEmailStatus) || 'unverified');
              }}
              options={EMAIL_STATUS_OPTIONS}
              placeholder='Select status'
              size='sm'
             ariaLabel='Select status' title='Select status'/>
          </FormField>
        </div>
      </FormSection>

      <FormSection title='Linked Persons' className='space-y-2 p-4'>
        {persons.length === 0 ? (
          <div className='text-xs text-gray-500'>No persons available in Filemaker.</div>
        ) : (
          persons.map((person: FilemakerPerson) => {
            const checked = linkedPersonIds.includes(person.id);
            const checkboxId = `filemaker-email-person-${person.id}`;
            return (
              <div
                key={person.id}
                className='flex items-start gap-3 rounded-md border border-border/60 bg-card/25 p-2'
              >
                <Checkbox
                  id={checkboxId}
                  checked={checked}
                  onCheckedChange={(value): void => {
                    setLinkedPersonIds((previous: string[]) =>
                      toggleSelection(person.id, Boolean(value), previous)
                    );
                  }}
                />
                <label htmlFor={checkboxId} className='min-w-0 flex-1 cursor-pointer'>
                  <div className='text-xs font-medium text-white'>
                    {person.firstName} {person.lastName}
                  </div>
                  <div className='text-[11px] text-gray-400'>{formatFilemakerAddress(person)}</div>
                </label>
              </div>
            );
          })
        )}
      </FormSection>

      <FormSection title='Linked Organizations' className='space-y-2 p-4'>
        {organizations.length === 0 ? (
          <div className='text-xs text-gray-500'>No organizations available in Filemaker.</div>
        ) : (
          organizations.map((organization: FilemakerOrganization) => {
            const checked = linkedOrganizationIds.includes(organization.id);
            const checkboxId = `filemaker-email-organization-${organization.id}`;
            return (
              <div
                key={organization.id}
                className='flex items-start gap-3 rounded-md border border-border/60 bg-card/25 p-2'
              >
                <Checkbox
                  id={checkboxId}
                  checked={checked}
                  onCheckedChange={(value): void => {
                    setLinkedOrganizationIds((previous: string[]) =>
                      toggleSelection(organization.id, Boolean(value), previous)
                    );
                  }}
                />
                <label htmlFor={checkboxId} className='min-w-0 flex-1 cursor-pointer'>
                  <div className='text-xs font-medium text-white'>{organization.name}</div>
                  <div className='text-[11px] text-gray-400'>
                    {formatFilemakerAddress(organization)}
                  </div>
                </label>
              </div>
            );
          })
        )}
      </FormSection>
    </div>
  );
}
