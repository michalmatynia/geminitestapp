'use client';

import React from 'react';

import type {
  AgentTeachingAgentRecord,
  AgentTeachingEmbeddingCollectionRecord,
} from '@/shared/contracts/agent-teaching';
import { ItemLibrary, SectionHeaderBackLink, useToast } from '@/shared/ui';

import { LearnerAgentForm, type LearnerAgentLibraryItem } from '../components/LearnerAgentForm';
import { useAgentTeachingQueriesContext } from '../context/AgentTeachingContext';
import {
  useDeleteTeachingAgentMutation,
  useUpsertTeachingAgentMutation,
} from '../hooks/useAgentTeachingQueries';

export function AgentTeachingAgentsPage(): React.JSX.Element {
  const { toast } = useToast();
  const {
    agents,
    collections,
    chatModelId,
    embeddingModelId,
    isLoading: isLoadingContext,
  } = useAgentTeachingQueriesContext();

  const { mutateAsync: upsert, isPending: saving } = useUpsertTeachingAgentMutation();
  const { mutateAsync: remove } = useDeleteTeachingAgentMutation();
  const libraryAgents = React.useMemo<LearnerAgentLibraryItem[]>(
    () =>
      agents.map((agent: AgentTeachingAgentRecord) => ({
        ...agent,
        description: typeof agent.description === 'string' ? agent.description : null,
      })),
    [agents]
  );

  const handleSave = async (draft: Partial<LearnerAgentLibraryItem>): Promise<void> => {
    const name = draft.name?.trim();
    if (!name) {
      toast('Agent name is required.', { variant: 'error' });
      return;
    }
    const llmModel = chatModelId.trim();
    if (!llmModel) {
      toast('Configure Agent Teaching Chat in AI Brain first.', { variant: 'error' });
      return;
    }
    const embeddingModel = embeddingModelId.trim();
    if (!embeddingModel) {
      toast('Configure Agent Teaching Embeddings in AI Brain first.', { variant: 'error' });
      return;
    }

    const selectedCollectionIds = Array.isArray(draft.collectionIds) ? draft.collectionIds : [];
    const mismatchedCollections = selectedCollectionIds
      .map((id: string) =>
        collections.find((c: AgentTeachingEmbeddingCollectionRecord) => c.id === id)
      )
      .filter(
        (
          c: AgentTeachingEmbeddingCollectionRecord | undefined
        ): c is AgentTeachingEmbeddingCollectionRecord => Boolean(c)
      )
      .filter((c: AgentTeachingEmbeddingCollectionRecord) => c.embeddingModel !== embeddingModel);
    if (mismatchedCollections.length > 0) {
      toast(
        `Embedding model mismatch: ${mismatchedCollections
          .map((c: AgentTeachingEmbeddingCollectionRecord) => c.name)
          .join(', ')}`,
        { variant: 'error' }
      );
      return;
    }

    try {
      const temperatureRaw = typeof draft.temperature === 'number' ? draft.temperature : 0.2;
      const temperature = Number.isFinite(temperatureRaw)
        ? Math.max(0, Math.min(temperatureRaw, 2))
        : 0.2;
      const maxTokensRaw = typeof draft.maxTokens === 'number' ? draft.maxTokens : 800;
      const maxTokens = Number.isFinite(maxTokensRaw) ? Math.max(1, Math.round(maxTokensRaw)) : 800;
      const maxDocsPerCollectionRaw =
        typeof draft.maxDocsPerCollection === 'number' ? draft.maxDocsPerCollection : 400;
      const maxDocsPerCollection = Number.isFinite(maxDocsPerCollectionRaw)
        ? Math.max(10, Math.min(Math.round(maxDocsPerCollectionRaw), 2000))
        : 400;

      await upsert({
        ...(draft.id ? { id: draft.id } : {}),
        name,
        description: typeof draft.description === 'string' ? draft.description : null,
        llmModel,
        embeddingModel,
        systemPrompt: draft.systemPrompt ?? '',
        collectionIds: selectedCollectionIds,
        temperature,
        maxTokens,
        retrievalTopK: typeof draft.retrievalTopK === 'number' ? draft.retrievalTopK : 6,
        retrievalMinScore:
          typeof draft.retrievalMinScore === 'number' ? draft.retrievalMinScore : 0.15,
        maxDocsPerCollection,
      });
      toast(draft.id ? 'Learner agent updated.' : 'Learner agent created.', { variant: 'success' });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to save learner agent.', {
        variant: 'error',
      });
      throw error;
    }
  };

  const handleDelete = async (agent: LearnerAgentLibraryItem): Promise<void> => {
    try {
      await remove({ id: agent.id });
      toast('Learner agent deleted.', { variant: 'success' });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to delete learner agent.', {
        variant: 'error',
      });
      throw error;
    }
  };

  return (
    <ItemLibrary<LearnerAgentLibraryItem>
      title='Learner Agents'
      description='Agents that answer using connected embedding collections (RAG).'
      entityName='Learner Agent'
      items={libraryAgents}
      isLoading={isLoadingContext}
      isSaving={saving}
      onSave={handleSave}
      onDelete={handleDelete}
      backLink={
        <SectionHeaderBackLink href='/admin/agentcreator/teaching' arrow>
          Back to learners
        </SectionHeaderBackLink>
      }
      buildDefaultItem={() => ({
        name: '',
        description: '',
        llmModel: chatModelId,
        embeddingModel: embeddingModelId,
        systemPrompt: '',
        collectionIds: [],
        temperature: 0.2,
        maxTokens: 800,
        retrievalTopK: 6,
        retrievalMinScore: 0.15,
        maxDocsPerCollection: 400,
      })}
      renderItemTags={(agent: LearnerAgentLibraryItem) => [
        `LLM: ${chatModelId || agent.llmModel || '—'}`,
        `Embed: ${embeddingModelId || agent.embeddingModel || '—'}`,
        `KB: ${(agent.collectionIds ?? []).length}`,
        `Temp: ${(typeof agent.temperature === 'number' ? agent.temperature : 0.2).toFixed(2)}`,
      ]}
      renderExtraFields={(
        draft: LearnerAgentLibraryItem,
        onChange: (changes: Partial<LearnerAgentLibraryItem>) => void
      ) => (
        <LearnerAgentForm
          draft={draft}
          onChange={onChange}
          chatModel={chatModelId}
          embeddingModel={embeddingModelId}
          collections={collections}
        />
      )}
    />
  );
}
