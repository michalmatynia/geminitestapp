'use client';

import React, { useMemo } from 'react';

import type { AgentTeachingEmbeddingCollectionRecord } from '@/shared/contracts/agent-teaching';
import { Input } from '@/shared/ui/primitives.public';
import { SettingsPanelBuilder } from '@/shared/ui/templates/SettingsPanelBuilder';
import type { SettingsPanelField } from '@/shared/contracts/ui/settings';

import { useAgentTeachingCollectionsContext } from '../context/AgentTeachingCollectionsContext';

const resolveEmbeddingModelValue = (value: unknown, embeddingModels: string[]): string => {
  const currentValue = typeof value === 'string' ? value.trim() : '';
  if (currentValue.length > 0) {
    return currentValue;
  }
  return embeddingModels[0] ?? '';
};

const buildCollectionFields = ({
  embeddingModels,
  editingItem,
}: {
  embeddingModels: string[];
  editingItem: AgentTeachingEmbeddingCollectionRecord | null;
}): SettingsPanelField<Partial<AgentTeachingEmbeddingCollectionRecord>>[] => [
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
    helperText:
      editingItem !== null
        ? 'Existing collections keep their stored embedding model. New collections use the AI Brain embedding capability.'
        : 'Brain-managed via Agent Teaching Embeddings. This field is informational only.',
    required: true,
    render: ({ value }): React.JSX.Element => {
      const currentValue = resolveEmbeddingModelValue(value, embeddingModels);
      return (
        <Input
          value={currentValue.length > 0 ? currentValue : 'Not configured in AI Brain'}
          readOnly
          disabled
          className='cursor-not-allowed'
          placeholder='Not configured in AI Brain'
          aria-label='Not configured in AI Brain'
          title='Not configured in AI Brain'
        />
      );
    },
  },
];

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
    () => buildCollectionFields({ embeddingModels, editingItem }),
    [embeddingModels, editingItem]
  );

  const handleChange = (vals: Partial<Partial<AgentTeachingEmbeddingCollectionRecord>>): void => {
    setDraft((prev) => ({ ...prev, ...vals }));
  };

  if (!isModalOpen) {
    return null;
  }

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
