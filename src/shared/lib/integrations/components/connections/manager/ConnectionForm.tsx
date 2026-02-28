'use client';

import React, { useState } from 'react';

import { useIntegrationsContext } from '@/shared/lib/integrations/context/IntegrationsContext';
import {
  createEmptyConnectionForm,
  type ConnectionFormState,
} from '@/shared/lib/integrations/context/integrations-context-types';
import { Button, FormSection } from '@/shared/ui';

import { ConnectionFormFields } from './ConnectionFormFields';

export function ConnectionForm(): React.JSX.Element {
  const { activeIntegration, handleSaveConnection } = useIntegrationsContext();
  const [createForm, setCreateForm] = useState<ConnectionFormState>(createEmptyConnectionForm());
  const [isSaving, setIsSaving] = useState(false);

  if (!activeIntegration) return <></>;

  const resetForm = (): void => {
    setCreateForm(createEmptyConnectionForm());
  };

  const handleCreate = async (): Promise<void> => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const saved = await handleSaveConnection({
        mode: 'create',
        formData: createForm,
      });
      if (saved) {
        resetForm();
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <FormSection title='Add connection' className='p-4'>
      <div className='space-y-3'>
        <ConnectionFormFields
          integrationSlug={activeIntegration.slug}
          form={createForm}
          setForm={setCreateForm}
          mode='create'
        />
        <Button
          className='w-full font-semibold'
          type='button'
          variant='solid'
          disabled={isSaving}
          onClick={() => {
            void handleCreate();
          }}
        >
          {isSaving ? 'Saving...' : 'Save connection'}
        </Button>
        <Button
          className='w-full font-semibold'
          type='button'
          variant='outline'
          disabled={isSaving}
          onClick={resetForm}
        >
          Clear form
        </Button>
      </div>
    </FormSection>
  );
}
