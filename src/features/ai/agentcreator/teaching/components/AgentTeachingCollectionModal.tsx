'use client';

import React from 'react';

import type { AgentTeachingEmbeddingCollectionRecord } from '@/shared/types/domain/agent-teaching';
import type { EntityModalProps } from '@/shared/types/modal-props';
import { FormField, FormModal, Input, SelectSimple, Textarea } from '@/shared/ui';

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
  if (!isOpen) return null;

  return (
    <FormModal
      open={isOpen}
      onClose={onClose}
      size='sm'
      title={editing ? 'Edit Collection' : 'New Collection'}
      onSave={onSave}
      isSaving={isSaving}
    >
      <div className='space-y-4'>
        <FormField label='Name'>
          <Input
            value={draft.name ?? ''}
            onChange={(e) => setDraft(prev => ({ ...prev, name: e.target.value }))}
            placeholder='e.g. "Product Manuals"'
          />
        </FormField>
        
        <FormField label='Description'>
          <Textarea
            value={draft.description ?? ''}
            onChange={(e) => setDraft(prev => ({ ...prev, description: e.target.value }))}
            placeholder='Optional description of contents'
            className='min-h-[80px]'
          />
        </FormField>

        <FormField
          label='Embedding Model'
          description='Determines the vector space for semantic search. Cannot be changed after creation.'
        >
          <SelectSimple
            size='sm'
            value={draft.embeddingModel ?? ''}
            onValueChange={(val) => setDraft(prev => ({ ...prev, embeddingModel: val }))}
            options={embeddingModels.map(m => ({ value: m, label: m }))}
            placeholder='Select model'
            disabled={!!editing}
          />
        </FormField>
      </div>
    </FormModal>
  );
}
