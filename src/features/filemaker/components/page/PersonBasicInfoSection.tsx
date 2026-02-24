'use client';

import React from 'react';
import { FormSection, FormField, Input } from '@/shared/ui';
import { useAdminFilemakerPersonEditPageContext } from '../../context/AdminFilemakerPersonEditPageContext';

export function PersonBasicInfoSection(): React.JSX.Element {
  const { personDraft, setPersonDraft } = useAdminFilemakerPersonEditPageContext();

  return (
    <FormSection title='Basic Information' className='space-y-4 p-4'>
      <div className='grid gap-4 md:grid-cols-2'>
        <FormField label='First Name'>
          <Input
            value={personDraft.firstName ?? ''}
            onChange={(e) => setPersonDraft({ ...personDraft, firstName: e.target.value })}
            placeholder='e.g. John'
          />
        </FormField>
        <FormField label='Last Name'>
          <Input
            value={personDraft.lastName ?? ''}
            onChange={(e) => setPersonDraft({ ...personDraft, lastName: e.target.value })}
            placeholder='e.g. Doe'
          />
        </FormField>
        <FormField label='NIP'>
          <Input
            value={personDraft.nip ?? ''}
            onChange={(e) => setPersonDraft({ ...personDraft, nip: e.target.value })}
            placeholder='Tax Identification Number'
          />
        </FormField>
        <FormField label='REGON'>
          <Input
            value={personDraft.regon ?? ''}
            onChange={(e) => setPersonDraft({ ...personDraft, regon: e.target.value })}
            placeholder='Business Registry Number'
          />
        </FormField>
      </div>
    </FormSection>
  );
}
