'use client';

import React from 'react';

import { AdminFilemakerBreadcrumbs } from '@/shared/ui/admin.public';
import { FormActions, FormField, FormSection, SelectSimple } from '@/shared/ui/forms-and-actions.public';
import { SectionHeader } from '@/shared/ui/navigation-and-layout.public';
import { Badge, Checkbox, Input } from '@/shared/ui/primitives.public';

import {
  FILEMAKER_EMAIL_STATUS_OPTIONS,
  normalizeFilemakerEmailStatus,
} from '../filemaker-email-status';
import { formatFilemakerAddress } from '../settings';
import type {
  FilemakerEmail,
  FilemakerEmailStatus,
  FilemakerOrganization,
  FilemakerPerson,
} from '../types';
import { formatTimestamp } from './filemaker-page-utils';

function EmailEditBreadcrumbs(): React.JSX.Element {
  return (
    <AdminFilemakerBreadcrumbs
      parent={{ label: 'Emails', href: '/admin/filemaker/emails' }}
      current='Edit'
      className='mb-2'
    />
  );
}

function EmailEditActions({
  isSaving,
  onBack,
  onSave,
}: {
  isSaving?: boolean;
  onBack: () => void;
  onSave?: () => void;
}): React.JSX.Element {
  return (
    <FormActions
      onCancel={onBack}
      cancelText='Back to Emails'
      onSave={onSave}
      saveText='Save Email'
      isSaving={isSaving}
    />
  );
}

export function EmailEditMissingState({
  onBack,
}: {
  onBack: () => void;
}): React.JSX.Element {
  return (
    <div className='page-section-compact space-y-6'>
      <SectionHeader
        title='Edit Email'
        description='The requested email record could not be found.'
        eyebrow={<EmailEditBreadcrumbs />}
        actions={<EmailEditActions onBack={onBack} />}
      />
    </div>
  );
}

export function EmailEditHeader({
  isSaving,
  onBack,
  onSave,
}: {
  isSaving: boolean;
  onBack: () => void;
  onSave: () => void;
}): React.JSX.Element {
  return (
    <SectionHeader
      title='Edit Email'
      description='Update email status and links to persons and organizations.'
      eyebrow={<EmailEditBreadcrumbs />}
      actions={<EmailEditActions isSaving={isSaving} onBack={onBack} onSave={onSave} />}
    />
  );
}

export function EmailEditBadges({
  email,
  linkedPartyCount,
}: {
  email: FilemakerEmail;
  linkedPartyCount: number;
}): React.JSX.Element {
  return (
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
        Linked Parties: {linkedPartyCount}
      </Badge>
    </div>
  );
}

export function EmailDetailsSection({
  emailValue,
  setEmailValue,
  setStatus,
  status,
}: {
  emailValue: string;
  setEmailValue: React.Dispatch<React.SetStateAction<string>>;
  setStatus: React.Dispatch<React.SetStateAction<FilemakerEmailStatus>>;
  status: FilemakerEmailStatus;
}): React.JSX.Element {
  return (
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
            aria-label='name@example.com'
            title='name@example.com'
          />
        </FormField>
        <FormField label='Status'>
          <SelectSimple
            value={status}
            onValueChange={(value: string): void => {
              setStatus(normalizeFilemakerEmailStatus(value));
            }}
            options={FILEMAKER_EMAIL_STATUS_OPTIONS}
            placeholder='Select status'
            size='sm'
            ariaLabel='Select status'
            title='Select status'
          />
        </FormField>
      </div>
    </FormSection>
  );
}

function LinkedPersonRow({
  checked,
  onToggle,
  person,
}: {
  checked: boolean;
  onToggle: (personId: string, checked: boolean) => void;
  person: FilemakerPerson;
}): React.JSX.Element {
  const checkboxId = `filemaker-email-person-${person.id}`;
  return (
    <div className='flex items-start gap-3 rounded-md border border-border/60 bg-card/25 p-2'>
      <Checkbox
        id={checkboxId}
        checked={checked}
        onCheckedChange={(value): void => {
          onToggle(person.id, Boolean(value));
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
}

export function LinkedPersonsSection({
  linkedPersonIds,
  onToggle,
  persons,
}: {
  linkedPersonIds: string[];
  onToggle: (personId: string, checked: boolean) => void;
  persons: FilemakerPerson[];
}): React.JSX.Element {
  return (
    <FormSection title='Linked Persons' className='space-y-2 p-4'>
      {persons.length === 0 ? (
        <div className='text-xs text-gray-500'>No persons available in Filemaker.</div>
      ) : (
        persons.map((person: FilemakerPerson) => (
          <LinkedPersonRow
            key={person.id}
            checked={linkedPersonIds.includes(person.id)}
            onToggle={onToggle}
            person={person}
          />
        ))
      )}
    </FormSection>
  );
}

function LinkedOrganizationRow({
  checked,
  onToggle,
  organization,
}: {
  checked: boolean;
  onToggle: (organizationId: string, checked: boolean) => void;
  organization: FilemakerOrganization;
}): React.JSX.Element {
  const checkboxId = `filemaker-email-organization-${organization.id}`;
  return (
    <div className='flex items-start gap-3 rounded-md border border-border/60 bg-card/25 p-2'>
      <Checkbox
        id={checkboxId}
        checked={checked}
        onCheckedChange={(value): void => {
          onToggle(organization.id, Boolean(value));
        }}
      />
      <label htmlFor={checkboxId} className='min-w-0 flex-1 cursor-pointer'>
        <div className='text-xs font-medium text-white'>{organization.name}</div>
        <div className='text-[11px] text-gray-400'>{formatFilemakerAddress(organization)}</div>
      </label>
    </div>
  );
}

export function LinkedOrganizationsSection({
  linkedOrganizationIds,
  onToggle,
  organizations,
}: {
  linkedOrganizationIds: string[];
  onToggle: (organizationId: string, checked: boolean) => void;
  organizations: FilemakerOrganization[];
}): React.JSX.Element {
  return (
    <FormSection title='Linked Organizations' className='space-y-2 p-4'>
      {organizations.length === 0 ? (
        <div className='text-xs text-gray-500'>No organizations available in Filemaker.</div>
      ) : (
        organizations.map((organization: FilemakerOrganization) => (
          <LinkedOrganizationRow
            key={organization.id}
            checked={linkedOrganizationIds.includes(organization.id)}
            onToggle={onToggle}
            organization={organization}
          />
        ))
      )}
    </FormSection>
  );
}
