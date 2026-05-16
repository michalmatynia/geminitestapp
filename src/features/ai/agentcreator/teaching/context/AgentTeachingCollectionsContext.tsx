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

const resolveEmbeddingModel = (
  editingItem: AgentTeachingEmbeddingCollectionRecord | null,
  brainModel: string,
  draftModel: string
): string => {
  const editingModel = editingItem?.embeddingModel.trim() ?? '';
  if (editingModel !== '') return editingModel;
  if (brainModel !== '') return brainModel;
  return draftModel;
};

const resolveCollectionName = (draft: Partial<AgentTeachingEmbeddingCollectionRecord>): string =>
  draft.name?.trim() ?? '';

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
    const name = resolveCollectionName(draft);
    if (name === '') {
      toast('Collection name is required.', { variant: 'error' });
      return;
    }

    const brainModel = embeddingModelId.trim();
    const draftModel = draft.embeddingModel?.trim() ?? '';
    const model = resolveEmbeddingModel(editingItem, brainModel, draftModel);
    if (model === '') {
      toast('Configure Agent Teaching Embeddings in AI Brain first.', { variant: 'error' });
      return;
    }

    try {
      await saveCollection(editingItem, draft, model);
      const message = editingItem !== null ? 'Collection updated.' : 'Collection created.';
      toast(message, { variant: 'success' });
      closeModal();
    } catch (error) {
      logClientError(error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to save collection.';
      toast(errorMsg, { variant: 'error' });
    }
  };

  const handleDelete = async (item: AgentTeachingEmbeddingCollectionRecord | null): Promise<void> => {
    if (item === null) return;
    try {
      await remove({ id: item.id });
      toast('Collection deleted.', { variant: 'success' });
    } catch (error) {
      logClientError(error);
      const message = error instanceof Error ? error.message : 'Failed to delete collection.';
      toast(message, { variant: 'error' });
    } finally {
      setItemToDelete(null);
    }
  };

  return { handleSave, handleDelete };
};

interface AgentTeachingCollectionsModals {
  isModalOpen: boolean;
  editingItem: AgentTeachingEmbeddingCollectionRecord | null;
  draft: Partial<AgentTeachingEmbeddingCollectionRecord>;
  setDraft: React.Dispatch<React.SetStateAction<Partial<AgentTeachingEmbeddingCollectionRecord>>>;
  itemToDelete: AgentTeachingEmbeddingCollectionRecord | null;
  setItemToDelete: (item: AgentTeachingEmbeddingCollectionRecord | null) => void;
  openCreate: (defaultModel: string) => void;
  openEdit: (item: AgentTeachingEmbeddingCollectionRecord) => void;
  closeModal: () => void;
}

function useAgentTeachingCollectionsModals(): AgentTeachingCollectionsModals {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AgentTeachingEmbeddingCollectionRecord | null>(null);
  const [draft, setDraft] = useState<Partial<AgentTeachingEmbeddingCollectionRecord>>({});
  const [itemToDelete, setItemToDelete] = useState<AgentTeachingEmbeddingCollectionRecord | null>(null);

  const openCreate = useCallback((defaultModel: string) => {
    setEditingItem(null);
    setDraft({ name: '', description: '', embeddingModel: defaultModel });
    setIsModalOpen(true);
  }, []);

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

  return {
    isModalOpen, editingItem, draft, setDraft, itemToDelete, setItemToDelete,
    openCreate, openEdit, closeModal
  };
}

const useAgentTeachingCollections = (): AgentTeachingCollectionsContextValue => {
  const { toast } = useToast();
  const { collections, agents, embeddingModelId, isLoading } = useAgentTeachingQueriesContext();
  const { mutateAsync: upsert, isPending: isSaving } = useUpsertEmbeddingCollectionMutation();
  const { mutateAsync: remove, isPending: isDeleting } = useDeleteEmbeddingCollectionMutation();

  const embeddingModels = useMemo(() => {
    const normalized = embeddingModelId.trim();
    return normalized.length > 0 ? [normalized] : [];
  }, [embeddingModelId]);

  const modals = useAgentTeachingCollectionsModals();

  const { handleSave, handleDelete } = useCollectionActions({
    upsert, remove, toast, closeModal: modals.closeModal,
    editingItem: modals.editingItem, draft: modals.draft,
    embeddingModelId, setItemToDelete: modals.setItemToDelete,
  });

  const getUsedByCount = useCallback(
    (collectionId: string): number =>
      agents.filter((agent) => agent.collectionIds.includes(collectionId)).length,
    [agents]
  );

  return {
    collections, embeddingModels, isLoading, isSaving, isDeleting,
    isModalOpen: modals.isModalOpen, editingItem: modals.editingItem,
    draft: modals.draft, setDraft: modals.setDraft,
    itemToDelete: modals.itemToDelete, setItemToDelete: modals.setItemToDelete,
    openCreate: () => modals.openCreate(embeddingModels[0] ?? ''),
    openEdit: modals.openEdit, closeModal: modals.closeModal,
    handleSave, handleDelete: () => handleDelete(modals.itemToDelete),
    getUsedByCount,
  };
};


export function AgentTeachingCollectionsProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const value = useAgentTeachingCollections();
  return <AgentTeachingCollectionsContext.Provider value={value}>{children}</AgentTeachingCollectionsContext.Provider>;
}
