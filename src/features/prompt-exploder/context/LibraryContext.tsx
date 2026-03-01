'use client';

import { useSearchParams } from 'next/navigation';
import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';

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
import {
  appendPromptExploderSegmentationRecord,
  buildPromptExploderSegmentationAnalysisContextJson,
  buildPromptExploderSegmentationRecord,
  hydratePromptExploderSegmentationRecordDocument,
  parsePromptExploderSegmentationLibrary,
  PROMPT_EXPLODER_SEGMENTATION_LIBRARY_KEY,
  PROMPT_EXPLODER_SEGMENTATION_LIBRARY_MAX_RECORDS,
  removePromptExploderSegmentationRecordById,
  sortPromptExploderSegmentationRecordsByCapturedAt,
  type PromptExploderSegmentationRecord,
} from '../segmentation-library';
import { useBenchmarkActions } from './hooks/useBenchmark';
import { useDocumentState, useDocumentActions } from './hooks/useDocument';
import { useSettingsActions, useSettingsState } from './hooks/useSettings';

// ── Types ────────────────────────────────────────────────────────────────────

export type CaptureSegmentationRecordReason =
  | 'missing_prompt'
  | 'missing_document'
  | 'persist_failed'
  | 'no_changes';

export type CaptureSegmentationRecordResult = {
  captured: boolean;
  persisted: boolean;
  reason?: CaptureSegmentationRecordReason;
  recordId?: string;
};

export interface LibraryState {
  selectedLibraryItemId: string | null;
  libraryNameDraft: string;
  promptLibraryItems: PromptExploderLibraryItem[];
  selectedLibraryItem: PromptExploderLibraryItem | null;
  selectedSegmentationRecordId: string | null;
  segmentationRecords: PromptExploderSegmentationRecord[];
  selectedSegmentationRecord: PromptExploderSegmentationRecord | null;
}

export interface LibraryActions {
  setSelectedLibraryItemId: React.Dispatch<React.SetStateAction<string | null>>;
  setLibraryNameDraft: React.Dispatch<React.SetStateAction<string>>;
  setSelectedSegmentationRecordId: React.Dispatch<React.SetStateAction<string | null>>;
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

const LibraryStateContext = createContext<LibraryState | null>(null);
const LibraryActionsContext = createContext<LibraryActions | null>(null);

// ── Provider ─────────────────────────────────────────────────────────────────

export function LibraryProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
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
  const segmentationLibraryState = useMemo(
    () => parsePromptExploderSegmentationLibrary(rawSegmentationLibrary),
    [rawSegmentationLibrary]
  );
  const segmentationRecords = useMemo(
    () => sortPromptExploderSegmentationRecordsByCapturedAt(segmentationLibraryState.records),
    [segmentationLibraryState.records]
  );
  const selectedSegmentationRecord = useMemo(() => {
    if (!selectedSegmentationRecordId) return null;
    return segmentationRecords.find((record) => record.id === selectedSegmentationRecordId) ?? null;
  }, [segmentationRecords, selectedSegmentationRecordId]);
  const activeValidationRuleStackId = useMemo(() => {
    if (!activeValidationRuleStack) return 'none';
    if (typeof activeValidationRuleStack === 'string') return activeValidationRuleStack;
    return activeValidationRuleStack.id ?? activeValidationRuleStack.name ?? 'anonymous';
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

  const persistPromptLibraryItems = useCallback(
    async (items: PromptExploderLibraryItem[]): Promise<boolean> => {
      const serialized = serializeSetting({ version: 1, items });
      if (settingsMap.get(PROMPT_EXPLODER_LIBRARY_KEY) === serialized) {
        return false;
      }
      await updateSetting.mutateAsync({
        key: PROMPT_EXPLODER_LIBRARY_KEY,
        value: serialized,
      });
      return true;
    },
    [settingsMap, updateSetting]
  );

  const persistSegmentationRecords = useCallback(
    async (records: PromptExploderSegmentationRecord[]): Promise<boolean> => {
      const serialized = serializeSetting({
        version: 1,
        records,
      });
      if (settingsMap.get(PROMPT_EXPLODER_SEGMENTATION_LIBRARY_KEY) === serialized) {
        return false;
      }
      await updateSetting.mutateAsync({
        key: PROMPT_EXPLODER_SEGMENTATION_LIBRARY_KEY,
        value: serialized,
      });
      return true;
    },
    [settingsMap, updateSetting]
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
      const persisted = await persistPromptLibraryItems(nextItems);
      if (!persisted) {
        toast('No project changes to save.', { variant: 'info' });
        return;
      }
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
      setSelectedSegmentationRecordId(null);
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

  const captureSegmentationRecordOnApply = useCallback(
    async (): Promise<CaptureSegmentationRecordResult> => {
      if (!promptText.trim()) {
        return {
          captured: false,
          persisted: false,
          reason: 'missing_prompt',
        };
      }
      if (!documentState) {
        return {
          captured: false,
          persisted: false,
          reason: 'missing_document',
        };
      }
      const now = new Date().toISOString();
      const nextRecord = buildPromptExploderSegmentationRecord({
        promptText,
        documentState,
        now,
        returnTarget,
        validationScope: activeValidationScope,
        validationRuleStack: activeValidationRuleStackId,
      });
      if (!nextRecord) {
        return {
          captured: false,
          persisted: false,
          reason: 'missing_document',
        };
      }
      const nextRecords = appendPromptExploderSegmentationRecord({
        records: segmentationLibraryState.records,
        nextRecord,
        maxRecords: PROMPT_EXPLODER_SEGMENTATION_LIBRARY_MAX_RECORDS,
      });
      try {
        const persisted = await persistSegmentationRecords(nextRecords);
        if (persisted) {
          setSelectedSegmentationRecordId(nextRecord.id);
        }
        return {
          captured: true,
          persisted,
          ...(persisted
            ? { recordId: nextRecord.id }
            : {
              reason: 'no_changes' as const,
            }),
        };
      } catch (error) {
        toast(
          error instanceof Error
            ? `Failed to capture segmentation context: ${error.message}`
            : 'Failed to capture segmentation context.',
          { variant: 'warning' }
        );
        return {
          captured: true,
          persisted: false,
          reason: 'persist_failed',
          recordId: nextRecord.id,
        };
      }
    },
    [
      activeValidationRuleStackId,
      activeValidationScope,
      documentState,
      persistSegmentationRecords,
      promptText,
      returnTarget,
      segmentationLibraryState.records,
      toast,
    ]
  );

  const handleLoadSegmentationRecordIntoWorkspace = useCallback(
    (recordId: string): void => {
      const record = segmentationRecords.find((candidate) => candidate.id === recordId);
      if (!record) {
        toast('Segmentation context record no longer exists.', { variant: 'error' });
        return;
      }
      const hydratedDocument = hydratePromptExploderSegmentationRecordDocument(record);
      setSelectedLibraryItemId(null);
      setSelectedSegmentationRecordId(record.id);
      setLibraryNameDraft('');
      setPromptText(record.sourcePrompt);
      setDocumentState(hydratedDocument);
      setSelectedSegmentId(hydratedDocument?.segments[0]?.id ?? null);
      setManualBindings(getManualBindingsFromDocument(hydratedDocument));
      setBenchmarkReport(null);
      setDismissedBenchmarkSuggestionIds([]);
      toast('Loaded segmentation context into workspace.', { variant: 'success' });
    },
    [
      segmentationRecords,
      setBenchmarkReport,
      setDismissedBenchmarkSuggestionIds,
      setDocumentState,
      setManualBindings,
      setPromptText,
      setSelectedSegmentId,
      toast,
    ]
  );

  const handleDeleteSegmentationRecord = useCallback(
    async (recordId: string): Promise<void> => {
      const target = segmentationLibraryState.records.find((record) => record.id === recordId);
      if (!target) {
        toast('Segmentation context record no longer exists.', { variant: 'info' });
        return;
      }
      const nextRecords = removePromptExploderSegmentationRecordById(
        segmentationLibraryState.records,
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
        toast(
          error instanceof Error
            ? error.message
            : 'Failed to delete segmentation context record.',
          { variant: 'error' }
        );
      }
    },
    [
      persistSegmentationRecords,
      segmentationLibraryState.records,
      selectedSegmentationRecordId,
      toast,
    ]
  );

  const buildSegmentationAnalysisContextJsonForRecord = useCallback(
    (recordId: string): string | null => {
      const record = segmentationRecords.find((candidate) => candidate.id === recordId);
      if (!record) return null;
      return buildPromptExploderSegmentationAnalysisContextJson({
        records: [record],
      });
    },
    [segmentationRecords]
  );

  const buildSegmentationAnalysisContextJsonForAll = useCallback(
    (): string =>
      buildPromptExploderSegmentationAnalysisContextJson({
        records: segmentationRecords,
      }),
    [segmentationRecords]
  );

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
    }),
    [
      selectedLibraryItemId,
      libraryNameDraft,
      promptLibraryItems,
      selectedLibraryItem,
      selectedSegmentationRecordId,
      segmentationRecords,
      selectedSegmentationRecord,
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

export { LibraryStateContext, LibraryActionsContext };
