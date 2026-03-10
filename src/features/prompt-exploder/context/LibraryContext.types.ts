
import type {
  CaptureSegmentationRecordResult,
  PromptExploderSegmentationLibraryState,
  PromptExploderSegmentationRecord,
} from '@/shared/contracts/prompt-exploder';

import type { PromptExploderLibraryItem } from '../prompt-library';
import type { Dispatch, SetStateAction } from 'react';

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
