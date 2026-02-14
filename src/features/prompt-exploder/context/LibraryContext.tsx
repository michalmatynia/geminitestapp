'use client';

import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';

import { useSettingsMap, useUpdateSetting } from '@/shared/hooks/use-settings';
import { useToast } from '@/shared/ui';
import { serializeSetting } from '@/shared/utils/settings-json';

import {
  buildPromptExploderLibraryItem,
  createPromptExploderLibraryItemId,
  getManualBindingsFromDocument,
  hydratePromptExploderLibraryDocument,
  parsePromptExploderLibrary,
  PROMPT_EXPLODER_LIBRARY_KEY,
  removePromptExploderLibraryItemById,
  sortPromptExploderLibraryItemsByUpdated,
  upsertPromptExploderLibraryItems,
  type PromptExploderLibraryItem,
} from '../prompt-library';

import { useDocumentState, useDocumentActions } from './hooks/useDocument';
import { useBenchmarkActions } from './hooks/useBenchmark';

// ── Types ────────────────────────────────────────────────────────────────────

export interface LibraryState {
  selectedLibraryItemId: string | null;
  libraryNameDraft: string;
  promptLibraryItems: PromptExploderLibraryItem[];
  selectedLibraryItem: PromptExploderLibraryItem | null;
}

export interface LibraryActions {
  setSelectedLibraryItemId: React.Dispatch<React.SetStateAction<string | null>>;
  setLibraryNameDraft: React.Dispatch<React.SetStateAction<string>>;
  handleNewLibraryEntry: () => void;
  handleSaveLibraryItem: () => Promise<void>;
  handleLoadLibraryItem: (itemId: string) => void;
  handleDeleteLibraryItem: (itemId: string) => Promise<void>;
}

// ── Contexts ─────────────────────────────────────────────────────────────────

const LibraryStateContext = createContext<LibraryState | null>(null);
const LibraryActionsContext = createContext<LibraryActions | null>(null);

// ── Provider ─────────────────────────────────────────────────────────────────

export function LibraryProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { toast } = useToast();
  const settingsQuery = useSettingsMap({ scope: 'all' });
  const updateSetting = useUpdateSetting();

  const { promptText, documentState } = useDocumentState();
  const {
    setPromptText,
    setDocumentState,
    setSelectedSegmentId,
    setManualBindings,
  } = useDocumentActions();
  const {
    setBenchmarkReport,
    setDismissedBenchmarkSuggestionIds,
  } = useBenchmarkActions();

  const [selectedLibraryItemId, setSelectedLibraryItemId] = useState<string | null>(null);
  const [libraryNameDraft, setLibraryNameDraft] = useState('');

  // ── Derived ────────────────────────────────────────────────────────────────

  const rawPromptLibrary = settingsQuery.data?.get(PROMPT_EXPLODER_LIBRARY_KEY) ?? null;
  const promptLibraryState = useMemo(
    () => parsePromptExploderLibrary(rawPromptLibrary),
    [rawPromptLibrary]
  );
  const promptLibraryItems = useMemo(
    () => sortPromptExploderLibraryItemsByUpdated(promptLibraryState.items),
    [promptLibraryState.items]
  );
  const selectedLibraryItem = useMemo(() => {
    if (!selectedLibraryItemId) return null;
    return promptLibraryItems.find((item) => item.id === selectedLibraryItemId) ?? null;
  }, [promptLibraryItems, selectedLibraryItemId]);

  // ── Sync selection ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!selectedLibraryItemId) return;
    if (promptLibraryItems.some((item) => item.id === selectedLibraryItemId)) return;
    setSelectedLibraryItemId(null);
  }, [promptLibraryItems, selectedLibraryItemId]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const persistPromptLibraryItems = useCallback(
    async (items: PromptExploderLibraryItem[]) => {
      await updateSetting.mutateAsync({
        key: PROMPT_EXPLODER_LIBRARY_KEY,
        value: serializeSetting({ version: 1, items }),
      });
    },
    [updateSetting]
  );

  const handleNewLibraryEntry = useCallback(() => {
    setSelectedLibraryItemId(null);
    setLibraryNameDraft('');
    setPromptText('');
    setDocumentState(null);
    setSelectedSegmentId(null);
    setManualBindings([]);
    setBenchmarkReport(null);
    setDismissedBenchmarkSuggestionIds([]);
    toast('Started a new prompt draft.', { variant: 'info' });
  }, [
    setBenchmarkReport,
    setDismissedBenchmarkSuggestionIds,
    setDocumentState,
    setManualBindings,
    setPromptText,
    setSelectedSegmentId,
    toast,
  ]);

  const handleSaveLibraryItem = useCallback(async () => {
    const prompt = promptText.trim();
    if (!prompt) {
      toast('Enter a prompt before saving to the library.', { variant: 'info' });
      return;
    }
    const now = new Date().toISOString();
    const nextItem = buildPromptExploderLibraryItem({
      prompt,
      libraryNameDraft,
      existingItem: selectedLibraryItem,
      documentState,
      now,
      createItemId: createPromptExploderLibraryItemId,
    });
    const nextItems = upsertPromptExploderLibraryItems({
      items: promptLibraryState.items,
      nextItem,
      maxItems: 200,
    });
    try {
      await persistPromptLibraryItems(nextItems);
      setSelectedLibraryItemId(nextItem.id);
      setLibraryNameDraft(nextItem.name);
      toast(`Saved library entry: ${nextItem.name}`, { variant: 'success' });
    } catch (error) {
      toast(
        error instanceof Error ? error.message : 'Failed to save Prompt Exploder library entry.',
        { variant: 'error' }
      );
    }
  }, [
    documentState,
    libraryNameDraft,
    persistPromptLibraryItems,
    promptLibraryState.items,
    promptText,
    selectedLibraryItem,
    toast,
  ]);

  const handleLoadLibraryItem = useCallback(
    (itemId: string) => {
      const item = promptLibraryItems.find((candidate) => candidate.id === itemId);
      if (!item) {
        toast('Library entry no longer exists.', { variant: 'error' });
        return;
      }
      const hydratedDocument = hydratePromptExploderLibraryDocument(item);
      setSelectedLibraryItemId(item.id);
      setLibraryNameDraft(item.name);
      setPromptText(item.prompt);
      setDocumentState(hydratedDocument);
      setSelectedSegmentId(hydratedDocument?.segments[0]?.id ?? null);
      setManualBindings(getManualBindingsFromDocument(hydratedDocument));
      setBenchmarkReport(null);
      setDismissedBenchmarkSuggestionIds([]);
      toast(`Loaded library entry: ${item.name}`, { variant: 'success' });
    },
    [
      promptLibraryItems,
      setBenchmarkReport,
      setDismissedBenchmarkSuggestionIds,
      setDocumentState,
      setManualBindings,
      setPromptText,
      setSelectedSegmentId,
      toast,
    ]
  );

  const handleDeleteLibraryItem = useCallback(
    async (itemId: string) => {
      const target = promptLibraryState.items.find((item) => item.id === itemId);
      if (!target) {
        toast('Library entry no longer exists.', { variant: 'info' });
        return;
      }
      const nextItems = removePromptExploderLibraryItemById(promptLibraryState.items, itemId);
      try {
        await persistPromptLibraryItems(nextItems);
        if (selectedLibraryItemId === itemId) {
          setSelectedLibraryItemId(null);
        }
        toast(`Deleted library entry: ${target.name}`, { variant: 'success' });
      } catch (error) {
        toast(
          error instanceof Error ? error.message : 'Failed to delete Prompt Exploder library entry.',
          { variant: 'error' }
        );
      }
    },
    [persistPromptLibraryItems, promptLibraryState.items, selectedLibraryItemId, toast]
  );

  // ── Memoized context values ────────────────────────────────────────────────

  const stateValue = useMemo<LibraryState>(
    () => ({
      selectedLibraryItemId,
      libraryNameDraft,
      promptLibraryItems,
      selectedLibraryItem,
    }),
    [selectedLibraryItemId, libraryNameDraft, promptLibraryItems, selectedLibraryItem]
  );

  const actionsValue = useMemo<LibraryActions>(
    () => ({
      setSelectedLibraryItemId,
      setLibraryNameDraft,
      handleNewLibraryEntry,
      handleSaveLibraryItem,
      handleLoadLibraryItem,
      handleDeleteLibraryItem,
    }),
    [
      handleNewLibraryEntry,
      handleSaveLibraryItem,
      handleLoadLibraryItem,
      handleDeleteLibraryItem,
    ]
  );

  return (
    <LibraryStateContext.Provider value={stateValue}>
      <LibraryActionsContext.Provider value={actionsValue}>
        {children}
      </LibraryActionsContext.Provider>
    </LibraryStateContext.Provider>
  );
}

export { LibraryStateContext, LibraryActionsContext };
