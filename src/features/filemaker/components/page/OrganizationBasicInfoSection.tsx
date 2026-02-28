'use client';

import React from 'react';
import { FormSection, FormField, Input } from '@/shared/ui';
import { useAdminFilemakerOrganizationEditPageContext } from '../../context/AdminFilemakerOrganizationEditPageContext';
import type { FilemakerOrganization } from '../../types';

export function OrganizationBasicInfoSection(): React.JSX.Element {
  const { orgDraft, setOrgDraft } = useAdminFilemakerOrganizationEditPageContext();

  return (
    <FormSection title='Basic Information' className='space-y-4 p-4'>
      <div className='grid gap-4 md:grid-cols-2'>
        <FormField label='Organization Name'>
          <Input
            value={orgDraft.name ?? ''}
            onChange={(e) =>
              setOrgDraft((prev: Partial<FilemakerOrganization>) => ({
                ...prev,
                name: e.target.value,
              }))
            }
            placeholder='e.g. Acme Corp'
          />
        </FormField>
      </div>
    </FormSection>
  );
}
