'use client';

import { useCallback } from 'react';

import type { PromptExploderSegmentationRecord } from '@/shared/contracts/prompt-exploder';
import type { Toast } from '@/shared/contracts/ui';

import {
  getManualBindingsFromDocument,
  hydratePromptExploderLibraryDocument,
  type PromptExploderLibraryItem,
} from '../../prompt-library';
import { hydratePromptExploderSegmentationRecordDocument } from '../../segmentation-library';
import type { BenchmarkActions } from '../BenchmarkContext';
import type { DocumentActions } from '../DocumentContext';

export const useLibraryWorkspaceLoaders = ({
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
}: {
  promptLibraryItems: PromptExploderLibraryItem[];
  segmentationRecords: PromptExploderSegmentationRecord[];
  toast: Toast;
  setBenchmarkReport: BenchmarkActions['setBenchmarkReport'];
  setDismissedBenchmarkSuggestionIds: BenchmarkActions['setDismissedBenchmarkSuggestionIds'];
  setDocumentState: DocumentActions['setDocumentState'];
  setLibraryNameDraft: React.Dispatch<React.SetStateAction<string>>;
  setManualBindings: DocumentActions['setManualBindings'];
  setPromptText: DocumentActions['setPromptText'];
  setSelectedLibraryItemId: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedSegmentId: DocumentActions['setSelectedSegmentId'];
  setSelectedSegmentationRecordId: React.Dispatch<React.SetStateAction<string | null>>;
}) => {
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
      setLibraryNameDraft,
      setManualBindings,
      setPromptText,
      setSelectedLibraryItemId,
      setSelectedSegmentId,
      setSelectedSegmentationRecordId,
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
      setLibraryNameDraft,
      setManualBindings,
      setPromptText,
      setSelectedLibraryItemId,
      setSelectedSegmentId,
      setSelectedSegmentationRecordId,
      toast,
    ]
  );

  return {
    handleLoadLibraryItem,
    handleLoadSegmentationRecordIntoWorkspace,
  };
};
