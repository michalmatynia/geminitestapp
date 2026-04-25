'use client';

import React from 'react';

import { FormField, FormSection } from '@/shared/ui/forms-and-actions.public';
import { Input } from '@/shared/ui/primitives.public';

import { useAdminFilemakerOrganizationEditPageStateContext } from '../../context/AdminFilemakerOrganizationEditPageContext';
import { formatTimestamp } from '../../pages/filemaker-page-utils';
import type { FilemakerOrganization } from '../../types';

const MISSING_METADATA_VALUE = 'Not imported';

type OrganizationMetadataField = {
  label: string;
  value: string;
};

const metadataValue = (value: string | null | undefined): string =>
  value !== null && value !== undefined && value.trim().length > 0
    ? value
    : MISSING_METADATA_VALUE;

const buildOrganizationMetadataFields = (
  organization: FilemakerOrganization
): OrganizationMetadataField[] => [
  { label: 'New ID', value: organization.id },
  { label: 'Legacy UUID', value: metadataValue(organization.legacyUuid) },
  { label: 'Created', value: formatTimestamp(organization.createdAt) },
  { label: 'Modified', value: formatTimestamp(organization.updatedAt) },
  { label: 'Modified By', value: metadataValue(organization.updatedBy) },
  { label: 'Legacy Parent UUID', value: metadataValue(organization.legacyParentUuid) },
  {
    label: 'Default Address Legacy UUID',
    value: metadataValue(organization.legacyDefaultAddressUuid),
  },
  {
    label: 'Display Address Legacy UUID',
    value: metadataValue(organization.legacyDisplayAddressUuid),
  },
  {
    label: 'Default Bank Account Legacy UUID',
    value: metadataValue(organization.legacyDefaultBankAccountUuid),
  },
  {
    label: 'Display Bank Account Legacy UUID',
    value: metadataValue(organization.legacyDisplayBankAccountUuid),
  },
  { label: 'Parent Organization ID', value: metadataValue(organization.parentOrganizationId) },
  { label: 'Default Address ID', value: metadataValue(organization.addressId) },
  { label: 'Display Address ID', value: metadataValue(organization.displayAddressId) },
  {
    label: 'Default Bank Account ID',
    value: metadataValue(organization.defaultBankAccountId),
  },
  {
    label: 'Display Bank Account ID',
    value: metadataValue(organization.displayBankAccountId),
  },
];

function MetadataInput(props: OrganizationMetadataField): React.JSX.Element {
  return (
    <FormField label={props.label}>
      <Input
        value={props.value}
        readOnly
        className='font-mono text-xs'
        aria-label={props.label}
        title={props.value}
      />
    </FormField>
  );
}

export function OrganizationLegacyMetadataSection(): React.JSX.Element | null {
  const { organization } = useAdminFilemakerOrganizationEditPageStateContext();
  if (organization === null) return null;

  return (
    <FormSection title='Legacy Organiser Metadata' className='space-y-4 p-4'>
      <div className='grid gap-3 md:grid-cols-2'>
        {buildOrganizationMetadataFields(organization).map((field: OrganizationMetadataField) => (
          <MetadataInput key={field.label} label={field.label} value={field.value} />
        ))}
      </div>
    </FormSection>
  );
}
