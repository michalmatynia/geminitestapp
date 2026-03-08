'use client';

import { createContext, useContext } from 'react';
import type {
  PromptExploderDocument,
  PromptExploderBinding,
  PromptExploderSegment,
} from '../../types';
import { internalError } from '@/shared/errors/app-error';

export interface DocumentActions {
  setPromptText: (text: string) => void;
  setDocumentState: React.Dispatch<React.SetStateAction<PromptExploderDocument | null>>;
  setManualBindings: React.Dispatch<React.SetStateAction<PromptExploderBinding[]>>;
  setSelectedSegmentId: React.Dispatch<React.SetStateAction<string | null>>;
  handleExplode: () => void;
  syncManualBindings: (bindings: PromptExploderBinding[]) => void;
  replaceSegments: (segments: PromptExploderSegment[]) => void;
  updateSegment: (
    segmentId: string,
    updater: (current: PromptExploderSegment) => PromptExploderSegment
  ) => void;
  clearDocument: () => void;
  handleReloadFromStudio: () => void;
  handleApplyToImageStudio: () => Promise<void>;
  updateParameterValue: (segmentId: string, path: string, value: unknown) => void;
  updateParameterSelector: (segmentId: string, path: string, control: string) => void;
  updateParameterComment: (segmentId: string, path: string, comment: string | null) => void;
  updateParameterDescription: (segmentId: string, path: string, description: string | null) => void;
}

export const DocumentActionsContext = createContext<DocumentActions | null>(null);

export function useDocumentActions(): DocumentActions {
  const context = useContext(DocumentActionsContext);
  if (!context) throw internalError('useDocumentActions must be used within DocumentProvider');
  return context;
}
