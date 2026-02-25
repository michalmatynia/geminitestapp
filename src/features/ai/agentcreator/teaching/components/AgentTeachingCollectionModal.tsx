'use client';

import React, { useMemo } from 'react';

import type { AgentTeachingEmbeddingCollectionRecord } from '@/shared/contracts/agent-teaching';
import { SettingsPanelBuilder, type SettingsField } from '@/shared/ui/templates/SettingsPanelBuilder';
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

  const fields: SettingsField<Partial<AgentTeachingEmbeddingCollectionRecord>>[] = useMemo(() => [
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
      type: 'select',
      options: embeddingModels.map(m => ({ value: m, label: m })),
      placeholder: 'Select model',
      helperText: 'Determines the vector space for semantic search. Cannot be changed after creation.',
      disabled: !!editingItem,
      required: true,
    }
  ], [embeddingModels, editingItem]);

  const handleChange = (vals: Partial<Partial<AgentTeachingEmbeddingCollectionRecord>>) => {
    setDraft(prev => ({ ...prev, ...vals }));
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
