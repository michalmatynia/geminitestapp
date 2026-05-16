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

interface ValidatedAgentDraft {
  name: string;
  llmModel: string;
  embeddingModel: string;
  selectedCollectionIds: string[];
}

const validateAgentDraft = (
  draft: Partial<LearnerAgentLibraryItem>,
  chatModelId: string,
  embeddingModelId: string,
  collections: AgentTeachingEmbeddingCollectionRecord[]
): ValidatedAgentDraft => {
  const name = draft.name?.trim() ?? '';
  if (name === '') throw new Error('Agent name is required.');
  
  const llmModel = chatModelId.trim();
  if (llmModel === '') throw new Error('Configure Agent Teaching Chat in AI Brain first.');
  
  const embeddingModel = embeddingModelId.trim();
  if (embeddingModel === '') throw new Error('Configure Agent Teaching Embeddings in AI Brain first.');

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

interface PreparedAgentPayload {
  temperature: number;
  maxTokens: number;
  maxDocsPerCollection: number;
  retrievalTopK: number;
  retrievalMinScore: number;
}

const prepareTemperature = (value: number | undefined): number => {
  const temp = typeof value === 'number' ? value : 0.2;
  return Number.isFinite(temp) ? Math.max(0, Math.min(temp, 2)) : 0.2;
};

const prepareMaxTokens = (value: number | undefined): number => {
  const tokens = typeof value === 'number' ? value : 800;
  return Number.isFinite(tokens) ? Math.max(1, Math.round(tokens)) : 800;
};

const prepareMaxDocs = (value: number | undefined): number => {
  const docs = typeof value === 'number' ? value : 400;
  return Number.isFinite(docs) ? Math.max(10, Math.min(Math.round(docs), 2000)) : 400;
};

const prepareAgentPayload = (draft: Partial<LearnerAgentLibraryItem>): PreparedAgentPayload => ({
  temperature: prepareTemperature(draft.temperature),
  maxTokens: prepareMaxTokens(draft.maxTokens),
  maxDocsPerCollection: prepareMaxDocs(draft.maxDocsPerCollection),
  retrievalTopK: typeof draft.retrievalTopK === 'number' ? draft.retrievalTopK : 6,
  retrievalMinScore: typeof draft.retrievalMinScore === 'number' ? draft.retrievalMinScore : 0.15,
});

interface AgentTeachingHandlers {
  handleSave: (draft: Partial<LearnerAgentLibraryItem>) => Promise<void>;
  handleDelete: (agent: LearnerAgentLibraryItem) => Promise<void>;
  saving: boolean;
}

function useAgentTeachingHandlers(): AgentTeachingHandlers {
  const { toast } = useToast();
  const { collections, chatModelId, embeddingModelId } = useAgentTeachingQueriesContext();
  const { mutateAsync: upsert, isPending: saving } = useUpsertTeachingAgentMutation();
  const { mutateAsync: remove } = useDeleteTeachingAgentMutation();

  const handleSave = async (draft: Partial<LearnerAgentLibraryItem>): Promise<void> => {
    try {
      const { name, llmModel, embeddingModel, selectedCollectionIds } = validateAgentDraft(
        draft, chatModelId, embeddingModelId, collections
      );
      const params = prepareAgentPayload(draft);

      await upsert({
        ...(draft.id !== undefined ? { id: draft.id } : {}),
        name,
        description: typeof draft.description === 'string' ? draft.description : null,
        llmModel, embeddingModel, systemPrompt: draft.systemPrompt ?? '',
        collectionIds: selectedCollectionIds, ...params,
      });
      toast(draft.id !== undefined ? 'Learner agent updated.' : 'Learner agent created.', { variant: 'success' });
    } catch (error) {
      logClientError(error);
      toast(error instanceof Error ? error.message : 'Failed to save learner agent.', { variant: 'error' });
      throw error;
    }
  };

  const handleDelete = async (agent: LearnerAgentLibraryItem): Promise<void> => {
    try {
      await remove({ id: agent.id });
      toast('Learner agent deleted.', { variant: 'success' });
    } catch (error) {
      logClientError(error);
      toast(error instanceof Error ? error.message : 'Failed to delete learner agent.', { variant: 'error' });
      throw error;
    }
  };

  return { handleSave, handleDelete, saving };
}

export function AgentTeachingAgentsPage(): React.JSX.Element {
  const { agents, collections, chatModelId, embeddingModelId, isLoading: isLoadingContext } = useAgentTeachingQueriesContext();
  const { handleSave, handleDelete, saving } = useAgentTeachingHandlers();

  const libraryAgents = React.useMemo<LearnerAgentLibraryItem[]>(
    () => agents.map((agent: AgentTeachingAgentRecord) => ({
      ...agent,
      description: typeof agent.description === 'string' ? agent.description : null,
    })),
    [agents]
  );

  const buildDefaultItem = (): Partial<LearnerAgentLibraryItem> => ({
    name: '', description: '', llmModel: chatModelId, embeddingModel: embeddingModelId,
    systemPrompt: '', collectionIds: [], temperature: 0.2, maxTokens: 800,
    retrievalTopK: 6, retrievalMinScore: 0.15, maxDocsPerCollection: 400,
  });

  const renderItemTags = (agent: LearnerAgentLibraryItem): string[] => {
    let chat = chatModelId;
    if (chat === '') {
      chat = agent.llmModel !== '' ? agent.llmModel : '—';
    }
    let embed = embeddingModelId;
    if (embed === '') {
      embed = agent.embeddingModel !== '' ? agent.embeddingModel : '—';
    }
    const temp = typeof agent.temperature === 'number' ? agent.temperature : 0.2;

    return [`LLM: ${chat}`, `Embed: ${embed}`, `KB: ${agent.collectionIds.length}`, `Temp: ${temp.toFixed(2)}` ];
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
      buildDefaultItem={buildDefaultItem}
      renderItemTags={renderItemTags}
      renderExtraFields={(draft, onChange) => (
        <LearnerAgentForm draft={draft} onChange={onChange} chatModel={chatModelId} embeddingModel={embeddingModelId} collections={collections} />
      )}
    />
  );
}
