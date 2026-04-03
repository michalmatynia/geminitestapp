'use client';

import React, { useMemo, useState, useCallback } from 'react';

import type { AgentTeachingEmbeddingCollectionRecord } from '@/shared/contracts/agent-teaching';
import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import { useToast } from '@/shared/ui';

import { useAgentTeachingQueriesContext } from './AgentTeachingContext';
import {
  useDeleteEmbeddingCollectionMutation,
  useUpsertEmbeddingCollectionMutation,
} from '../hooks/useAgentTeachingQueries';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

interface AgentTeachingCollectionsContextValue {
  collections: AgentTeachingEmbeddingCollectionRecord[];
  embeddingModels: string[];
  isLoading: boolean;
  isSaving: boolean;
  isDeleting: boolean;

  // Modal State
  isModalOpen: boolean;
  editingItem: AgentTeachingEmbeddingCollectionRecord | null;
  draft: Partial<AgentTeachingEmbeddingCollectionRecord>;
  setDraft: React.Dispatch<React.SetStateAction<Partial<AgentTeachingEmbeddingCollectionRecord>>>;

  // Delete State
  itemToDelete: AgentTeachingEmbeddingCollectionRecord | null;
  setItemToDelete: (item: AgentTeachingEmbeddingCollectionRecord | null) => void;

  // Actions
  openCreate: () => void;
  openEdit: (item: AgentTeachingEmbeddingCollectionRecord) => void;
  closeModal: () => void;
  handleSave: () => Promise<void>;
  handleDelete: () => Promise<void>;
  getUsedByCount: (collectionId: string) => number;
}

const {
  Context: AgentTeachingCollectionsContext,
  useStrictContext: useAgentTeachingCollectionsContext,
} = createStrictContext<AgentTeachingCollectionsContextValue>({
  hookName: 'useAgentTeachingCollectionsContext',
  providerName: 'AgentTeachingCollectionsProvider',
  displayName: 'AgentTeachingCollectionsContext',
  errorFactory: internalError,
});
export { useAgentTeachingCollectionsContext };

export function AgentTeachingCollectionsProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const { toast } = useToast();
  const { collections, agents, embeddingModelId, isLoading } = useAgentTeachingQueriesContext();

  const embeddingModels = useMemo(() => {
    const normalized = embeddingModelId.trim();
    if (normalized) return [normalized];
    return [];
  }, [embeddingModelId]);

  const { mutateAsync: upsert, isPending: isSaving } = useUpsertEmbeddingCollectionMutation();
  const { mutateAsync: remove, isPending: isDeleting } = useDeleteEmbeddingCollectionMutation();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AgentTeachingEmbeddingCollectionRecord | null>(
    null
  );
  const [draft, setDraft] = useState<Partial<AgentTeachingEmbeddingCollectionRecord>>({});
  const [itemToDelete, setItemToDelete] = useState<AgentTeachingEmbeddingCollectionRecord | null>(
    null
  );

  const openCreate = useCallback(() => {
    setEditingItem(null);
    setDraft({
      name: '',
      description: '',
      embeddingModel: embeddingModels[0] ?? '',
    });
    setIsModalOpen(true);
  }, [embeddingModels]);

  const openEdit = useCallback((item: AgentTeachingEmbeddingCollectionRecord) => {
    setEditingItem(item);
    setDraft({ ...item });
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingItem(null);
    setDraft({});
  }, []);

  const handleSave = async () => {
    const name = draft.name?.trim();
    if (!name) {
      toast('Collection name is required.', { variant: 'error' });
      return;
    }
    const embeddingModel = editingItem
      ? editingItem.embeddingModel.trim()
      : embeddingModelId.trim() || draft.embeddingModel?.trim() || '';
    if (!embeddingModel) {
      toast('Configure Agent Teaching Embeddings in AI Brain first.', { variant: 'error' });
      return;
    }
    try {
      await upsert({
        ...(editingItem?.id ? { id: editingItem.id } : {}),
        name,
        description: typeof draft.description === 'string' ? draft.description : null,
        embeddingModel,
      });
      toast(editingItem ? 'Collection updated.' : 'Collection created.', { variant: 'success' });
      closeModal();
    } catch (error) {
      logClientError(error);
      toast(error instanceof Error ? error.message : 'Failed to save collection.', {
        variant: 'error',
      });
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      await remove({ id: itemToDelete.id });
      toast('Collection deleted.', { variant: 'success' });
    } catch (error) {
      logClientError(error);
      toast(error instanceof Error ? error.message : 'Failed to delete collection.', {
        variant: 'error',
      });
    } finally {
      setItemToDelete(null);
    }
  };

  const getUsedByCount = useCallback(
    (collectionId: string): number =>
      agents.filter((agent) => (agent.collectionIds ?? []).includes(collectionId)).length,
    [agents]
  );

  const value = useMemo(
    (): AgentTeachingCollectionsContextValue => ({
      collections,
      embeddingModels,
      isLoading,
      isSaving,
      isDeleting,
      isModalOpen,
      editingItem,
      draft,
      setDraft,
      itemToDelete,
      setItemToDelete,
      openCreate,
      openEdit,
      closeModal,
      handleSave,
      handleDelete,
      getUsedByCount,
    }),
    [
      collections,
      embeddingModels,
      isLoading,
      isSaving,
      isDeleting,
      isModalOpen,
      editingItem,
      draft,
      itemToDelete,
      openCreate,
      openEdit,
      closeModal,
      handleSave,
      handleDelete,
      getUsedByCount,
    ]
  );

  return (
    <AgentTeachingCollectionsContext.Provider value={value}>
      {children}
    </AgentTeachingCollectionsContext.Provider>
  );
}
