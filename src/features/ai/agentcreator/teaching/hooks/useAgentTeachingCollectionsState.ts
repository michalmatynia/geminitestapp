'use client';

import { useMemo, useState, useCallback } from 'react';

import { buildModelProfile } from '@/features/ai/chatbot/utils';
import type { AgentTeachingAgentRecord, AgentTeachingEmbeddingCollectionRecord } from '@/shared/contracts/agent-teaching';
import { useToast } from '@/shared/ui';

import { useAgentTeachingQueriesContext } from '../context/AgentTeachingContext';
import { useDeleteEmbeddingCollectionMutation, useUpsertEmbeddingCollectionMutation } from '../hooks/useAgentTeachingQueries';

const isEmbeddingModel = (model: string): boolean => buildModelProfile(model).isEmbedding;

export function useAgentTeachingQueriesCollectionsState() {
  const { toast } = useToast();
  const { collections, agents, modelOptions, isLoading } = useAgentTeachingQueriesContext();
  const normalizedModelOptions = useMemo(
    () =>
      (Array.isArray(modelOptions) ? modelOptions : [])
        .filter((model): model is string => typeof model === 'string')
        .map((model) => model.trim())
        .filter((model) => model.length > 0),
    [modelOptions]
  );

  const embeddingModels = useMemo(
    () => normalizedModelOptions.filter((m: string) => isEmbeddingModel(m)),
    [normalizedModelOptions]
  );

  const { mutateAsync: upsert, isPending: saving } = useUpsertEmbeddingCollectionMutation();
  const { mutateAsync: remove, isPending: deleting } = useDeleteEmbeddingCollectionMutation();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AgentTeachingEmbeddingCollectionRecord | null>(null);
  const [draft, setDraft] = useState<Partial<AgentTeachingEmbeddingCollectionRecord>>({});
  const [itemToDelete, setItemToDelete] = useState<AgentTeachingEmbeddingCollectionRecord | null>(null);

  const openCreate = useCallback(() => {
    setEditing(null);
    setDraft({
      name: '',
      description: '',
      embeddingModel: embeddingModels[0] ?? '',
    });
    setModalOpen(true);
  }, [embeddingModels]);

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

  const handleSave = async () => {
    const name = draft.name?.trim();
    if (!name) {
      toast('Collection name is required.', { variant: 'error' });
      return;
    }
    const embeddingModel = draft.embeddingModel?.trim();
    if (!embeddingModel) {
      toast('Embedding model is required.', { variant: 'error' });
      return;
    }
    try {
      await upsert({
        ...(editing?.id ? { id: editing.id } : {}),
        name,
        description: typeof draft.description === 'string' ? draft.description : null,
        embeddingModel,
      });
      toast(editing ? 'Collection updated.' : 'Collection created.', { variant: 'success' });
      closeModal();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to save collection.', { variant: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      await remove({ id: itemToDelete.id });
      toast('Collection deleted.', { variant: 'success' });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to delete collection.', { variant: 'error' });
    } finally {
      setItemToDelete(null);
    }
  };

  const usedByCount = useCallback((collectionId: string): number =>
    agents.filter((agent: AgentTeachingAgentRecord) => (agent.collectionIds ?? []).includes(collectionId)).length,
  [agents]);

  return {
    collections,
    agents,
    embeddingModels,
    isLoading,
    saving,
    deleting,
    modalOpen,
    setModalOpen,
    editing,
    draft,
    setDraft,
    itemToDelete,
    setItemToDelete,
    openCreate,
    openEdit,
    closeModal,
    handleSave,
    handleDelete,
    usedByCount,
  };
}
