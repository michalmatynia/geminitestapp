'use client';

import { useMemo, useState, useCallback } from 'react';

import type {
  AgentTeachingAgentRecord,
  AgentTeachingEmbeddingCollectionRecord,
} from '@/shared/contracts/agent-teaching';
import { useToast } from '@/shared/ui/primitives.public';

import { useAgentTeachingQueriesContext } from '../context/AgentTeachingContext';
import {
  useDeleteEmbeddingCollectionMutation,
  useUpsertEmbeddingCollectionMutation,
} from '../hooks/useAgentTeachingQueries';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

export interface AgentTeachingCollectionsState {
  collections: AgentTeachingEmbeddingCollectionRecord[];
  agents: AgentTeachingAgentRecord[];
  embeddingModels: string[];
  isLoading: boolean;
  saving: boolean;
  deleting: boolean;
  modalOpen: boolean;
  setModalOpen: (open: boolean) => void;
  editing: AgentTeachingEmbeddingCollectionRecord | null;
  draft: Partial<AgentTeachingEmbeddingCollectionRecord>;
  setDraft: React.Dispatch<React.SetStateAction<Partial<AgentTeachingEmbeddingCollectionRecord>>>;
  itemToDelete: AgentTeachingEmbeddingCollectionRecord | null;
  setItemToDelete: (item: AgentTeachingEmbeddingCollectionRecord | null) => void;
  openCreate: () => void;
  openEdit: (item: AgentTeachingEmbeddingCollectionRecord) => void;
  closeModal: () => void;
  handleSave: () => Promise<void>;
  handleDelete: () => Promise<void>;
  usedByCount: (collectionId: string) => number;
}

interface AgentTeachingCollectionsModals {
  modalOpen: boolean;
  setModalOpen: (open: boolean) => void;
  editing: AgentTeachingEmbeddingCollectionRecord | null;
  draft: Partial<AgentTeachingEmbeddingCollectionRecord>;
  setDraft: React.Dispatch<React.SetStateAction<Partial<AgentTeachingEmbeddingCollectionRecord>>>;
  itemToDelete: AgentTeachingEmbeddingCollectionRecord | null;
  setItemToDelete: (item: AgentTeachingEmbeddingCollectionRecord | null) => void;
  openCreate: () => void;
  openEdit: (item: AgentTeachingEmbeddingCollectionRecord) => void;
  closeModal: () => void;
}

function useAgentTeachingCollectionsModals(defaultModel: string): AgentTeachingCollectionsModals {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AgentTeachingEmbeddingCollectionRecord | null>(null);
  const [draft, setDraft] = useState<Partial<AgentTeachingEmbeddingCollectionRecord>>({});
  const [itemToDelete, setItemToDelete] = useState<AgentTeachingEmbeddingCollectionRecord | null>(null);

  const openCreate = useCallback(() => {
    setEditing(null);
    setDraft({ name: '', description: '', embeddingModel: defaultModel });
    setModalOpen(true);
  }, [defaultModel]);

  const openEdit = useCallback((item: AgentTeachingEmbeddingCollectionRecord) => {
    setEditing(item);
    setDraft({ ...item });
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditing(null);
    setDraft({});
  }, []);

  return {
    modalOpen, setModalOpen, editing, draft, setDraft,
    itemToDelete, setItemToDelete, openCreate, openEdit, closeModal
  };
}

interface AgentTeachingCollectionsActions {
  handleSave: () => Promise<void>;
  handleDelete: () => Promise<void>;
}

const resolveDraftName = (draft: Partial<AgentTeachingEmbeddingCollectionRecord>): string =>
  draft.name?.trim() ?? '';

const resolveDraftModel = (draft: Partial<AgentTeachingEmbeddingCollectionRecord>): string =>
  draft.embeddingModel?.trim() ?? '';

function useAgentTeachingCollectionsActions(args: {
  modals: AgentTeachingCollectionsModals;
  upsert: (vars: { id?: string; name: string; description: string | null; embeddingModel: string }) => Promise<unknown>;
  remove: (vars: { id: string }) => Promise<unknown>;
  toast: (message: string, options: { variant: 'error' | 'success' }) => void;
}): AgentTeachingCollectionsActions {
  const { modals, upsert, remove, toast } = args;

  const validateInput = (name: string, model: string): boolean => {
    if (name === '') {
      toast('Collection name is required.', { variant: 'error' });
      return false;
    }
    if (model === '') {
      toast('Embedding model is required.', { variant: 'error' });
      return false;
    }
    return true;
  };

  const handleSave = async (): Promise<void> => {
    const name = resolveDraftName(modals.draft);
    const model = resolveDraftModel(modals.draft);
    if (!validateInput(name, model)) return;

    try {
      const description = typeof modals.draft.description === 'string' ? modals.draft.description : null;
      await upsert({ id: modals.editing?.id, name, description, embeddingModel: model });
      const message = modals.editing !== null ? 'Collection updated.' : 'Collection created.';
      toast(message, { variant: 'success' });
      modals.closeModal();
    } catch (error) {
      logClientError(error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to save collection.';
      toast(errorMsg, { variant: 'error' });
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (modals.itemToDelete === null) return;
    try {
      await remove({ id: modals.itemToDelete.id });
      toast('Collection deleted.', { variant: 'success' });
    } catch (error) {
      logClientError(error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to delete collection.';
      toast(errorMsg, { variant: 'error' });
    } finally {
      modals.setItemToDelete(null);
    }
  };

  return { handleSave, handleDelete };
}

export function useAgentTeachingCollectionsState(): AgentTeachingCollectionsState {
  const { toast } = useToast();
  const { collections, agents, embeddingModelId, isLoading } = useAgentTeachingQueriesContext();
  const embeddingModels = useMemo(() => {
    const normalized = embeddingModelId.trim();
    return normalized !== '' ? [normalized] : [];
  }, [embeddingModelId]);

  const { mutateAsync: upsert, isPending: saving } = useUpsertEmbeddingCollectionMutation();
  const { mutateAsync: remove, isPending: deleting } = useDeleteEmbeddingCollectionMutation();

  const modals = useAgentTeachingCollectionsModals(embeddingModels[0] ?? '');
  const { handleSave, handleDelete } = useAgentTeachingCollectionsActions({ modals, upsert, remove, toast });

  const usedByCount = useCallback(
    (collectionId: string): number =>
      agents.filter((agent: AgentTeachingAgentRecord) => agent.collectionIds.includes(collectionId)).length,
    [agents]
  );

  return {
    collections, agents, embeddingModels, isLoading, saving, deleting,
    ...modals,
    handleSave, handleDelete, usedByCount,
  };
}
