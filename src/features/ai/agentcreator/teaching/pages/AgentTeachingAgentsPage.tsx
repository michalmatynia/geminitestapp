'use client';

import React from 'react';

import { buildModelProfile } from '@/features/ai/chatbot/utils';
import type { AgentTeachingAgentRecord, AgentTeachingEmbeddingCollectionRecord } from '@/shared/types/domain/agent-teaching';
import { Input, ItemLibrary, UnifiedSelect, Textarea, useToast, Checkbox, FormField } from '@/shared/ui';
import { cn } from '@/shared/utils';

import { useAgentTeachingContext } from '../context/AgentTeachingContext';
import { useDeleteTeachingAgentMutation, useUpsertTeachingAgentMutation } from '../hooks/useAgentTeaching';

const isEmbeddingModel = (model: string): boolean => buildModelProfile(model).isEmbedding;

export function AgentTeachingAgentsPage(): React.JSX.Element {
  const { toast } = useToast();
  const { agents, collections, modelOptions, isLoading: isLoadingContext } = useAgentTeachingContext();

  const { mutateAsync: upsert, isPending: saving } = useUpsertTeachingAgentMutation();
  const { mutateAsync: remove } = useDeleteTeachingAgentMutation();

  const chatModels = React.useMemo(
    () => modelOptions.filter((m: string) => m.trim().length > 0 && !isEmbeddingModel(m)),
    [modelOptions]
  );
  const embeddingModels = React.useMemo(
    () => modelOptions.filter((m: string) => m.trim().length > 0 && isEmbeddingModel(m)),
    [modelOptions]
  );

  const resolveCollectionName = (id: string): string => {
    const found = collections.find((c: AgentTeachingEmbeddingCollectionRecord) => c.id === id);
    return found?.name ?? id;
  };

  const handleSave = async (draft: Partial<AgentTeachingAgentRecord>): Promise<void> => {
    const name = draft.name?.trim();
    if (!name) {
      toast('Agent name is required.', { variant: 'error' });
      return;
    }
    const llmModel = draft.llmModel?.trim();
    if (!llmModel) {
      toast('LLM model is required.', { variant: 'error' });
      return;
    }
    const embeddingModel = draft.embeddingModel?.trim();
    if (!embeddingModel) {
      toast('Embedding model is required.', { variant: 'error' });
      return;
    }

    const selectedCollectionIds = Array.isArray(draft.collectionIds) ? draft.collectionIds : [];
    const mismatchedCollections = selectedCollectionIds
      .map((id: string) => collections.find((c: AgentTeachingEmbeddingCollectionRecord) => c.id === id))
      .filter((c: AgentTeachingEmbeddingCollectionRecord | undefined): c is AgentTeachingEmbeddingCollectionRecord => Boolean(c))
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
      const temperature = Number.isFinite(temperatureRaw) ? Math.max(0, Math.min(temperatureRaw, 2)) : 0.2;
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
      toast(error instanceof Error ? error.message : 'Failed to save learner agent.', { variant: 'error' });
      throw error;
    }
  };

  const handleDelete = async (agent: AgentTeachingAgentRecord): Promise<void> => {
    try {
      await remove({ id: agent.id });
      toast('Learner agent deleted.', { variant: 'success' });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to delete learner agent.', { variant: 'error' });
      throw error;
    }
  };

  return (
    <ItemLibrary<AgentTeachingAgentRecord>
      title='Learner Agents'
      description='Agents that answer using connected embedding collections (RAG).'
      entityName='Learner Agent'
      items={agents}
      isLoading={isLoadingContext}
      isSaving={saving}
      onSave={handleSave}
      onDelete={handleDelete}
      backLink={(
        <Link href='/admin/agentcreator/teaching' className='text-blue-300 hover:text-blue-200'>
          ← Back to learners
        </Link>
      )}
      buildDefaultItem={() => ({
        name: '',
        description: '',
        llmModel: chatModels[0] ?? '',
        embeddingModel: embeddingModels[0] ?? '',
        systemPrompt: '',
        collectionIds: [],
        temperature: 0.2,
        maxTokens: 800,
        retrievalTopK: 6,
        retrievalMinScore: 0.15,
        maxDocsPerCollection: 400,
      })}
      renderItemTags={(agent: AgentTeachingAgentRecord) => [
        `LLM: ${agent.llmModel || '—'}`,
        `Embed: ${agent.embeddingModel || '—'}`,
        `KB: ${(agent.collectionIds ?? []).length}`,
        `Temp: ${(typeof agent.temperature === 'number' ? agent.temperature : 0.2).toFixed(2)}`,
      ]}
      renderExtraFields={(draft: Partial<AgentTeachingAgentRecord>, onChange: (changes: Partial<AgentTeachingAgentRecord>) => void) => (
        <div className='space-y-6'>
          <div className='grid gap-4 md:grid-cols-2'>
            <FormField
              label='LLM model'
              description='Model used to answer questions.'
            >
              <UnifiedSelect
                value={draft.llmModel ?? ''}
                onValueChange={(value: string) => onChange({ llmModel: value })}
                options={chatModels.map((model: string) => ({ value: model, label: model }))}
                placeholder='Select LLM model'
              />
            </FormField>

            <FormField
              label='Embedding model'
              description='Must match the embedding collections you attach.'
            >
              <UnifiedSelect
                value={draft.embeddingModel ?? ''}
                onValueChange={(value: string) => onChange({ embeddingModel: value })}
                options={embeddingModels.map((model: string) => ({ value: model, label: model }))}
                placeholder='Select embedding model'
              />
            </FormField>
          </div>

          <FormField label='System prompt' description='Optional instructions (tone, scope, rules)...'>
            <Textarea
              value={draft.systemPrompt ?? ''}
              onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => onChange({ systemPrompt: event.target.value })}
              placeholder='Enter prompt instructions'
              className='min-h-[120px]'
            />
          </FormField>

          <div className='grid gap-4 md:grid-cols-2'>
            <FormField label='Temperature' description='Higher = more creative, lower = more deterministic.'>
              <Input
                type='number'
                min={0}
                max={2}
                step={0.05}
                value={String(draft.temperature ?? 0.2)}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                  onChange({ temperature: Number(event.target.value) })
                }
              />
            </FormField>

            <FormField label='Max tokens' description='Response length limit (Ollama: num_predict).'>
              <Input
                type='number'
                min={1}
                max={8000}
                value={String(draft.maxTokens ?? 800)}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                  onChange({ maxTokens: Number(event.target.value) })
                }
              />
            </FormField>
          </div>

          <FormField label='Max docs scanned per collection' description='Limits retrieval scan size (higher = better recall, lower = faster).'>
            <Input
              type='number'
              min={10}
              max={2000}
              value={String(draft.maxDocsPerCollection ?? 400)}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                onChange({ maxDocsPerCollection: Number(event.target.value) })
              }
            />
          </FormField>

          <div className='grid gap-4 md:grid-cols-2'>
            <FormField label='Retrieval top K'>
              <Input
                type='number'
                min={1}
                max={50}
                value={String(draft.retrievalTopK ?? 6)}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                  onChange({ retrievalTopK: Number(event.target.value) })
                }
              />
            </FormField>
            <FormField label='Min similarity score' description='Higher = stricter. Lower = more context (and more noise).'>
              <Input
                type='number'
                step='0.05'
                min={-1}
                max={1}
                value={String(draft.retrievalMinScore ?? 0.15)}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                  onChange({ retrievalMinScore: Number(event.target.value) })
                }
              />
            </FormField>
          </div>

          <FormField label='Connected embedding collections'>
            {collections.length === 0 ? (
              <div className='text-sm text-gray-500'>
                No collections yet. Create one in Embedding Collections first.
              </div>
            ) : (
              <div className='grid gap-2 md:grid-cols-2'>
                {collections.map((collection: AgentTeachingEmbeddingCollectionRecord) => {
                  const checked = (draft.collectionIds ?? []).includes(collection.id);
                  const sameModel =
                    !draft.embeddingModel ||
                    collection.embeddingModel === draft.embeddingModel;
                  return (
                    <label
                      key={collection.id}
                      className={cn(
                        'flex items-start gap-2 rounded-md border px-3 py-2 text-sm transition-colors cursor-pointer',
                        checked ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-border bg-card/40 hover:bg-card/60',
                        !sameModel && 'opacity-60'
                      )}
                      title={
                        sameModel
                          ? undefined
                          : `Embedding model mismatch (collection: ${collection.embeddingModel})`
                      }
                    >
                      <Checkbox
                        className='mt-1'
                        checked={checked}
                        onCheckedChange={(val: boolean | 'indeterminate') => {
                          const current = Array.isArray(draft.collectionIds) ? draft.collectionIds : [];
                          const next = val
                            ? Array.from(new Set([...current, collection.id]))
                            : current.filter((id: string) => id !== collection.id);
                          onChange({ collectionIds: next });
                        }}
                      />
                      <span className='min-w-0'>
                        <span className='block font-medium text-white'>{collection.name}</span>
                        <span className='block text-[11px] text-gray-400'>
                          {collection.embeddingModel}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
            {draft.collectionIds && draft.collectionIds.length > 0 && (
              <div className='text-[11px] text-gray-500'>
                Connected: {draft.collectionIds.map(resolveCollectionName).join(', ')}
              </div>
            )}
          </FormField>
        </div>
      )}
    />
  );
}
