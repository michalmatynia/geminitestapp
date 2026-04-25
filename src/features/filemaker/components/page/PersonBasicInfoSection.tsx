'use client';

import React from 'react';

import { FormSection, FormField } from '@/shared/ui/forms-and-actions.public';
import { Input } from '@/shared/ui/primitives.public';
import { UI_GRID_RELAXED_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';

import {
  useAdminFilemakerPersonEditPageActionsContext,
  useAdminFilemakerPersonEditPageStateContext,
} from '../../context/AdminFilemakerPersonEditPageContext';
import { FilemakerLinkedEmailsField } from '../shared/FilemakerLinkedEmailsField';

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
      </div>
    </FormSection>
  );
}
