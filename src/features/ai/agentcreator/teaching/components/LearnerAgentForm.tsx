'use client';

import React from 'react';

import type {
  AgentTeachingAgentRecord,
  AgentTeachingEmbeddingCollectionRecord,
} from '@/shared/contracts/agent-teaching';
import { Input, Textarea, Checkbox } from '@/shared/ui/primitives.public';
import { FormField } from '@/shared/ui/forms-and-actions.public';
import { UI_GRID_RELAXED_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';
import { cn } from '@/shared/utils/ui-utils';

export type LearnerAgentLibraryItem = Omit<AgentTeachingAgentRecord, 'description'> & {
  description?: string | null;
};

export type LearnerAgentFormProps = {
  draft: LearnerAgentLibraryItem;
  onChange: (changes: Partial<LearnerAgentLibraryItem>) => void;
  chatModel: string;
  embeddingModel: string;
  collections: AgentTeachingEmbeddingCollectionRecord[];
};

function ModelSettings(props: {
  effectiveChatModel: string;
  effectiveEmbeddingModel: string;
}): React.JSX.Element {
  const { effectiveChatModel, effectiveEmbeddingModel } = props;
  return (
    <div className={`${UI_GRID_RELAXED_CLASSNAME} md:grid-cols-2`}>
      <FormField
        label='LLM model'
        description='Brain-managed via Agent Teaching Chat capability.'
      >
        <Input
          value={effectiveChatModel.length > 0 ? effectiveChatModel : 'Not configured in AI Brain'}
          readOnly
          disabled
          placeholder='Not configured in AI Brain'
          className='cursor-not-allowed'
          aria-label='Not configured in AI Brain'
          title='Not configured in AI Brain'
        />
      </FormField>

      <FormField
        label='Embedding model'
        description='Brain-managed via Agent Teaching Embeddings capability.'
      >
        <Input
          value={effectiveEmbeddingModel.length > 0 ? effectiveEmbeddingModel : 'Not configured in AI Brain'}
          readOnly
          disabled
          placeholder='Not configured in AI Brain'
          className='cursor-not-allowed'
          aria-label='Not configured in AI Brain'
          title='Not configured in AI Brain'
        />
      </FormField>
    </div>
  );
}

function BasicParameters(props: {
  draft: LearnerAgentLibraryItem;
  onChange: (changes: Partial<LearnerAgentLibraryItem>) => void;
}): React.JSX.Element {
  const { draft, onChange } = props;
  return (
    <>
      <div className={`${UI_GRID_RELAXED_CLASSNAME} md:grid-cols-2`}>
        <FormField
          label='Temperature'
          description='Higher = more creative, lower = more deterministic.'
        >
          <Input
            type='number'
            min={0}
            max={2}
            step={0.05}
            value={String(draft.temperature ?? 0.2)}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              onChange({ temperature: Number(event.target.value) })
            }
            aria-label='Temperature'
            title='Temperature'
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
            aria-label='Max tokens'
            title='Max tokens'
          />
        </FormField>
      </div>

      <FormField
        label='Max docs scanned per collection'
        description='Limits retrieval scan size (higher = better recall, lower = faster).'
      >
        <Input
          type='number'
          min={10}
          max={2000}
          value={String(draft.maxDocsPerCollection ?? 400)}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
            onChange({ maxDocsPerCollection: Number(event.target.value) })
          }
          aria-label='Max docs scanned per collection'
          title='Max docs scanned per collection'
        />
      </FormField>
    </>
  );
}

function RetrievalParameters(props: {
  draft: LearnerAgentLibraryItem;
  onChange: (changes: Partial<LearnerAgentLibraryItem>) => void;
}): React.JSX.Element {
  const { draft, onChange } = props;
  return (
    <div className={`${UI_GRID_RELAXED_CLASSNAME} md:grid-cols-2`}>
      <FormField label='Retrieval top K'>
        <Input
          type='number'
          min={1}
          max={50}
          value={String(draft.retrievalTopK ?? 6)}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
            onChange({ retrievalTopK: Number(event.target.value) })
          }
          aria-label='Retrieval top K'
          title='Retrieval top K'
        />
      </FormField>
      <FormField
        label='Min similarity score'
        description='Higher = stricter. Lower = more context (and more noise).'
      >
        <Input
          type='number'
          step='0.05'
          min={-1}
          max={1}
          value={String(draft.retrievalMinScore ?? 0.15)}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
            onChange({ retrievalMinScore: Number(event.target.value) })
          }
          aria-label='Min similarity score'
          title='Min similarity score'
        />
      </FormField>
    </div>
  );
}

function CollectionItem(props: {
  collection: AgentTeachingEmbeddingCollectionRecord;
  checked: boolean;
  isSameModel: boolean;
  onCheckedChange: (val: boolean | 'indeterminate') => void;
}): React.JSX.Element {
  const { collection, checked, isSameModel, onCheckedChange } = props;
  const checkboxId = `learner-agent-collection-${collection.id}`;

  return (
    <label
      htmlFor={checkboxId}
      className={cn(
        'flex items-start gap-2 rounded-md border px-3 py-2 text-sm transition-colors cursor-pointer',
        checked
          ? 'border-emerald-500/40 bg-emerald-500/10'
          : 'border-border bg-card/40 hover:bg-card/60',
        !isSameModel && 'opacity-60'
      )}
      title={
        isSameModel ? undefined : `Embedding model mismatch (collection: ${collection.embeddingModel})`
      }
    >
      <Checkbox
        id={checkboxId}
        className='mt-1'
        checked={checked}
        onCheckedChange={onCheckedChange}
      />
      <span className='min-w-0'>
        <span className='block font-medium text-white'>{collection.name}</span>
        <span className='block text-[11px] text-gray-400'>{collection.embeddingModel}</span>
      </span>
    </label>
  );
}

function CollectionSettings(props: {
  draft: LearnerAgentLibraryItem;
  collections: AgentTeachingEmbeddingCollectionRecord[];
  onChange: (changes: Partial<LearnerAgentLibraryItem>) => void;
  effectiveEmbeddingModel: string;
}): React.JSX.Element {
  const { draft, collections, onChange, effectiveEmbeddingModel } = props;

  const resolveCollectionName = (id: string): string => {
    const found = collections.find((c) => c.id === id);
    return found?.name ?? id;
  };

  return (
    <FormField label='Connected embedding collections'>
      {collections.length === 0 ? (
        <div className='text-sm text-gray-500'>
          No collections yet. Create one in Embedding Collections first.
        </div>
      ) : (
        <div className='grid gap-2 md:grid-cols-2'>
          {collections.map((collection) => {
            const checked = draft.collectionIds.includes(collection.id);
            const isSameModel =
              effectiveEmbeddingModel.length === 0 ||
              collection.embeddingModel === effectiveEmbeddingModel;

            return (
              <CollectionItem
                key={collection.id}
                collection={collection}
                checked={checked}
                isSameModel={isSameModel}
                onCheckedChange={(val) => {
                  const current = draft.collectionIds;
                  const next =
                    val === true
                      ? Array.from(new Set([...current, collection.id]))
                      : current.filter((id: string) => id !== collection.id);
                  onChange({ collectionIds: next });
                }}
              />
            );
          })}
        </div>
      )}
      {draft.collectionIds.length > 0 && (
        <div className='text-[11px] text-gray-500'>
          Connected: {draft.collectionIds.map(resolveCollectionName).join(', ')}
        </div>
      )}
    </FormField>
  );
}

export function LearnerAgentForm(props: LearnerAgentFormProps): React.JSX.Element {
  const { draft, onChange, chatModel, embeddingModel, collections } = props;

  const chatModelValue = chatModel.trim();
  const effectiveChatModel = chatModelValue.length > 0 ? chatModelValue : draft.llmModel.trim();

  const embeddingModelValue = embeddingModel.trim();
  const effectiveEmbeddingModel =
    embeddingModelValue.length > 0 ? embeddingModelValue : draft.embeddingModel.trim();

  return (
    <div className='space-y-6'>
      <ModelSettings
        effectiveChatModel={effectiveChatModel}
        effectiveEmbeddingModel={effectiveEmbeddingModel}
      />

      <FormField label='System prompt' description='Optional instructions (tone, scope, rules)...'>
        <Textarea
          value={draft.systemPrompt}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
            onChange({ systemPrompt: event.target.value })
          }
          placeholder='Enter prompt instructions'
          className='min-h-[120px]'
          aria-label='Enter prompt instructions'
          title='Enter prompt instructions'
        />
      </FormField>

      <BasicParameters draft={draft} onChange={onChange} />
      <RetrievalParameters draft={draft} onChange={onChange} />

      <CollectionSettings
        draft={draft}
        collections={collections}
        onChange={onChange}
        effectiveEmbeddingModel={effectiveEmbeddingModel}
      />
    </div>
  );
}
