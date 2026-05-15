'use client';

import React, { useMemo, useState, useCallback } from 'react';

import type { AgentTeachingEmbeddingCollectionRecord } from '@/shared/contracts/agent-teaching';
import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import { useToast } from '@/shared/ui/primitives.public';

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
  isModalOpen: boolean;
  editingItem: AgentTeachingEmbeddingCollectionRecord | null;
  draft: Partial<AgentTeachingEmbeddingCollectionRecord>;
  setDraft: React.Dispatch<React.SetStateAction<Partial<AgentTeachingEmbeddingCollectionRecord>>>;
  itemToDelete: AgentTeachingEmbeddingCollectionRecord | null;
  setItemToDelete: (item: AgentTeachingEmbeddingCollectionRecord | null) => void;
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

const useCollectionActions = (args: {
  upsert: (vars: { id?: string; name: string; description: string | null; embeddingModel: string }) => Promise<unknown>,
  remove: (vars: { id: string }) => Promise<unknown>,
  toast: (message: string, options: { variant: 'error' | 'success' }) => void,
  closeModal: () => void,
  editingItem: AgentTeachingEmbeddingCollectionRecord | null,
  draft: Partial<AgentTeachingEmbeddingCollectionRecord>,
  embeddingModelId: string,
  setItemToDelete: (item: AgentTeachingEmbeddingCollectionRecord | null) => void
}): { handleSave: () => Promise<void>; handleDelete: (item: AgentTeachingEmbeddingCollectionRecord | null) => Promise<void> } => {
  const { upsert, remove, toast, closeModal, editingItem, draft, embeddingModelId, setItemToDelete } = args;

  const saveCollection = async (item: AgentTeachingEmbeddingCollectionRecord | null, data: Partial<AgentTeachingEmbeddingCollectionRecord>, model: string): Promise<void> => {
    await upsert({
      id: item?.id,
      name: data.name ?? '',
      description: typeof data.description === 'string' ? data.description : null,
      embeddingModel: model,
    });
  };

  const handleSave = async (): Promise<void> => {
    const name = draft.name?.trim();
    if (name === undefined || name === '') {
      toast('Collection name is required.', { variant: 'error' });
      return;
    }

    const brainModel = embeddingModelId.trim();
    const draftModel = draft.embeddingModel?.trim() ?? '';
    const editingModel = editingItem?.embeddingModel.trim() ?? '';

    const model = editingModel !== '' ? editingModel : (brainModel !== '' ? brainModel : draftModel);

    if (model === '') {
      toast('Configure Agent Teaching Embeddings in AI Brain first.', { variant: 'error' });
      return;
    }
    try {
      await saveCollection(editingItem, draft, model);
      toast(editingItem ? 'Collection updated.' : 'Collection created.', { variant: 'success' });
      closeModal();
    } catch (error) {
      logClientError(error);
      toast(error instanceof Error ? error.message : 'Failed to save collection.', { variant: 'error' });
    }
  };

  const handleDelete = async (item: AgentTeachingEmbeddingCollectionRecord | null): Promise<void> => {
    if (item === null) return;
    try {
      await remove({ id: item.id });
      toast('Collection deleted.', { variant: 'success' });
    } catch (error) {
      logClientError(error);
      toast(error instanceof Error ? error.message : 'Failed to delete collection.', { variant: 'error' });
    } finally {
      setItemToDelete(null);
    }
  };

  return { handleSave, handleDelete };
};

const useAgentTeachingCollections = (): AgentTeachingCollectionsContextValue => {
  const { toast } = useToast();
  const { collections, agents, embeddingModelId, isLoading } = useAgentTeachingQueriesContext();

  const embeddingModels = useMemo(() => {
    const normalized = embeddingModelId.trim();
    return normalized.length > 0 ? [normalized] : [];
  }, [embeddingModelId]);

  const { mutateAsync: upsert, isPending: isSaving } = useUpsertEmbeddingCollectionMutation();
  const { mutateAsync: remove, isPending: isDeleting } = useDeleteEmbeddingCollectionMutation();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AgentTeachingEmbeddingCollectionRecord | null>(null);
  const [draft, setDraft] = useState<Partial<AgentTeachingEmbeddingCollectionRecord>>({});
  const [itemToDelete, setItemToDelete] = useState<AgentTeachingEmbeddingCollectionRecord | null>(null);

  const openCreate = useCallback(() => {
    setEditingItem(null);
    setDraft({ name: '', description: '', embeddingModel: embeddingModels[0] ?? '' });
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

  const { handleSave, handleDelete } = useCollectionActions({
    upsert,
    remove,
    toast,
    closeModal,
    editingItem,
    draft,
    embeddingModelId,
    setItemToDelete,
  });

  const getUsedByCount = useCallback(
    (collectionId: string): number =>
      agents.filter((agent) => agent.collectionIds.includes(collectionId)).length,
    [agents]
  );

  return {
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
    handleDelete: () => handleDelete(itemToDelete),
    getUsedByCount,
  };
};


export function AgentTeachingCollectionsProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const value = useAgentTeachingCollections();
  return <AgentTeachingCollectionsContext.Provider value={value}>{children}</AgentTeachingCollectionsContext.Provider>;
}
