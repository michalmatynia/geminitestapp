'use client';

import React, { useMemo } from 'react';

import type { AgentTeachingEmbeddingCollectionRecord } from '@/shared/types/domain/agent-teaching';
import type { EntityModalProps } from '@/shared/types/modal-props';
import { SettingsPanelBuilder, type SettingsField } from '@/shared/ui/templates/SettingsPanelBuilder';

interface AgentTeachingCollectionModalProps extends EntityModalProps<AgentTeachingEmbeddingCollectionRecord, string> {
  draft: Partial<AgentTeachingEmbeddingCollectionRecord>;
  setDraft: React.Dispatch<React.SetStateAction<Partial<AgentTeachingEmbeddingCollectionRecord>>>;
  isSaving: boolean;
  onSave: () => void;
}

export function AgentTeachingCollectionModal({
  isOpen,
  onClose,
  item: editing,
  items: embeddingModels = [],
  draft,
  setDraft,
  isSaving,
  onSave,
}: AgentTeachingCollectionModalProps): React.JSX.Element | null {
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
      disabled: !!editing,
      required: true,
    }
  ], [embeddingModels, editing]);

  const handleChange = (vals: Partial<Partial<AgentTeachingEmbeddingCollectionRecord>>) => {
    setDraft(prev => ({ ...prev, ...vals }));
  };

  return (
    <SettingsPanelBuilder
      open={isOpen}
      onClose={onClose}
      size='sm'
      title={editing ? 'Edit Collection' : 'New Collection'}
      fields={fields}
      values={draft}
      onChange={handleChange}
      onSave={async () => onSave()}
      isSaving={isSaving}
    />
  );
}
