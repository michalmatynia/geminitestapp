'use client';

import React, { useState } from 'react';

import {
  useIntegrationsActions,
  useIntegrationsData,
} from '@/features/integrations/context/IntegrationsContext';
import {
  createEmptyConnectionForm,
  type ConnectionFormState,
} from '@/features/integrations/context/integrations-context-types';
import { FormSection, FormActions } from '@/shared/ui';

import { ConnectionFormFields } from './ConnectionFormFields';

export function ConnectionForm(): React.JSX.Element {
  const { activeIntegration } = useIntegrationsData();
  const { handleSaveConnection } = useIntegrationsActions();
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
        <FormActions
          onSave={() => void handleCreate()}
          onCancel={resetForm}
          saveText='Save connection'
          cancelText='Clear form'
          isSaving={isSaving}
          className='flex-col !gap-2 *:w-full'
        />
      </div>
    </FormSection>
  );
}
