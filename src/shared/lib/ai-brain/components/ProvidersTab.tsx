'use client';

import { KeyRound, Plus } from 'lucide-react';
import React, { useCallback, useMemo, useState } from 'react';

import { useConfirm } from '@/shared/hooks/ui/useConfirm';
import {
  appendCatalogPoolValues,
  BRAIN_CATALOG_POOL_LABELS,
  BRAIN_CATALOG_POOL_VALUES,
  catalogToEntries,
  isSameCatalogEntry,
} from '@/shared/lib/ai-brain/catalog-entries';
import { Button, FormSection, Input, Label, useToast } from '@/shared/ui';
import {
  SettingsPanelBuilder,
  type SettingsField,
} from '@/shared/ui/templates/SettingsPanelBuilder';

import { useBrain } from '../context/BrainContext';
import {
  sanitizeBrainProviderCatalog,
  type AiBrainCatalogEntry,
  type AiBrainCatalogPool,
  type AiBrainProviderCatalog,
} from '../settings';
import { BrainCatalogTree } from './BrainCatalogTree';

type CatalogEntryEditorState = {
  value: string;
  pool: AiBrainCatalogPool;
};

const EMPTY_EDITOR_STATE: CatalogEntryEditorState = {
  value: '',
  pool: 'modelPresets',
};

const CATALOG_ENTRY_EDITOR_FIELDS: SettingsField<CatalogEntryEditorState>[] = [
  {
    key: 'value',
    label: 'Item ID',
    type: 'text',
    placeholder: 'gpt-4.1-mini',
    required: true,
  },
  {
    key: 'pool',
    label: 'Pool',
    type: 'select',
    options: BRAIN_CATALOG_POOL_VALUES.map((pool) => ({
      label: BRAIN_CATALOG_POOL_LABELS[pool],
      value: pool,
    })),
  },
];

type CatalogEditorMode = 'create' | 'edit';

export function ProvidersTab(): React.JSX.Element {
  const { toast } = useToast();
  const { confirm, ConfirmationModal } = useConfirm();
  const {
    openaiApiKey,
    setOpenaiApiKey,
    anthropicApiKey,
    setAnthropicApiKey,
    geminiApiKey,
    setGeminiApiKey,
    providerCatalog,
    setProviderCatalog,
    ollamaModelsQuery,
    liveOllamaModels,
    syncPlaywrightPersonas,
    saving,
  } = useBrain();

  const [editorMode, setEditorMode] = useState<CatalogEditorMode>('create');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorState, setEditorState] = useState<CatalogEntryEditorState>(EMPTY_EDITOR_STATE);
  const [editingOriginal, setEditingOriginal] = useState<AiBrainCatalogEntry | null>(null);

  const catalogEntries = useMemo(() => catalogToEntries(providerCatalog), [providerCatalog]);

  const setCatalogEntries = useCallback(
    (nextEntries: AiBrainCatalogEntry[]): void => {
      setProviderCatalog((prev: AiBrainProviderCatalog) =>
        sanitizeBrainProviderCatalog({
          ...prev,
          entries: nextEntries,
        })
      );
    },
    [setProviderCatalog]
  );

  const handleAddLiveToCatalog = useCallback((): void => {
    setProviderCatalog((prev: AiBrainProviderCatalog) => {
      const baseEntries = catalogToEntries(prev);
      const nextEntries = appendCatalogPoolValues(baseEntries, 'ollamaModels', liveOllamaModels);
      return sanitizeBrainProviderCatalog({
        ...prev,
        entries: nextEntries,
      });
    });
  }, [liveOllamaModels, setProviderCatalog]);

  const openCreateEditor = useCallback((): void => {
    setEditorMode('create');
    setEditingOriginal(null);
    setEditorState(EMPTY_EDITOR_STATE);
    setEditorOpen(true);
  }, []);

  const openEditEditor = useCallback((entry: AiBrainCatalogEntry): void => {
    setEditorMode('edit');
    setEditingOriginal(entry);
    setEditorState({
      value: entry.value,
      pool: entry.pool,
    });
    setEditorOpen(true);
  }, []);

  const closeEditor = useCallback((): void => {
    setEditorOpen(false);
    setEditorMode('create');
    setEditingOriginal(null);
    setEditorState(EMPTY_EDITOR_STATE);
  }, []);

  const handleEditorChange = useCallback((patch: Partial<CatalogEntryEditorState>): void => {
    setEditorState((prev) => ({
      ...prev,
      ...patch,
    }));
  }, []);

  const handleSaveEditor = useCallback(async (): Promise<void> => {
    const value = editorState.value.trim();
    if (!value) {
      toast('Item ID is required.', { variant: 'error' });
      return;
    }

    const candidate: AiBrainCatalogEntry = {
      pool: editorState.pool,
      value,
    };

    const duplicate = catalogEntries.some((entry) => {
      if (editorMode === 'edit' && editingOriginal && isSameCatalogEntry(entry, editingOriginal)) {
        return false;
      }
      return isSameCatalogEntry(entry, candidate);
    });

    if (duplicate) {
      toast('This item already exists in the selected pool.', { variant: 'error' });
      return;
    }

    if (editorMode === 'edit' && editingOriginal) {
      const index = catalogEntries.findIndex((entry) => isSameCatalogEntry(entry, editingOriginal));
      if (index >= 0) {
        const next = [...catalogEntries];
        next[index] = candidate;
        setCatalogEntries(next);
      } else {
        setCatalogEntries([...catalogEntries, candidate]);
      }
    } else {
      setCatalogEntries([...catalogEntries, candidate]);
    }

    closeEditor();
    toast('Catalog entry updated. Save Brain settings to persist.', { variant: 'success' });
  }, [
    catalogEntries,
    closeEditor,
    editingOriginal,
    editorMode,
    editorState.pool,
    editorState.value,
    setCatalogEntries,
    toast,
  ]);

  const handleRemoveEntry = useCallback(
    (entry: AiBrainCatalogEntry): void => {
      confirm({
        title: 'Remove catalog item?',
        message: `Remove "${entry.value}" from ${BRAIN_CATALOG_POOL_LABELS[entry.pool]}? Save Brain settings to persist.`,
        confirmText: 'Remove',
        isDangerous: true,
        onConfirm: (): void => {
          setCatalogEntries(
            catalogEntries.filter((candidate) => !isSameCatalogEntry(candidate, entry))
          );
          toast('Catalog entry removed. Save Brain settings to persist.', {
            variant: 'success',
          });
        },
      });
    },
    [catalogEntries, confirm, setCatalogEntries, toast]
  );

  return (
    <div className='space-y-4'>
      <FormSection
        title='Live Ollama discovery'
        description='Load live models from Ollama to see what is available.'
        variant='subtle'
        actions={
          <div className='flex gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => void ollamaModelsQuery.refetch()}
              disabled={ollamaModelsQuery.isFetching}
            >
              {ollamaModelsQuery.isFetching ? 'Refreshing...' : 'Refresh Ollama'}
            </Button>
            <Button
              variant='outline'
              size='sm'
              onClick={handleAddLiveToCatalog}
              disabled={liveOllamaModels.length === 0}
            >
              Add Live to Catalog
            </Button>
          </div>
        }
      >
        <div className='mt-2 text-xs text-gray-300'>
          {ollamaModelsQuery.isLoading
            ? 'Loading live models from Ollama...'
            : ollamaModelsQuery.error
              ? ollamaModelsQuery.error instanceof Error
                ? ollamaModelsQuery.error.message
                : 'Failed to load Ollama models.'
              : `${liveOllamaModels.length} live model(s) available for Brain routing.`}
        </div>
        {ollamaModelsQuery.data?.warning?.message ? (
          <div className='mt-1 text-[11px] text-amber-300'>
            {ollamaModelsQuery.data.warning.message}
          </div>
        ) : null}
      </FormSection>

      <FormSection
        title='Global Provider Credentials'
        description='Brain-managed provider keys are shared across Brain-routed features, including Image Studio, Kangur, and Case Resolver OCR.'
        titleIcon={<KeyRound className='size-4 text-emerald-300' />}
        className='p-4'
      >
        <div className='mt-3 grid gap-3 md:grid-cols-3'>
          <div className='space-y-1'>
            <Label className='text-xs text-gray-400'>OpenAI API key</Label>
            <Input
              type='password'
              value={openaiApiKey}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                setOpenaiApiKey(event.target.value)
              }
              placeholder='sk-...'
            />
          </div>
          <div className='space-y-1'>
            <Label className='text-xs text-gray-400'>Anthropic API key</Label>
            <Input
              type='password'
              value={anthropicApiKey}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                setAnthropicApiKey(event.target.value)
              }
              placeholder='sk-ant-...'
            />
          </div>
          <div className='space-y-1'>
            <Label className='text-xs text-gray-400'>Gemini API key</Label>
            <Input
              type='password'
              value={geminiApiKey}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                setGeminiApiKey(event.target.value)
              }
              placeholder='AIza...'
            />
          </div>
        </div>
      </FormSection>

      <FormSection
        title='Model and Agent Catalog'
        description='Flat Brain catalog list across all pools. Drag to reorder, click edit to update ID/pool.'
        actions={
          <div className='flex flex-wrap items-center gap-2'>
            <Button variant='outline' size='sm' onClick={syncPlaywrightPersonas}>
              Sync Playwright Personas
            </Button>
            <Button variant='outline' size='sm' onClick={openCreateEditor}>
              <Plus className='mr-1.5 size-3.5' />
              Add Item
            </Button>
          </div>
        }
        className='p-4'
      >
        <div className='mt-2 text-[11px] text-gray-500'>
          {catalogEntries.length} catalog item{catalogEntries.length === 1 ? '' : 's'}.
        </div>
        <div className='mt-3'>
          <BrainCatalogTree
            entries={catalogEntries}
            onChange={setCatalogEntries}
            onEdit={openEditEditor}
            onRemove={handleRemoveEntry}
            isPending={saving}
          />
        </div>
      </FormSection>

      <SettingsPanelBuilder<CatalogEntryEditorState>
        open={editorOpen}
        onClose={closeEditor}
        title={editorMode === 'edit' ? 'Edit Catalog Item' : 'Add Catalog Item'}
        subtitle='Update item ID and pool. Save Brain settings to persist changes.'
        fields={CATALOG_ENTRY_EDITOR_FIELDS}
        values={editorState}
        onChange={handleEditorChange}
        onSave={handleSaveEditor}
        size='sm'
      />

      <ConfirmationModal />
    </div>
  );
}
