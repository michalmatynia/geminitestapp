'use client';

import React, { useCallback } from 'react';

import {
  appendCatalogPoolValues,
  catalogToEntries,
} from '@/shared/lib/ai-brain/catalog-entries';

import { useBrain } from '../context/BrainContext';
import {
  sanitizeBrainProviderCatalog,
  type AiBrainProviderCatalog,
} from '../settings';

import { CredentialsSection } from './CredentialsSection';
import { LiveOllamaDiscoverySection } from './LiveOllamaDiscoverySection';
import { CatalogSection } from './CatalogSection';
import { useCatalogEditor } from './useCatalogEditor';
import { CatalogEntryEditor } from './CatalogEntryEditor';

export function ProvidersTab(): React.JSX.Element {
  const {
    openaiApiKey, setOpenaiApiKey, anthropicApiKey, setAnthropicApiKey,
    geminiApiKey, setGeminiApiKey, providerCatalog, setProviderCatalog,
    ollamaModelsQuery, liveOllamaModels, syncPlaywrightPersonas, saving,
  } = useBrain();

  const {
    editorMode, editorOpen, editorState, catalogEntries,
    openCreateEditor, openEditEditor, closeEditor,
    handleEditorChange, handleSaveEditor, handleRemoveEntry,
    setCatalogEntries, ConfirmationModal,
  } = useCatalogEditor({ providerCatalog, setProviderCatalog });

  const handleAddLiveToCatalog = useCallback((): void => {
    setProviderCatalog((prev: AiBrainProviderCatalog) => {
      const baseEntries = catalogToEntries(prev);
      const nextEntries = appendCatalogPoolValues(baseEntries, 'ollamaModels', liveOllamaModels);
      return sanitizeBrainProviderCatalog({ ...prev, entries: nextEntries });
    });
  }, [liveOllamaModels, setProviderCatalog]);

  return (
    <div className='space-y-4'>
      <LiveOllamaDiscoverySection
        isLoading={ollamaModelsQuery.isLoading} isFetching={ollamaModelsQuery.isFetching}
        error={ollamaModelsQuery.error} liveOllamaModels={liveOllamaModels}
        warningMessage={ollamaModelsQuery.data?.warning?.message}
        onRefetch={() => { void ollamaModelsQuery.refetch(); }}
        onAddToCatalog={handleAddLiveToCatalog}
      />
      <CredentialsSection
        openaiApiKey={openaiApiKey} setOpenaiApiKey={setOpenaiApiKey}
        anthropicApiKey={anthropicApiKey} setAnthropicApiKey={setAnthropicApiKey}
        geminiApiKey={geminiApiKey} setGeminiApiKey={setGeminiApiKey}
      />
      <CatalogSection
        catalogEntries={catalogEntries} saving={saving}
        onSyncPlaywrightPersonas={syncPlaywrightPersonas} onOpenCreateEditor={openCreateEditor}
        onSetCatalogEntries={setCatalogEntries} onOpenEditEditor={openEditEditor}
        onRemoveEntry={handleRemoveEntry}
      />
      <CatalogEntryEditor
        editorOpen={editorOpen} editorMode={editorMode} editorState={editorState}
        onClose={closeEditor} onChange={handleEditorChange} onSave={handleSaveEditor}
      />
      <ConfirmationModal />
    </div>
  );
}

