'use client';

import { useSearchParams } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';

import type {
  CaptureSegmentationRecordResult,
  PromptExploderSegmentationLibraryState,
  PromptExploderSegmentationRecord,
} from '@/shared/contracts/prompt-exploder';
import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import { useToast } from '@/shared/ui';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import {
  buildPromptExploderLibraryItem,
  createPromptExploderLibraryItemId,
  parsePromptExploderLibrary,
  PROMPT_EXPLODER_LIBRARY_KEY,
  removePromptExploderLibraryItemById,
  sortPromptExploderLibraryItemsByUpdated,
  upsertPromptExploderLibraryItems,
  type PromptExploderLibraryItem,
} from '../prompt-library';
import {
  parsePromptExploderSegmentationLibrary,
  PROMPT_EXPLODER_SEGMENTATION_LIBRARY_KEY,
  removePromptExploderSegmentationRecordById,
  sortPromptExploderSegmentationRecordsByCapturedAt,
} from '../segmentation-library';
import { useBenchmarkActions } from './BenchmarkContext';
import { useLibraryPersistence } from './library/useLibraryPersistence';
import { useLibraryWorkspaceLoaders } from './library/useLibraryWorkspaceLoaders';
import { useSegmentationAnalysisContextJson } from './library/useSegmentationAnalysisContextJson';
import { useSegmentationRecordCapture } from './library/useSegmentationRecordCapture';
import { useDocumentActions, useDocumentState } from './DocumentContext';
import { useSettingsActions, useSettingsState } from './SettingsContext';

// ── Types ────────────────────────────────────────────────────────────────────

export interface LibraryState {
  selectedLibraryItemId: string | null;
  libraryNameDraft: string;
  promptLibraryItems: PromptExploderLibraryItem[];
  selectedLibraryItem: PromptExploderLibraryItem | null;
  selectedSegmentationRecordId: string | null;
  segmentationRecords: PromptExploderSegmentationRecord[];
  selectedSegmentationRecord: PromptExploderSegmentationRecord | null;
  segmentationLibraryState: PromptExploderSegmentationLibraryState;
}

export interface LibraryActions {
  setSelectedLibraryItemId: Dispatch<SetStateAction<string | null>>;
  setLibraryNameDraft: Dispatch<SetStateAction<string>>;
  setSelectedSegmentationRecordId: Dispatch<SetStateAction<string | null>>;
  handleNewLibraryEntry: () => void;
  handleSaveLibraryItem: () => Promise<void>;
  handleLoadLibraryItem: (itemId: string) => void;
  handleDeleteLibraryItem: (itemId: string) => Promise<void>;
  captureSegmentationRecordOnApply: () => Promise<CaptureSegmentationRecordResult>;
  handleLoadSegmentationRecordIntoWorkspace: (recordId: string) => void;
  handleDeleteSegmentationRecord: (recordId: string) => Promise<void>;
  buildSegmentationAnalysisContextJsonForRecord: (recordId: string) => string | null;
  buildSegmentationAnalysisContextJsonForAll: () => string;
}

// ── Contexts ─────────────────────────────────────────────────────────────────

const libraryStateContextResult = createStrictContext<LibraryState>({
  hookName: 'useLibraryState',
  providerName: 'LibraryProvider',
  displayName: 'LibraryStateContext',
  errorFactory: (message) => internalError(message),
});

const libraryActionsContextResult = createStrictContext<LibraryActions>({
  hookName: 'useLibraryActions',
  providerName: 'LibraryProvider',
  displayName: 'LibraryActionsContext',
  errorFactory: (message) => internalError(message),
});

const LibraryStateContext = libraryStateContextResult.Context;
const LibraryActionsContext = libraryActionsContextResult.Context;

// ── Provider ─────────────────────────────────────────────────────────────────

export function LibraryProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const { settingsMap, activeValidationScope, activeValidationRuleStack } = useSettingsState();
  const { updateSetting } = useSettingsActions();

  const { promptText, documentState, returnTarget } = useDocumentState();
  const { setPromptText, setDocumentState, setSelectedSegmentId, setManualBindings } =
    useDocumentActions();
  const { setBenchmarkReport, setDismissedBenchmarkSuggestionIds } = useBenchmarkActions();

  const [selectedLibraryItemId, setSelectedLibraryItemId] = useState<string | null>(null);
  const [selectedSegmentationRecordId, setSelectedSegmentationRecordId] = useState<string | null>(
    null
  );
  const [libraryNameDraft, setLibraryNameDraft] = useState('');
  const [loadedProjectIdFromQuery, setLoadedProjectIdFromQuery] = useState<string | null>(null);

  // ── Derived ────────────────────────────────────────────────────────────────

  const rawPromptLibrary = settingsMap.get(PROMPT_EXPLODER_LIBRARY_KEY) ?? null;
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

  const rawSegmentationLibrary = settingsMap.get(PROMPT_EXPLODER_SEGMENTATION_LIBRARY_KEY) ?? null;
  const parsedSegmentationLibraryState = useMemo(
    () => parsePromptExploderSegmentationLibrary(rawSegmentationLibrary),
    [rawSegmentationLibrary]
  );
  const segmentationRecords = useMemo(
    () => sortPromptExploderSegmentationRecordsByCapturedAt(parsedSegmentationLibraryState.records),
    [parsedSegmentationLibraryState.records]
  );
  const segmentationLibraryState = useMemo<PromptExploderSegmentationLibraryState>(
    () => ({
      records: segmentationRecords,
      lastCapturedAt: segmentationRecords[0]?.capturedAt ?? null,
      totalCaptured: parsedSegmentationLibraryState.records.length,
      version: parsedSegmentationLibraryState.version ?? 1,
    }),
    [
      parsedSegmentationLibraryState.records.length,
      parsedSegmentationLibraryState.version,
      segmentationRecords,
    ]
  );
  const selectedSegmentationRecord = useMemo(() => {
    if (!selectedSegmentationRecordId) return null;
    return segmentationRecords.find((record) => record.id === selectedSegmentationRecordId) ?? null;
  }, [segmentationRecords, selectedSegmentationRecordId]);
  const activeValidationRuleStackId = useMemo(() => {
    if (!activeValidationRuleStack) return 'none';
    return activeValidationRuleStack;
  }, [activeValidationRuleStack]);

  // ── Sync selection ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!selectedLibraryItemId) return;
    if (promptLibraryItems.some((item) => item.id === selectedLibraryItemId)) return;
    setSelectedLibraryItemId(null);
  }, [promptLibraryItems, selectedLibraryItemId]);

  useEffect(() => {
    if (!selectedSegmentationRecordId) return;
    if (segmentationRecords.some((record) => record.id === selectedSegmentationRecordId)) return;
    setSelectedSegmentationRecordId(null);
  }, [segmentationRecords, selectedSegmentationRecordId]);

  const requestedProjectId = searchParams?.get('projectId')?.trim() ?? '';

  // ── Actions ────────────────────────────────────────────────────────────────

  const { persistPromptLibraryItems, persistSegmentationRecords } = useLibraryPersistence({
    settingsMap,
    updateSetting,
  });

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
      const persisted = await persistPromptLibraryItems(nextItems);
      if (!persisted) {
        toast('No project changes to save.', { variant: 'info' });
        return;
      }
      setSelectedLibraryItemId(nextItem.id);
      setLibraryNameDraft(nextItem.name);
      toast(`Saved library entry: ${nextItem.name}`, { variant: 'success' });
    } catch (error) {
      logClientError(error);
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

  const { handleLoadLibraryItem, handleLoadSegmentationRecordIntoWorkspace } =
    useLibraryWorkspaceLoaders({
      promptLibraryItems,
      segmentationRecords,
      toast,
      setBenchmarkReport,
      setDismissedBenchmarkSuggestionIds,
      setDocumentState,
      setLibraryNameDraft,
      setManualBindings,
      setPromptText,
      setSelectedLibraryItemId,
      setSelectedSegmentId,
      setSelectedSegmentationRecordId,
    });

  useEffect(() => {
    if (!requestedProjectId) return;
    if (loadedProjectIdFromQuery === requestedProjectId) return;
    const requestedItem = promptLibraryItems.find((item) => item.id === requestedProjectId);
    if (!requestedItem) return;
    handleLoadLibraryItem(requestedItem.id);
    setLoadedProjectIdFromQuery(requestedItem.id);
  }, [handleLoadLibraryItem, loadedProjectIdFromQuery, promptLibraryItems, requestedProjectId]);

  const handleDeleteLibraryItem = useCallback(
    async (itemId: string) => {
      const target = promptLibraryState.items.find((item) => item.id === itemId);
      if (!target) {
        toast('Library entry no longer exists.', { variant: 'info' });
        return;
      }
      const nextItems = removePromptExploderLibraryItemById(promptLibraryState.items, itemId);
      try {
        const persisted = await persistPromptLibraryItems(nextItems);
        if (!persisted) {
          toast('Project list was already up to date.', { variant: 'info' });
          return;
        }
        if (selectedLibraryItemId === itemId) {
          setSelectedLibraryItemId(null);
        }
        toast(`Deleted library entry: ${target.name}`, { variant: 'success' });
      } catch (error) {
        logClientError(error);
        toast(
          error instanceof Error
            ? error.message
            : 'Failed to delete Prompt Exploder library entry.',
          { variant: 'error' }
        );
      }
    },
    [persistPromptLibraryItems, promptLibraryState.items, selectedLibraryItemId, toast]
  );

  const captureSegmentationRecordOnApply = useSegmentationRecordCapture({
    activeValidationRuleStackId,
    activeValidationScope,
    documentState,
    parsedSegmentationRecords: parsedSegmentationLibraryState.records,
    persistSegmentationRecords,
    promptText,
    returnTarget,
    setSelectedSegmentationRecordId,
    toast,
  });

  const handleDeleteSegmentationRecord = useCallback(
    async (recordId: string): Promise<void> => {
      const target = parsedSegmentationLibraryState.records.find(
        (record) => record.id === recordId
      );
      if (!target) {
        toast('Segmentation context record no longer exists.', { variant: 'info' });
        return;
      }
      const nextRecords = removePromptExploderSegmentationRecordById(
        parsedSegmentationLibraryState.records,
        recordId
      );
      try {
        const persisted = await persistSegmentationRecords(nextRecords);
        if (!persisted) {
          toast('Segmentation context list was already up to date.', { variant: 'info' });
          return;
        }
        if (selectedSegmentationRecordId === recordId) {
          setSelectedSegmentationRecordId(null);
        }
        toast('Deleted segmentation context record.', { variant: 'success' });
      } catch (error) {
        logClientError(error);
        toast(
          error instanceof Error ? error.message : 'Failed to delete segmentation context record.',
          { variant: 'error' }
        );
      }
    },
    [
      persistSegmentationRecords,
      parsedSegmentationLibraryState.records,
      selectedSegmentationRecordId,
      toast,
    ]
  );

  const { buildSegmentationAnalysisContextJsonForRecord, buildSegmentationAnalysisContextJsonForAll } =
    useSegmentationAnalysisContextJson(segmentationRecords);

  // ── Memoized context values ────────────────────────────────────────────────

  const stateValue = useMemo<LibraryState>(
    () => ({
      selectedLibraryItemId,
      libraryNameDraft,
      promptLibraryItems,
      selectedLibraryItem,
      selectedSegmentationRecordId,
      segmentationRecords,
      selectedSegmentationRecord,
      segmentationLibraryState,
    }),
    [
      selectedLibraryItemId,
      libraryNameDraft,
      promptLibraryItems,
      selectedLibraryItem,
      selectedSegmentationRecordId,
      segmentationRecords,
      selectedSegmentationRecord,
      segmentationLibraryState,
    ]
  );

  const actionsValue = useMemo<LibraryActions>(
    () => ({
      setSelectedLibraryItemId,
      setLibraryNameDraft,
      setSelectedSegmentationRecordId,
      handleNewLibraryEntry,
      handleSaveLibraryItem,
      handleLoadLibraryItem,
      handleDeleteLibraryItem,
      captureSegmentationRecordOnApply,
      handleLoadSegmentationRecordIntoWorkspace,
      handleDeleteSegmentationRecord,
      buildSegmentationAnalysisContextJsonForRecord,
      buildSegmentationAnalysisContextJsonForAll,
    }),
    [
      handleNewLibraryEntry,
      handleSaveLibraryItem,
      handleLoadLibraryItem,
      handleDeleteLibraryItem,
      captureSegmentationRecordOnApply,
      handleLoadSegmentationRecordIntoWorkspace,
      handleDeleteSegmentationRecord,
      buildSegmentationAnalysisContextJsonForRecord,
      buildSegmentationAnalysisContextJsonForAll,
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

// ── Hook exports ─────────────────────────────────────────────────────────────

export const useLibraryState = libraryStateContextResult.useStrictContext;

export const useLibraryActions = libraryActionsContextResult.useStrictContext;

export { LibraryStateContext, LibraryActionsContext };
