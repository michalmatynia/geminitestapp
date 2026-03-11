'use client';

import { useCallback, type KeyboardEvent } from 'react';

import { trackKangurClientEvent } from '@/features/kangur/observability/client';
import type {
  KangurAiTutorFocusKind,
  KangurAiTutorFollowUpAction,
  KangurAiTutorPromptMode,
  KangurAiTutorSurface,
  KangurAiTutorWebsiteHelpTarget,
} from '@/shared/contracts/kangur-ai-tutor';

import { getAssistantMessageFeedbackKey } from './KangurAiTutorWidget.helpers';
import { persistPendingTutorFollowUp } from './KangurAiTutorWidget.storage';

import type { TutorRenderedMessage } from './KangurAiTutorPanelBody.context';
import type { ActiveTutorFocus, TutorQuickAction } from './KangurAiTutorWidget.shared';
import type { KangurAiTutorWidgetState } from './KangurAiTutorWidget.state';
import type { GuidedTutorAuthMode, SectionExplainContext, TutorMessageFeedback } from './KangurAiTutorWidget.types';

type TelemetryContext = {
  contentId: string | null;
  surface: string | null;
  title: string | null;
};

type UseKangurAiTutorPanelActionsInput = {
  activeFocus: ActiveTutorFocus;
  activeSectionRect: DOMRect | null;
  activeSelectedText: string | null;
  activeSelectionPageRect: DOMRect | null;
  answerRevealed: boolean | undefined;
  bridgeQuickActionId: string | null;
  canSendMessages: boolean;
  clearSelection: () => void;
  drawingImageData: string | null;
  focusSectionRect: (
    rect: DOMRect,
    options?: { forceScroll?: boolean; spotlight?: boolean }
  ) => void;
  focusSelectionPageRect: (
    rect: DOMRect,
    options?: { forceScroll?: boolean; spotlight?: boolean }
  ) => void;
  getCurrentTutorLocation: () => { pathname: string; search: string } | null;
  getInteractionIntent: (
    promptMode: KangurAiTutorPromptMode,
    focusKind: ActiveTutorFocus['kind'],
    answerRevealed: boolean | undefined
  ) => 'hint' | 'explain' | 'review' | 'next_step';
  highlightedSection: SectionExplainContext | null;
  inputValue: string;
  isAnonymousVisitor: boolean;
  isLoading: boolean;
  messageCount: number;
  normalizeConversationFocusKind: (
    focusKind: ActiveTutorFocus['kind']
  ) => KangurAiTutorFocusKind | undefined;
  persistSelectionGeometry: () => void;
  resolveGuestLoginGuidanceIntent: (value: string) => GuidedTutorAuthMode | null;
  resolveTutorFollowUpLocation: (href: string) => { pathname: string; search: string } | null;
  setHighlightedText: (value: string | null) => void;
  sendMessage: (
    text: string,
    options: {
      promptMode: KangurAiTutorPromptMode;
      selectedText: string | null;
      focusKind?: KangurAiTutorFocusKind;
      focusId: string | null;
      focusLabel: string | null;
      assignmentId: string | null;
      interactionIntent?: 'hint' | 'explain' | 'review' | 'next_step';
      drawingImageData?: string | null;
      surface?: KangurAiTutorSurface;
    }
  ) => Promise<void>;
  startGuidedGuestLogin: (
    intent: GuidedTutorAuthMode,
    source: 'chat_message'
  ) => void;
  telemetryContext: TelemetryContext;
  tutorSessionKey: string | null;
  widgetState: Pick<
    KangurAiTutorWidgetState,
    | 'setDismissedSelectedText'
    | 'setDrawingImageData'
    | 'setDrawingMode'
    | 'setHighlightedSection'
    | 'setInputValue'
    | 'setMessageFeedbackByKey'
    | 'setPersistedSelectionContainerRect'
    | 'setPersistedSelectionPageRect'
    | 'setPersistedSelectionPageRects'
    | 'setPersistedSelectionRect'
    | 'setSelectionConversationContext'
    | 'setSectionResponseComplete'
    | 'setSectionResponsePending'
    | 'setSelectionResponseComplete'
  >;
};

export function useKangurAiTutorPanelActions({
  activeFocus,
  activeSectionRect,
  activeSelectedText,
  activeSelectionPageRect,
  answerRevealed,
  bridgeQuickActionId,
  canSendMessages,
  clearSelection,
  drawingImageData,
  focusSectionRect,
  focusSelectionPageRect,
  getCurrentTutorLocation,
  getInteractionIntent,
  highlightedSection,
  inputValue,
  isAnonymousVisitor,
  isLoading,
  messageCount,
  normalizeConversationFocusKind,
  persistSelectionGeometry,
  resolveGuestLoginGuidanceIntent,
  resolveTutorFollowUpLocation,
  setHighlightedText,
  sendMessage,
  startGuidedGuestLogin,
  telemetryContext,
  tutorSessionKey,
  widgetState,
}: UseKangurAiTutorPanelActionsInput) {
  const {
    setDismissedSelectedText,
    setDrawingImageData,
    setDrawingMode,
    setHighlightedSection,
    setInputValue,
    setMessageFeedbackByKey,
    setPersistedSelectionContainerRect,
    setPersistedSelectionPageRect,
    setPersistedSelectionPageRects,
    setPersistedSelectionRect,
    setSelectionConversationContext,
    setSectionResponseComplete,
    setSectionResponsePending,
    setSelectionResponseComplete,
  } = widgetState;

  const handleSend = useCallback(async (): Promise<void> => {
    const text = inputValue.trim();
    if ((!text && !drawingImageData) || isLoading || !canSendMessages) {
      return;
    }

    const guestLoginIntent = isAnonymousVisitor ? resolveGuestLoginGuidanceIntent(text) : null;

    if (guestLoginIntent) {
      setInputValue('');
      startGuidedGuestLogin(guestLoginIntent, 'chat_message');
      return;
    }

    setInputValue('');
    const currentDrawingData = drawingImageData;
    if (currentDrawingData) {
      setDrawingImageData(null);
      setDrawingMode(false);
    }
    if (activeSelectedText) {
      persistSelectionGeometry();
    }
    await sendMessage(text || (currentDrawingData ? '[rysunek]' : ''), {
      promptMode: activeSelectedText ? 'selected_text' : 'chat',
      selectedText: activeSelectedText,
      focusKind: normalizeConversationFocusKind(activeFocus.kind),
      focusId: activeFocus.id,
      focusLabel: activeFocus.label,
      assignmentId: activeFocus.assignmentId,
      interactionIntent:
        activeSelectedText || highlightedSection || activeFocus.kind === 'review'
          ? activeFocus.kind === 'review'
            ? 'review'
            : 'explain'
          : undefined,
      drawingImageData: currentDrawingData,
      surface: highlightedSection?.surface,
    });
    if (activeSelectedText) {
      clearSelection();
      setHighlightedText(null);
    }
  }, [
    activeFocus.assignmentId,
    activeFocus.id,
    activeFocus.kind,
    activeFocus.label,
    activeSelectedText,
    canSendMessages,
    clearSelection,
    drawingImageData,
    highlightedSection,
    inputValue,
    isAnonymousVisitor,
    isLoading,
    normalizeConversationFocusKind,
    persistSelectionGeometry,
    resolveGuestLoginGuidanceIntent,
    sendMessage,
    setDrawingImageData,
    setDrawingMode,
    setHighlightedText,
    setInputValue,
    startGuidedGuestLogin,
  ]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>): void => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        void handleSend();
      }
    },
    [handleSend]
  );

  const handleQuickAction = useCallback(
    async (
      action: TutorQuickAction,
      options?: {
        source?: 'quick_action' | 'proactive_nudge';
      }
    ): Promise<void> => {
      if (isLoading || !canSendMessages) {
        return;
      }
      if (activeSelectedText) {
        persistSelectionGeometry();
      }
      trackKangurClientEvent('kangur_ai_tutor_quick_action_clicked', {
        ...telemetryContext,
        source: options?.source ?? 'quick_action',
        action: action.id,
        promptMode: action.promptMode,
        bridgeActionId: bridgeQuickActionId,
        isBridgeAction: action.id === bridgeQuickActionId,
        hasSelectedText: Boolean(activeSelectedText),
        focusKind: activeFocus.kind ?? null,
      });
      await sendMessage(action.prompt, {
        promptMode: action.promptMode,
        selectedText: activeSelectedText,
        focusKind: normalizeConversationFocusKind(activeFocus.kind),
        focusId: activeFocus.id,
        focusLabel: activeFocus.label,
        assignmentId: activeFocus.assignmentId,
        interactionIntent:
          action.interactionIntent ??
          getInteractionIntent(action.promptMode, activeFocus.kind, answerRevealed),
        surface: highlightedSection?.surface,
      });
      if (activeSelectedText) {
        clearSelection();
        setHighlightedText(null);
      }
    },
    [
      activeFocus.assignmentId,
      activeFocus.id,
      activeFocus.kind,
      activeFocus.label,
      activeSelectedText,
      answerRevealed,
      bridgeQuickActionId,
      canSendMessages,
      clearSelection,
      getInteractionIntent,
      highlightedSection,
      isLoading,
      normalizeConversationFocusKind,
      persistSelectionGeometry,
      sendMessage,
      setHighlightedText,
      telemetryContext,
    ]
  );

  const handleFocusSelectedFragment = useCallback((): void => {
    if (!activeSelectionPageRect) {
      return;
    }

    focusSelectionPageRect(activeSelectionPageRect, { forceScroll: true, spotlight: true });
    trackKangurClientEvent('kangur_ai_tutor_selection_refocused', {
      ...telemetryContext,
      selectionLength: activeSelectedText?.length ?? 0,
    });
  }, [activeSelectedText, activeSelectionPageRect, focusSelectionPageRect, telemetryContext]);

  const handleDetachSelectedFragment = useCallback((): void => {
    setDismissedSelectedText(activeSelectedText);
    clearSelection();
    setHighlightedText(null);
    setSelectionConversationContext(null);
    setSelectionResponseComplete(null);
    setPersistedSelectionRect(null);
    setPersistedSelectionPageRect(null);
    setPersistedSelectionPageRects([]);
    setPersistedSelectionContainerRect(null);
    trackKangurClientEvent('kangur_ai_tutor_selection_detached', {
      ...telemetryContext,
      selectionLength: activeSelectedText?.length ?? 0,
      messageCount,
    });
  }, [
    activeSelectedText,
    clearSelection,
    messageCount,
    setDismissedSelectedText,
    setHighlightedText,
    setPersistedSelectionContainerRect,
    setPersistedSelectionPageRect,
    setPersistedSelectionPageRects,
    setPersistedSelectionRect,
    setSelectionConversationContext,
    setSelectionResponseComplete,
    telemetryContext,
  ]);

  const handleFocusHighlightedSection = useCallback((): void => {
    if (!activeSectionRect) {
      return;
    }

    focusSectionRect(activeSectionRect, { forceScroll: true, spotlight: true });
    trackKangurClientEvent('kangur_ai_tutor_section_refocused', {
      ...telemetryContext,
      sectionId: highlightedSection?.anchorId ?? null,
      sectionKind: highlightedSection?.kind ?? null,
      sectionLabel: highlightedSection?.label ?? null,
    });
  }, [activeSectionRect, focusSectionRect, highlightedSection, telemetryContext]);

  const handleDetachHighlightedSection = useCallback((): void => {
    trackKangurClientEvent('kangur_ai_tutor_section_detached', {
      ...telemetryContext,
      sectionId: highlightedSection?.anchorId ?? null,
      sectionKind: highlightedSection?.kind ?? null,
      sectionLabel: highlightedSection?.label ?? null,
      messageCount,
    });
    setSectionResponsePending(null);
    setSectionResponseComplete(null);
    setHighlightedSection(null);
  }, [
    highlightedSection,
    messageCount,
    setHighlightedSection,
    setSectionResponseComplete,
    setSectionResponsePending,
    telemetryContext,
  ]);

  const handleFollowUpClick = useCallback(
    (action: KangurAiTutorFollowUpAction, messageIndex: number, href: string): void => {
      const targetLocation = resolveTutorFollowUpLocation(href);
      const currentLocation = getCurrentTutorLocation();

      if (targetLocation && currentLocation) {
        persistPendingTutorFollowUp({
          version: 1,
          href,
          pathname: targetLocation.pathname,
          search: targetLocation.search,
          actionId: action.id,
          actionLabel: action.label,
          actionReason: action.reason ?? null,
          actionPage: action.page,
          messageIndex,
          hasQuery: Boolean(action.query && Object.keys(action.query).length > 0),
          sourceSurface: telemetryContext.surface,
          sourceContentId: telemetryContext.contentId,
          sourceTitle: telemetryContext.title,
          sourcePathname: currentLocation.pathname,
          sourceSearch: currentLocation.search,
          createdAt: new Date().toISOString(),
        });
      }

      trackKangurClientEvent('kangur_ai_tutor_follow_up_clicked', {
        ...telemetryContext,
        actionId: action.id,
        actionPage: action.page,
        messageIndex,
        hasQuery: Boolean(action.query && Object.keys(action.query).length > 0),
      });
    },
    [getCurrentTutorLocation, resolveTutorFollowUpLocation, telemetryContext]
  );

  const handleWebsiteHelpTargetClick = useCallback(
    (target: KangurAiTutorWebsiteHelpTarget, messageIndex: number, href: string): void => {
      trackKangurClientEvent('kangur_ai_tutor_website_help_target_clicked', {
        ...telemetryContext,
        messageIndex,
        href,
        targetNodeId: target.nodeId,
        targetLabel: target.label,
        targetRoute: target.route ?? null,
        targetAnchorId: target.anchorId ?? null,
      });
    },
    [telemetryContext]
  );

  const handleMessageFeedback = useCallback(
    (
      messageIndex: number,
      message: TutorRenderedMessage,
      feedback: TutorMessageFeedback
    ): void => {
      const feedbackKey = getAssistantMessageFeedbackKey(tutorSessionKey, messageIndex, message);
      let shouldTrack = false;

      setMessageFeedbackByKey((current) => {
        if (current[feedbackKey]) {
          return current;
        }

        shouldTrack = true;
        return {
          ...current,
          [feedbackKey]: feedback,
        };
      });

      if (!shouldTrack) {
        return;
      }

      trackKangurClientEvent('kangur_ai_tutor_feedback_submitted', {
        ...telemetryContext,
        feedback,
        messageIndex,
        coachingMode: message.coachingFrame?.mode ?? null,
        hasFollowUpActions: Boolean(message.followUpActions?.length),
        hasSources: Boolean(message.sources?.length),
      });
    },
    [setMessageFeedbackByKey, telemetryContext, tutorSessionKey]
  );

  const handleToggleDrawing = useCallback((): void => {
    setDrawingMode((prev) => !prev);
  }, [setDrawingMode]);

  const handleDrawingComplete = useCallback(
    (dataUrl: string): void => {
      setDrawingImageData(dataUrl);
      setDrawingMode(false);
    },
    [setDrawingImageData, setDrawingMode]
  );

  const handleClearDrawing = useCallback((): void => {
    setDrawingImageData(null);
  }, [setDrawingImageData]);

  return {
    handleClearDrawing,
    handleDetachHighlightedSection,
    handleDetachSelectedFragment,
    handleDrawingComplete,
    handleFocusHighlightedSection,
    handleFocusSelectedFragment,
    handleFollowUpClick,
    handleKeyDown,
    handleMessageFeedback,
    handleQuickAction,
    handleSend,
    handleToggleDrawing,
    handleWebsiteHelpTargetClick,
  };
}
