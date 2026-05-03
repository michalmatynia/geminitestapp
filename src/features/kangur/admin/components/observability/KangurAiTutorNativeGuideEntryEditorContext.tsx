'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { KangurAiTutorNativeGuideEntry } from '@/features/kangur/shared/contracts/kangur-ai-tutor-native-guide';
import type { KangurAiTutorOnboardingValidationIssue } from '@/features/kangur/ai-tutor/onboarding-validation';
import type { KangurAiTutorLocaleTranslationStatusDto } from '@/shared/contracts/kangur-ai-tutor-locale-scaffold';
import { internalError } from '@/features/kangur/shared/errors/app-error';

export type KangurAiTutorNativeGuideEntryTranslationStatus =
  KangurAiTutorLocaleTranslationStatusDto;

export type KangurAiTutorNativeGuideEntryEditorContextValue = {
  selectedEntry: KangurAiTutorNativeGuideEntry | null;
  totalEntries: number;
  isSaving: boolean;
  selectedEntryTranslationStatuses: KangurAiTutorNativeGuideEntryTranslationStatus[];
  selectedEntryValidationIssues: KangurAiTutorOnboardingValidationIssue[];
  followUpActionsEditorValue: string;
  onFollowUpActionsEditorValueChange: (value: string) => void;
  updateSelectedEntry: (
    updater: (entry: KangurAiTutorNativeGuideEntry) => KangurAiTutorNativeGuideEntry
  ) => void;
  onDuplicate: () => void;
  onMove: (direction: -1 | 1) => void;
  onDelete: () => void;
  onApplyFollowUpActions: () => void;
};

const KangurAiTutorNativeGuideEntryEditorContext =
  createContext<KangurAiTutorNativeGuideEntryEditorContextValue | null>(null);

export function KangurAiTutorNativeGuideEntryEditorProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: KangurAiTutorNativeGuideEntryEditorContextValue;
}): React.JSX.Element {
  return (
    <KangurAiTutorNativeGuideEntryEditorContext.Provider value={value}>
      {children}
    </KangurAiTutorNativeGuideEntryEditorContext.Provider>
  );
}

export function useKangurAiTutorNativeGuideEntryEditor(): KangurAiTutorNativeGuideEntryEditorContextValue {
  const context = useContext(KangurAiTutorNativeGuideEntryEditorContext);
  if (!context) {
    throw internalError(
      'useKangurAiTutorNativeGuideEntryEditor must be used within a KangurAiTutorNativeGuideEntryEditorProvider'
    );
  }
  return context;
}
