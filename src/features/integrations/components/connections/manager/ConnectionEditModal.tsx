'use client';

import React, { useEffect, useState } from 'react';

import { useIntegrationsContext } from '@/features/integrations/context/IntegrationsContext';
import {
  createEmptyConnectionForm,
  type ConnectionFormState,
} from '@/features/integrations/context/integrations-context-types';
import type { IntegrationConnection } from '@/shared/contracts/integrations';
import { DetailModal, FormActions } from '@/shared/ui';

import { ConnectionFormFields } from './ConnectionFormFields';
import { toConnectionFormState } from './connectionFormUtils';

type ConnectionEditModalProps = {
  connection: IntegrationConnection | null;
  onClose: () => void;
};

export function ConnectionEditModal(props: ConnectionEditModalProps): React.JSX.Element {
  const { connection, onClose } = props;

  const { activeIntegration, handleSaveConnection } = useIntegrationsContext();
  const [form, setForm] = useState<ConnectionFormState>(createEmptyConnectionForm());
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!connection) {
      setForm(createEmptyConnectionForm());
      return;
    }
    setForm(toConnectionFormState(connection));
  }, [connection]);

  if (!connection || !activeIntegration) {
    return <></>;
  }

  const handleUpdate = async (): Promise<void> => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const saved = await handleSaveConnection({
        mode: 'update',
        connectionId: connection.id,
        formData: form,
      });
      if (saved) onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DetailModal
      isOpen={Boolean(connection)}
      onClose={onClose}
      title='Edit connection'
      subtitle={`Update settings for "${connection.name}"`}
      size='lg'
      footer={
        <FormActions
          onSave={() => void handleUpdate()}
          onCancel={onClose}
          saveText='Update connection'
          isSaving={isSaving}
        />
      }
    >
      <div className='space-y-3'>
        <ConnectionFormFields
          integrationSlug={activeIntegration.slug}
          form={form}
          setForm={setForm}
          mode='edit'
          selectedConnection={connection}
        />
      </div>
    </DetailModal>
  );
}
