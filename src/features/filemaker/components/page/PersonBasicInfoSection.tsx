'use client';

import React from 'react';

import { FormSection, FormField } from '@/shared/ui/forms-and-actions.public';
import { Badge, Input } from '@/shared/ui/primitives.public';
import { UI_GRID_RELAXED_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';

import {
  useAdminFilemakerPersonEditPageActionsContext,
  useAdminFilemakerPersonEditPageStateContext,
} from '../../context/AdminFilemakerPersonEditPageContext';
import type {
  MongoFilemakerPerson,
  MongoFilemakerPersonOrganizationLink,
} from '../../pages/AdminFilemakerPersonsPage.types';
import { formatFilemakerAddress } from '../../settings';
import { FilemakerLinkedEmailsField } from '../shared/FilemakerLinkedEmailsField';

const isMongoFilemakerPerson = (value: unknown): value is MongoFilemakerPerson => {
  if (typeof value !== 'object' || value === null) return false;
  return Array.isArray((value as { linkedOrganizations?: unknown }).linkedOrganizations);
};

function PersonLinkedOrganizationsField(): React.JSX.Element | null {
  const { person } = useAdminFilemakerPersonEditPageStateContext();
  if (!isMongoFilemakerPerson(person)) return null;
  const links = person.linkedOrganizations;
  return (
    <FormField label='Linked Organisations' className='md:col-span-2'>
      <div className='flex min-h-10 flex-wrap items-center gap-2 rounded-md border border-border bg-background px-3 py-2'>
        {links.length === 0 ? (
          <span className='text-xs text-muted-foreground'>No linked organisations.</span>
        ) : (
          links.map((link: MongoFilemakerPersonOrganizationLink) => {
            const organizationName = link.organizationName?.trim() ?? '';
            const organizationId = link.organizationId?.trim() ?? '';
            const label =
              organizationName.length > 0 ? organizationName : link.legacyOrganizationUuid;
            if (organizationId.length === 0) {
              return (
                <Badge key={link.id} variant='outline' className='max-w-72 truncate text-[10px]'>
                  {label}
                </Badge>
              );
            }
            return (
              <a key={link.id} href={`/admin/filemaker/organizations/${encodeURIComponent(organizationId)}`}>
                <Badge variant='outline' className='max-w-72 truncate text-[10px]'>
                  {label}
                </Badge>
              </a>
            );
          })
        )}
      </div>
    </FormField>
  );
}

function PersonLinkedAddressesField(): React.JSX.Element {
  const { editableAddresses } = useAdminFilemakerPersonEditPageStateContext();
  const resolveAddressLabel = (address: (typeof editableAddresses)[number]): string => {
    const formattedAddress = formatFilemakerAddress(address);
    if (formattedAddress.length > 0) return formattedAddress;
    const legacyUuid = address.legacyUuid?.trim() ?? '';
    if (legacyUuid.length > 0) return legacyUuid;
    return address.addressId;
  };
  return (
    <FormField label='Linked Addresses' className='md:col-span-2'>
      <div className='flex min-h-10 flex-wrap items-center gap-2 rounded-md border border-border bg-background px-3 py-2'>
        {editableAddresses.length === 0 ? (
          <span className='text-xs text-muted-foreground'>No linked addresses.</span>
        ) : (
          editableAddresses.map((address) => {
            const label = resolveAddressLabel(address);
            return (
              <Badge
                key={address.addressId}
                variant={address.isDefault ? 'default' : 'outline'}
                className='max-w-96 truncate text-[10px]'
              >
                {address.isDefault ? `Default: ${label}` : label}
              </Badge>
            );
          })
        )}
      </div>
    </FormField>
  );
}

export function PersonBasicInfoSection(): React.JSX.Element {
  const { emails, personDraft } = useAdminFilemakerPersonEditPageStateContext();
  const { setPersonDraft } = useAdminFilemakerPersonEditPageActionsContext();

  return (
    <FormSection title='Basic Information' className='space-y-4 p-4'>
      <div className={`${UI_GRID_RELAXED_CLASSNAME} md:grid-cols-2`}>
        <FormField label='First Name'>
          <Input
            value={personDraft.firstName ?? ''}
            onChange={(e) => setPersonDraft({ ...personDraft, firstName: e.target.value })}
            placeholder='e.g. John'
           aria-label='e.g. John' title='e.g. John'/>
        </FormField>
        <FormField label='Last Name'>
          <Input
            value={personDraft.lastName ?? ''}
            onChange={(e) => setPersonDraft({ ...personDraft, lastName: e.target.value })}
            placeholder='e.g. Doe'
           aria-label='e.g. Doe' title='e.g. Doe'/>
        </FormField>
        <FormField label='NIP'>
          <Input
            value={personDraft.nip ?? ''}
            onChange={(e) => setPersonDraft({ ...personDraft, nip: e.target.value })}
            placeholder='Tax Identification Number'
           aria-label='Tax Identification Number' title='Tax Identification Number'/>
        </FormField>
        <FormField label='REGON'>
          <Input
            value={personDraft.regon ?? ''}
            onChange={(e) => setPersonDraft({ ...personDraft, regon: e.target.value })}
            placeholder='Business Registry Number'
           aria-label='Business Registry Number' title='Business Registry Number'/>
        </FormField>
        <FilemakerLinkedEmailsField emails={emails} className='md:col-span-2' />
        <PersonLinkedAddressesField />
        <PersonLinkedOrganizationsField />
      </div>
    </FormSection>
  );
}
