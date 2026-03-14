'use client';

import { createContext, useContext, ReactNode } from 'react';
import type { KangurAiTutorNativeGuideEntry } from '@/shared/contracts/kangur-ai-tutor-native-guide';
import type { KangurAiTutorOnboardingValidationIssue } from '@/features/kangur/ai-tutor-onboarding-validation';

export type KangurAiTutorNativeGuideEntryEditorContextValue = {
  selectedEntry: KangurAiTutorNativeGuideEntry | null;
  totalEntries: number;
  isSaving: boolean;
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
    throw new Error(
      'useKangurAiTutorNativeGuideEntryEditor must be used within a KangurAiTutorNativeGuideEntryEditorProvider'
    );
  }
  return context;
}
