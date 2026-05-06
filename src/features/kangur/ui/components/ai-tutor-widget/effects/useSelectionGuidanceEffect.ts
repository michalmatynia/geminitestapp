import { useEffect, useCallback } from 'react';
import { trackKangurClientEvent } from '@/features/kangur/observability/client';
import { areTutorSelectionTextsEquivalent } from '../KangurAiTutorWidget.helpers';
import type { KangurAiTutorTelemetryContextDto, KangurAiTutorRuntimeMessage } from '@/features/kangur/shared/contracts/kangur-ai-tutor';
import type { PendingSelectionResponse } from '../KangurAiTutorWidget.types';

export type SelectionGuidanceInput = {
  contextualTutorMode: string | null;
  isLoading: boolean;
  isOpen: boolean;
  panelShellMode: string;
  isSelectionGuidedMode: boolean;
  selectionConversationSelectedText: string | null;
  selectionConversationStartIndex: number | null;
  messages: KangurAiTutorRuntimeMessage[];
  selectionResponseComplete: PendingSelectionResponse | null;
  selectionResponsePending: PendingSelectionResponse | null;
  setSelectionGuidanceCalloutVisibleText: (value: string | null) => void;
  setSelectionResponseComplete: (value: PendingSelectionResponse | null) => void;
  setSelectionResponsePending: (value: PendingSelectionResponse | null) => void;
  telemetryContext: KangurAiTutorTelemetryContextDto;
  selectionGuidanceHandoffText: string | null;
};

export function useSelectionGuidanceEffect(input: SelectionGuidanceInput): void {
  const {
    contextualTutorMode, isLoading, isOpen, panelShellMode, isSelectionGuidedMode,
    selectionConversationSelectedText, selectionConversationStartIndex, messages,
    selectionResponsePending, setSelectionGuidanceCalloutVisibleText,
    setSelectionResponseComplete, setSelectionResponsePending, telemetryContext,
    selectionGuidanceHandoffText,
  } = input;

  const checkMinimalContext = useCallback(() => contextualTutorMode === 'selection_explain' &&
    panelShellMode === 'minimal' &&
    areTutorSelectionTextsEquivalent(
      selectionConversationSelectedText,
      selectionResponsePending?.selectedText ?? null
    ), [contextualTutorMode, panelShellMode, selectionConversationSelectedText, selectionResponsePending]);

  useEffect(() => {
    if (!selectionResponsePending || isLoading) return;

    const thread = selectionConversationStartIndex !== null ? messages.slice(selectionConversationStartIndex) : [];
    const response = [...thread].reverse().find((m) => m.role === 'assistant');
    const hasResponse = Boolean(response);

    const isContextMinimal = checkMinimalContext();
    const shouldRevealCallout = isSelectionGuidedMode && hasResponse;
    const shouldFinalizePanel = !isSelectionGuidedMode && isOpen && selectionGuidanceHandoffText === null && !isContextMinimal && hasResponse;

    if (!shouldRevealCallout && !shouldFinalizePanel) return;

    trackKangurClientEvent('kangur_ai_tutor_selection_guidance_completed', {
      ...telemetryContext,
      selectionLength: selectionResponsePending.selectedText.length,
    });
    setSelectionResponseComplete({ selectedText: selectionResponsePending.selectedText });
    setSelectionResponsePending(null);
    if (shouldRevealCallout) setSelectionGuidanceCalloutVisibleText(selectionResponsePending.selectedText);
  }, [
    messages, isLoading, isOpen, panelShellMode, contextualTutorMode, isSelectionGuidedMode, selectionConversationSelectedText,
    selectionConversationStartIndex, selectionResponsePending, setSelectionGuidanceCalloutVisibleText,
    setSelectionResponseComplete, setSelectionResponsePending, telemetryContext, selectionGuidanceHandoffText,
    checkMinimalContext
  ]);
}
