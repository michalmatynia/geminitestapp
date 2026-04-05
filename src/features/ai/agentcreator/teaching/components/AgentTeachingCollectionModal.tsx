'use client';

import React, { useMemo } from 'react';

import type { AgentTeachingEmbeddingCollectionRecord } from '@/shared/contracts/agent-teaching';
import { Input } from '@/shared/ui/primitives.public';
import { SettingsPanelBuilder } from '@/shared/ui/templates/SettingsPanelBuilder';
import type { SettingsPanelField } from '@/shared/contracts/ui';

import { useAgentTeachingCollectionsContext } from '../context/AgentTeachingCollectionsContext';

export function AgentTeachingCollectionModal(): React.JSX.Element | null {
  const {
    isModalOpen,
    closeModal,
    editingItem,
    embeddingModels,
    draft,
    setDraft,
    isSaving,
    handleSave,
  } = useAgentTeachingCollectionsContext();

  const fields: SettingsPanelField<Partial<AgentTeachingEmbeddingCollectionRecord>>[] = useMemo(
    () => [
      {
        key: 'name',
        label: 'Name',
        type: 'text',
        placeholder: 'e.g. "Product Manuals"',
        required: true,
      },
      {
        key: 'description',
        label: 'Description',
        type: 'textarea',
        placeholder: 'Optional description of contents',
      },
      {
        key: 'embeddingModel',
        label: 'Embedding Model',
        type: 'custom',
        helperText: editingItem
          ? 'Existing collections keep their stored embedding model. New collections use the AI Brain embedding capability.'
          : 'Brain-managed via Agent Teaching Embeddings. This field is informational only.',
        required: true,
        render: ({ value }) => {
          const currentValue =
            (typeof value === 'string' && value.trim()) || embeddingModels[0] || '';
          return (
            <Input
              value={currentValue || 'Not configured in AI Brain'}
              readOnly
              disabled
              className='cursor-not-allowed'
              placeholder='Not configured in AI Brain'
             aria-label='Not configured in AI Brain' title='Not configured in AI Brain'/>
          );
        },
      },
    ],
    [embeddingModels, editingItem]
  );

  const handleChange = (vals: Partial<Partial<AgentTeachingEmbeddingCollectionRecord>>) => {
    setDraft((prev) => ({ ...prev, ...vals }));
  };

  if (!isModalOpen) return null;

  return (
    <SettingsPanelBuilder
      open={isModalOpen}
      onClose={closeModal}
      size='sm'
      title={editingItem ? 'Edit Collection' : 'New Collection'}
      fields={fields}
      values={draft}
      onChange={handleChange}
      onSave={handleSave}
      isSaving={isSaving}
    />
  );
}
