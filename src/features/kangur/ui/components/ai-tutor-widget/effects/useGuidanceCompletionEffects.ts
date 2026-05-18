'use client';

import { useEffect } from 'react';

import { trackKangurClientEvent } from '@/features/kangur/observability/client';
import type {
  KangurAiTutorRuntimeMessage,
  KangurAiTutorTelemetryContextDto,
} from '@/features/kangur/shared/contracts/kangur-ai-tutor';

import type { PendingSelectionResponse, SectionExplainContext } from '../KangurAiTutorWidget.types';
import { useSectionGuidanceEffect } from './useSectionGuidanceEffect';

export type GuidanceCompletionInput = {
  activeSelectedText: string | null;
  contextualTutorMode: string | null;
  highlightedSection: SectionExplainContext | null;
  isLoading: boolean;
  isOpen: boolean;
  isSectionGuidedMode: boolean;
  isSelectionGuidedMode: boolean;
  messages: KangurAiTutorRuntimeMessage[];
  panelShellMode: string;
  sectionResponseComplete: SectionExplainContext | null;
  sectionResponseCompleteTimeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
  sectionResponsePending: SectionExplainContext | null;
  selectionConversationSelectedText: string | null;
  selectionConversationStartIndex: number | null;
  selectionResponseComplete: PendingSelectionResponse | null;
  selectionResponseCompleteTimeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
  selectionResponsePending: PendingSelectionResponse | null;
  setSectionResponseComplete: (value: SectionExplainContext | null) => void;
  setSectionResponsePending: (value: SectionExplainContext | null) => void;
  setSelectionGuidanceCalloutVisibleText: (value: string | null) => void;
  setSelectionResponseComplete: (value: PendingSelectionResponse | null) => void;
  setSelectionResponsePending: (value: PendingSelectionResponse | null) => void;
  telemetryContext: KangurAiTutorTelemetryContextDto;
};

export function useKangurAiTutorGuidanceCompletionEffects(input: GuidanceCompletionInput): void {
  const {
    isLoading,
    isOpen,
    isSectionGuidedMode,
    isSelectionGuidedMode,
    messages,
    sectionResponsePending,
    selectionConversationStartIndex,
    selectionResponsePending,
    setSectionResponseComplete,
    setSectionResponsePending,
    setSelectionGuidanceCalloutVisibleText,
    setSelectionResponseComplete,
    setSelectionResponsePending,
    telemetryContext,
  } = input;

  useEffect(() => {
    if (!selectionResponsePending || isLoading) return;

    const thread =
      selectionConversationStartIndex !== null
        ? messages.slice(selectionConversationStartIndex)
        : [];
    const hasResponse = [...thread].reverse().some((m) => m.role === 'assistant');

    if (!isSelectionGuidedMode || !hasResponse) return;

    trackKangurClientEvent('kangur_ai_tutor_selection_guidance_completed', {
      ...telemetryContext,
      selectionLength: selectionResponsePending.selectedText.length,
    });
    setSelectionResponseComplete({ selectedText: selectionResponsePending.selectedText });
    setSelectionResponsePending(null);
    setSelectionGuidanceCalloutVisibleText(selectionResponsePending.selectedText);
  }, [
    isLoading,
    isSelectionGuidedMode,
    messages,
    selectionConversationStartIndex,
    selectionResponsePending,
    setSelectionGuidanceCalloutVisibleText,
    setSelectionResponseComplete,
    setSelectionResponsePending,
    telemetryContext,
  ]);

  useSectionGuidanceEffect({
    isLoading,
    isOpen,
    isSectionGuidedMode,
    sectionResponsePending,
    setSectionResponseComplete,
    setSectionResponsePending,
    telemetryContext,
  });
}
