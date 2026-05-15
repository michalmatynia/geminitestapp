'use client';

import React from 'react';

import type {
  AgentTeachingAgentRecord,
  AgentTeachingEmbeddingCollectionRecord,
} from '@/shared/contracts/agent-teaching';
import { AdminAgentTeachingBreadcrumbs } from '@/shared/ui/admin.public';
import { ItemLibrary } from '@/shared/ui/data-display.public';
import { useToast } from '@/shared/ui/primitives.public';

import { LearnerAgentForm, type LearnerAgentLibraryItem } from '../components/LearnerAgentForm';
import { useAgentTeachingQueriesContext } from '../context/AgentTeachingContext';
import {
  useDeleteTeachingAgentMutation,
  useUpsertTeachingAgentMutation,
} from '../hooks/useAgentTeachingQueries';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

const validateAgentDraft = (
  draft: Partial<LearnerAgentLibraryItem>,
  chatModelId: string,
  embeddingModelId: string,
  collections: AgentTeachingEmbeddingCollectionRecord[]
) => {
  const name = draft.name?.trim() ?? '';
  if (name === '') {
    throw new Error('Agent name is required.');
  }
  const llmModel = chatModelId.trim();
  if (llmModel === '') {
    throw new Error('Configure Agent Teaching Chat in AI Brain first.');
  }
  const embeddingModel = embeddingModelId.trim();
  if (embeddingModel === '') {
    throw new Error('Configure Agent Teaching Embeddings in AI Brain first.');
  }

  const selectedCollectionIds = Array.isArray(draft.collectionIds) ? draft.collectionIds : [];
  const mismatchedCollections = selectedCollectionIds
    .map((id) => collections.find((c) => c.id === id))
    .filter((c): c is AgentTeachingEmbeddingCollectionRecord => c !== undefined)
    .filter((c) => c.embeddingModel !== embeddingModel);

  if (mismatchedCollections.length > 0) {
    const names = mismatchedCollections.map((c) => c.name).join(', ');
    throw new Error(`Embedding model mismatch: ${names}`);
  }

  return { name, llmModel, embeddingModel, selectedCollectionIds };
};

const prepareAgentPayload = (draft: Partial<LearnerAgentLibraryItem>) => {
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

  return {
    temperature,
    maxTokens,
    maxDocsPerCollection,
    retrievalTopK: typeof draft.retrievalTopK === 'number' ? draft.retrievalTopK : 6,
    retrievalMinScore: typeof draft.retrievalMinScore === 'number' ? draft.retrievalMinScore : 0.15,
  };
};

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
    try {
      const { name, llmModel, embeddingModel, selectedCollectionIds } = validateAgentDraft(
        draft,
        chatModelId,
        embeddingModelId,
        collections
      );

      const params = prepareAgentPayload(draft);

      await upsert({
        ...(draft.id !== undefined ? { id: draft.id } : {}),
        name,
        description: typeof draft.description === 'string' ? draft.description : null,
        llmModel,
        embeddingModel,
        systemPrompt: draft.systemPrompt ?? '',
        collectionIds: selectedCollectionIds,
        ...params,
      });
      toast(draft.id !== undefined ? 'Learner agent updated.' : 'Learner agent created.', {
        variant: 'success',
      });
    } catch (error) {
      logClientError(error);
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
      logClientError(error);
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
      backLink={<AdminAgentTeachingBreadcrumbs current='Agents' className='mb-2' />}
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
      renderItemTags={(agent: LearnerAgentLibraryItem) => {
        const effectiveChatModel =
          chatModelId !== '' ? chatModelId : agent.llmModel !== '' ? agent.llmModel : '—';
        const effectiveEmbeddingModel =
          embeddingModelId !== ''
            ? embeddingModelId
            : agent.embeddingModel !== ''
            ? agent.embeddingModel
            : '—';
        const temp = typeof agent.temperature === 'number' ? agent.temperature : 0.2;

        return [
          `LLM: ${effectiveChatModel}`,
          `Embed: ${effectiveEmbeddingModel}`,
          `KB: ${agent.collectionIds.length}`,
          `Temp: ${temp.toFixed(2)}`,
        ];
      }}
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
