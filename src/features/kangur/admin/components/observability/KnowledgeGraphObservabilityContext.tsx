'use client';

import { createContext, useContext, type ReactNode } from 'react';

import type { KangurKnowledgeGraphPreviewResponse } from '@/shared/contracts/kangur-observability';
import type { KangurKnowledgeGraphStatusSnapshot } from '@/shared/contracts/kangur-observability';
import { internalError } from '@/features/kangur/shared/errors/app-error';

export type KnowledgeGraphPreviewDraft = {
  latestUserMessage: string;
  replayEventId: string;
  sectionPresetId: string;
  surface: string;
  promptMode: string;
  interactionIntent: string;
  focusKind: string;
  focusId: string;
  focusLabel: string;
  contentId: string;
  questionId: string;
  assignmentId: string;
  answerRevealed: string;
  selectedText: string;
  title: string;
  description: string;
};

export type KnowledgeGraphPreviewSelectOption = {
  value: string;
  label: string;
  group?: string;
};

export type KnowledgeGraphPreviewReplayCandidate = {
  id: string;
  eventName: string;
  ts: string;
  path: string;
  surface: string;
  promptMode: string;
  focusKind: string;
  focusLabel: string;
  latestUserMessage: string;
  draft: KnowledgeGraphPreviewDraft;
  option: KnowledgeGraphPreviewSelectOption;
};

export type KnowledgeGraphObservabilityContextValue = {
  knowledgeGraphStatus: KangurKnowledgeGraphStatusSnapshot;
  knowledgeGraphStatusIsRefreshing: boolean;
  knowledgeGraphIsSyncing: boolean;
  knowledgeGraphSyncFeedback: {
    tone: 'success' | 'error';
    message: string;
  } | null;
  knowledgeGraphStatusError: Error | null;
  knowledgeGraphPreviewDraft: KnowledgeGraphPreviewDraft;
  knowledgeGraphPreviewResult: KangurKnowledgeGraphPreviewResponse | null;
  knowledgeGraphPreviewError: string | null;
  knowledgeGraphPreviewIsRunning: boolean;
  knowledgeGraphPreviewReplayCandidates: readonly KnowledgeGraphPreviewReplayCandidate[];
  updateKnowledgeGraphPreviewDraft: (field: keyof KnowledgeGraphPreviewDraft, value: string) => void;
  applyKnowledgeGraphPreviewReplayEvent: (eventId: string) => void;
  replayAnalyticsEventInKnowledgeGraphPreview: (eventId: string) => void;
  applyKnowledgeGraphPreviewPreset: (entryId: string) => void;
  clearKnowledgeGraphPreviewContext: () => void;
  runKnowledgeGraphPreview: () => void;
  refreshKnowledgeGraphStatus: () => void;
  syncKnowledgeGraph: () => void;
};

const KnowledgeGraphObservabilityContext =
  createContext<KnowledgeGraphObservabilityContextValue | null>(null);

export function KnowledgeGraphObservabilityProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: KnowledgeGraphObservabilityContextValue;
}): React.JSX.Element {
  return (
    <KnowledgeGraphObservabilityContext.Provider value={value}>
      {children}
    </KnowledgeGraphObservabilityContext.Provider>
  );
}

export function useKnowledgeGraphObservability(): KnowledgeGraphObservabilityContextValue {
  const context = useContext(KnowledgeGraphObservabilityContext);
  if (!context) {
    throw internalError(
      'useKnowledgeGraphObservability must be used within a KnowledgeGraphObservabilityProvider'
    );
  }
  return context;
}
