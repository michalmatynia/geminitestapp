'use client';

import {
  useCallback,
  useEffect,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from 'react';

import { trackKangurClientEvent } from '@/features/kangur/observability/client';
import type { KangurTutorAnchorRegistration } from '@/features/kangur/ui/context/kangur-tutor-types';
import type { KangurAiTutorContextValue } from '@/features/kangur/ui/context/KangurAiTutorRuntime.shared';
import {
  resolveKangurTutorSectionKnowledgeReference,
} from '@/features/kangur/ai-tutor-section-knowledge';
import {
  formatKangurAiTutorTemplate,
  type KangurAiTutorContent,
} from '@/shared/contracts/kangur-ai-tutor-content';
import { getMotionSafeScrollBehavior } from '@/shared/utils';

import {
  getPageRect,
  isSectionGuidedTutorTarget,
} from './KangurAiTutorWidget.helpers';

import type {
  TutorConversationFocus,
  TutorMotionProfile,
} from './KangurAiTutorWidget.shared';
import type {
  GuidedTutorSectionKind,
  GuidedTutorTarget,
  PendingSelectionResponse,
  SelectionConversationContext,
  SectionExplainContext,
  TutorSurface,
} from './KangurAiTutorWidget.types';

type TelemetryContext = {
  surface: string | null;
  contentId: string | null;
  title: string | null;
};

type SectionAnchor = KangurTutorAnchorRegistration & {
  kind: GuidedTutorSectionKind;
  surface: TutorSurface;
};

const buildSectionExplainPrompt = (
  tutorContent: KangurAiTutorContent,
  anchor: SectionAnchor
): string => {
  const label = anchor.metadata?.label?.trim() ?? null;
  const promptCatalog = tutorContent.sectionExplainPrompts as Record<
    string,
    {
      defaultPrompt: string;
      labeledPrompt?: string;
    }
  >;
  const prompt = promptCatalog[anchor.kind] ?? tutorContent.sectionExplainPrompts.default;

  if (label && prompt.labeledPrompt) {
    return formatKangurAiTutorTemplate(prompt.labeledPrompt, { label });
  }

  return prompt.defaultPrompt;
};

export function useKangurAiTutorSelectionGuidanceHandoffEffect(input: {
  activeSelectedText: string | null;
  hasSelectionPanelReady: boolean;
  isLoading?: boolean;
  isOpen: boolean;
  panelMotionState: 'animating' | 'settled';
  selectionConversationSelectedText: string | null;
  selectionGuidanceHandoffText: string | null;
  setContextualTutorMode: Dispatch<SetStateAction<'selection_explain' | 'section_explain' | null>>;
  setGuidedTutorTarget: Dispatch<SetStateAction<GuidedTutorTarget | null>>;
  setSelectionGuidanceCalloutVisibleText: (value: string | null) => void;
  setSelectionGuidanceHandoffText: (value: string | null) => void;
  setSelectionResponseComplete: (value: PendingSelectionResponse | null) => void;
  setSelectionResponsePending: Dispatch<SetStateAction<PendingSelectionResponse | null>>;
  telemetryContext: TelemetryContext;
}): void {
  const {
    activeSelectedText,
    hasSelectionPanelReady,
    isLoading = false,
    isOpen,
    panelMotionState,
    selectionConversationSelectedText,
    selectionGuidanceHandoffText,
    setContextualTutorMode,
    setGuidedTutorTarget,
    setSelectionGuidanceCalloutVisibleText,
    setSelectionGuidanceHandoffText,
    setSelectionResponseComplete,
    setSelectionResponsePending,
    telemetryContext,
  } = input;

  useEffect(() => {
    if (
      !selectionGuidanceHandoffText ||
      isLoading ||
      !isOpen ||
      !hasSelectionPanelReady ||
      panelMotionState !== 'settled' ||
      selectionConversationSelectedText !== selectionGuidanceHandoffText ||
      (activeSelectedText !== null && activeSelectedText !== selectionGuidanceHandoffText)
    ) {
      return;
    }

    trackKangurClientEvent('kangur_ai_tutor_selection_guidance_completed', {
      ...telemetryContext,
      selectionLength: selectionGuidanceHandoffText.length,
    });
    setSelectionResponseComplete({
      selectedText: selectionGuidanceHandoffText,
    });
    setSelectionResponsePending((current) =>
      current?.selectedText === selectionGuidanceHandoffText ? null : current
    );
    setSelectionGuidanceCalloutVisibleText(null);
    setSelectionGuidanceHandoffText(null);
    setContextualTutorMode((current) => (current === 'selection_explain' ? null : current));
    setGuidedTutorTarget(releaseSelectionGuidedTarget(selectionGuidanceHandoffText));
  }, [
    activeSelectedText,
    hasSelectionPanelReady,
    isLoading,
    isOpen,
    panelMotionState,
    selectionConversationSelectedText,
    selectionGuidanceHandoffText,
    setContextualTutorMode,
    setGuidedTutorTarget,
    setSelectionGuidanceCalloutVisibleText,
    setSelectionGuidanceHandoffText,
    setSelectionResponseComplete,
    setSelectionResponsePending,
    telemetryContext,
  ]);
}

export function useKangurAiTutorSelectionGuidanceDockOpenEffect(input: {
  activeSelectedText: string | null;
  handleOpenChat: (
    reason: 'section_explain' | 'selection_explain',
    options?: {
      panelShellMode?: 'default' | 'minimal';
    }
  ) => void;
  hasSelectionPanelReady: boolean;
  isLoading?: boolean;
  isOpen: boolean;
  selectionConversationSelectedText: string | null;
  selectionGuidanceHandoffText: string | null;
}): void {
  const {
    activeSelectedText,
    handleOpenChat,
    hasSelectionPanelReady,
    isLoading = false,
    isOpen,
    selectionConversationSelectedText,
    selectionGuidanceHandoffText,
  } = input;

  useEffect(() => {
    if (
      !selectionGuidanceHandoffText ||
      isLoading ||
      isOpen ||
      hasSelectionPanelReady ||
      selectionConversationSelectedText !== selectionGuidanceHandoffText ||
      (activeSelectedText !== null && activeSelectedText !== selectionGuidanceHandoffText)
    ) {
      return;
    }

    handleOpenChat('selection_explain', {
      panelShellMode: 'minimal',
    });
  }, [
    activeSelectedText,
    handleOpenChat,
    hasSelectionPanelReady,
    isLoading,
    isOpen,
    selectionConversationSelectedText,
    selectionGuidanceHandoffText,
  ]);
}

const releaseSelectionGuidedTarget = (
  selectionText: string
): ((current: GuidedTutorTarget | null) => GuidedTutorTarget | null) => {
  return (current) =>
    current?.mode === 'selection' && current.selectedText === selectionText ? null : current;
};

export function useKangurAiTutorGuidedFlow(input: {
  activeSelectionPageRect: DOMRect | null;
  activateSelectionGlow: () => boolean;
  clearSelection: () => void;
  handleOpenChat: (
    reason: 'section_explain' | 'selection_explain',
    options?: {
      panelShellMode?: 'default' | 'minimal';
    }
  ) => void;
  messageCount: number;
  motionProfile: Pick<TutorMotionProfile, 'guidedAvatarTransition'>;
  prefersReducedMotion: boolean;
  resetAskModalState: () => void;
  selectionConversationFocus: TutorConversationFocus;
  selectionExplainTimeoutRef: MutableRefObject<number | null>;
  selectionGuidanceRevealTimeoutRef: MutableRefObject<number | null>;
  sendMessage: KangurAiTutorContextValue['sendMessage'];
  setCanonicalTutorModalVisible: (value: boolean) => void;
  setContextualTutorMode: (value: 'selection_explain' | 'section_explain' | null) => void;
  setDismissedSelectedText: (value: string | null) => void;
  setGuestIntroHelpVisible: (value: boolean) => void;
  setGuestIntroVisible: (value: boolean) => void;
  setGuidedTutorTarget: Dispatch<SetStateAction<GuidedTutorTarget | null>>;
  setHasNewMessage: (value: boolean) => void;
  setHighlightedSection: (value: SectionExplainContext | null) => void;
  setHighlightedText: (value: string | null) => void;
  setHoveredSectionAnchorId: (value: string | null) => void;
  setPersistedSelectionContainerRect: (value: DOMRect | null) => void;
  setPersistedSelectionPageRect: (value: DOMRect | null) => void;
  setPersistedSelectionPageRects: (value: DOMRect[]) => void;
  setPersistedSelectionRect: (value: DOMRect | null) => void;
  setSelectionGuidanceCalloutVisibleText: (value: string | null) => void;
  setSelectionConversationContext: (value: SelectionConversationContext | null) => void;
  setSelectionGuidanceHandoffText: (value: string | null) => void;
  setSectionResponseComplete: (value: SectionExplainContext | null) => void;
  setSectionResponsePending: (value: SectionExplainContext | null) => void;
  setSelectionContextSpotlightTick: Dispatch<SetStateAction<number>>;
  setSelectionResponseComplete: (value: PendingSelectionResponse | null) => void;
  setSelectionResponsePending: (value: PendingSelectionResponse | null) => void;
  setViewportTick: Dispatch<SetStateAction<number>>;
  suppressAvatarClickRef: MutableRefObject<boolean>;
  telemetryContext: TelemetryContext;
  tutorContent: KangurAiTutorContent;
  viewportHeight: number;
}) {
  const {
    activeSelectionPageRect,
    activateSelectionGlow,
    clearSelection,
    handleOpenChat,
    messageCount,
    motionProfile,
    prefersReducedMotion,
    resetAskModalState,
    selectionConversationFocus,
    selectionExplainTimeoutRef,
    selectionGuidanceRevealTimeoutRef,
    sendMessage,
    setCanonicalTutorModalVisible,
    setContextualTutorMode,
    setDismissedSelectedText,
    setGuestIntroHelpVisible,
    setGuestIntroVisible,
    setGuidedTutorTarget,
    setHasNewMessage,
    setHighlightedSection,
    setHighlightedText,
    setHoveredSectionAnchorId,
    setPersistedSelectionContainerRect,
    setPersistedSelectionPageRect,
    setPersistedSelectionPageRects,
    setPersistedSelectionRect,
    setSelectionGuidanceCalloutVisibleText,
    setSelectionConversationContext,
    setSelectionGuidanceHandoffText,
    setSectionResponseComplete,
    setSectionResponsePending,
    setSelectionContextSpotlightTick,
    setSelectionResponseComplete,
    setSelectionResponsePending,
    setViewportTick,
    suppressAvatarClickRef,
    telemetryContext,
    tutorContent,
    viewportHeight,
  } = input;

  const focusSelectionPageRect = useCallback(
    (
      selectionPageRect: DOMRect | null | undefined,
      options?: {
        forceScroll?: boolean;
        spotlight?: boolean;
      }
    ): void => {
      if (!selectionPageRect) {
        return;
      }

      const viewportTop = window.scrollY;
      const viewportBottom = viewportTop + viewportHeight;
      const topPadding = Math.min(Math.max(viewportHeight * 0.24, 72), 180);
      const bottomPadding = Math.min(Math.max(viewportHeight * 0.18, 56), 140);
      const needsScroll =
        options?.forceScroll === true ||
        selectionPageRect.top < viewportTop + topPadding ||
        selectionPageRect.bottom > viewportBottom - bottomPadding;

      if (needsScroll) {
        const targetTop = Math.max(0, selectionPageRect.top - topPadding);
        window.scrollTo({
          top: targetTop,
          behavior: getMotionSafeScrollBehavior('smooth'),
        });
      }

      if (options?.spotlight) {
        setSelectionContextSpotlightTick((current) => current + 1);
      }
    },
    [setSelectionContextSpotlightTick, viewportHeight]
  );

  const focusSectionRect = useCallback(
    (
      sectionRect: DOMRect | null | undefined,
      options?: {
        forceScroll?: boolean;
        spotlight?: boolean;
      }
    ): void => {
      if (!sectionRect) {
        return;
      }

      const sectionPageRect = getPageRect(sectionRect);
      if (!sectionPageRect) {
        return;
      }
      const viewportTop = window.scrollY;
      const viewportBottom = viewportTop + viewportHeight;
      const topPadding = Math.min(Math.max(viewportHeight * 0.22, 72), 180);
      const bottomPadding = Math.min(Math.max(viewportHeight * 0.16, 56), 132);
      const needsScroll =
        options?.forceScroll === true ||
        sectionPageRect.top < viewportTop + topPadding ||
        sectionPageRect.bottom > viewportBottom - bottomPadding;

      if (needsScroll) {
        const targetTop = Math.max(0, sectionPageRect.top - topPadding);
        window.scrollTo({
          top: targetTop,
          behavior: getMotionSafeScrollBehavior('smooth'),
        });
      }

      if (options?.spotlight) {
        setViewportTick((current) => current + 1);
      }
    },
    [setViewportTick, viewportHeight]
  );

  const startGuidedSectionExplanation = useCallback(
    (anchor: SectionAnchor): void => {
      if (selectionExplainTimeoutRef.current !== null) {
        window.clearTimeout(selectionExplainTimeoutRef.current);
        selectionExplainTimeoutRef.current = null;
      }
      if (selectionGuidanceRevealTimeoutRef.current !== null) {
        window.clearTimeout(selectionGuidanceRevealTimeoutRef.current);
        selectionGuidanceRevealTimeoutRef.current = null;
      }

      setSelectionGuidanceCalloutVisibleText(null);
      setSelectionGuidanceHandoffText(null);
      setCanonicalTutorModalVisible(false);
      setContextualTutorMode('section_explain');
      setGuestIntroVisible(false);
      setGuestIntroHelpVisible(false);
      resetAskModalState();

      const anchorRect = anchor.getRect();
      const sectionLabel = anchor.metadata?.label ?? null;
      const knowledgeReference = resolveKangurTutorSectionKnowledgeReference({
        anchorId: anchor.id,
        contentId: anchor.metadata?.contentId ?? null,
        focusKind: anchor.kind,
      });
      const nextSection: SectionExplainContext = {
        anchorId: anchor.id,
        assignmentId: anchor.metadata?.assignmentId ?? null,
        contentId: anchor.metadata?.contentId ?? null,
        kind: anchor.kind,
        knowledgeReference,
        label: sectionLabel,
        surface: anchor.surface,
      };

      clearSelection();
      setHighlightedText(null);
      setPersistedSelectionRect(null);
      setPersistedSelectionPageRect(null);
      setPersistedSelectionPageRects([]);
      setPersistedSelectionContainerRect(null);
      setDismissedSelectedText(null);
      setSelectionConversationContext(null);
      setSelectionResponsePending(null);
      setSelectionResponseComplete(null);
      setSectionResponsePending(nextSection);
      setSectionResponseComplete(null);
      setHighlightedSection(nextSection);
      setHoveredSectionAnchorId(null);
      setHasNewMessage(false);
      focusSectionRect(anchorRect, { spotlight: true });
      trackKangurClientEvent('kangur_ai_tutor_section_guidance_started', {
        ...telemetryContext,
        sectionId: anchor.id,
        sectionKind: anchor.kind,
        sectionLabel,
      });
      setGuidedTutorTarget({
        mode: 'section',
        anchorId: anchor.id,
        kind: anchor.kind,
        label: sectionLabel,
        surface: anchor.surface,
      });
      suppressAvatarClickRef.current = false;

      const guidanceDelayMs = prefersReducedMotion
        ? 0
        : Math.max(220, Math.round(motionProfile.guidedAvatarTransition.duration * 1000));
      selectionExplainTimeoutRef.current = window.setTimeout(() => {
        selectionExplainTimeoutRef.current = null;
        setGuidedTutorTarget((current) => (isSectionGuidedTutorTarget(current) ? null : current));
        handleOpenChat('section_explain', {
          panelShellMode: 'minimal',
        });
        void sendMessage(buildSectionExplainPrompt(tutorContent, anchor), {
          promptMode: 'explain',
          focusKind: anchor.kind,
          focusId: anchor.id,
          focusLabel: sectionLabel ?? anchor.id,
          assignmentId: anchor.metadata?.assignmentId ?? null,
          knowledgeReference,
          interactionIntent: 'explain',
          surface: anchor.surface,
        });
      }, guidanceDelayMs);
    },
    [
      clearSelection,
      focusSectionRect,
      handleOpenChat,
      messageCount,
      motionProfile.guidedAvatarTransition.duration,
      prefersReducedMotion,
      resetAskModalState,
      selectionExplainTimeoutRef,
      selectionGuidanceRevealTimeoutRef,
      sendMessage,
      setCanonicalTutorModalVisible,
      setContextualTutorMode,
      setDismissedSelectedText,
      setGuestIntroHelpVisible,
      setGuestIntroVisible,
      setGuidedTutorTarget,
      setHasNewMessage,
      setHighlightedSection,
      setHighlightedText,
      setHoveredSectionAnchorId,
      setPersistedSelectionContainerRect,
      setPersistedSelectionPageRect,
      setPersistedSelectionPageRects,
      setPersistedSelectionRect,
      setSelectionGuidanceCalloutVisibleText,
      setSelectionConversationContext,
      setSelectionGuidanceHandoffText,
      setSectionResponseComplete,
      setSectionResponsePending,
      setSelectionResponseComplete,
      setSelectionResponsePending,
      suppressAvatarClickRef,
      telemetryContext,
      tutorContent,
    ]
  );

  const startGuidedSelectionExplanation = useCallback(
    (selectionText: string): void => {
      if (selectionExplainTimeoutRef.current !== null) {
        window.clearTimeout(selectionExplainTimeoutRef.current);
        selectionExplainTimeoutRef.current = null;
      }
      if (selectionGuidanceRevealTimeoutRef.current !== null) {
        window.clearTimeout(selectionGuidanceRevealTimeoutRef.current);
        selectionGuidanceRevealTimeoutRef.current = null;
      }

      setSelectionGuidanceCalloutVisibleText(null);
      setSelectionGuidanceHandoffText(null);
      setCanonicalTutorModalVisible(false);
      setContextualTutorMode('selection_explain');
      setGuestIntroVisible(false);
      setGuestIntroHelpVisible(false);
      resetAskModalState();
      activateSelectionGlow();
      clearSelection();

      trackKangurClientEvent('kangur_ai_tutor_selection_guidance_started', {
        ...telemetryContext,
        selectionLength: selectionText.length,
      });
      focusSelectionPageRect(activeSelectionPageRect);
      setHasNewMessage(false);
      setSelectionConversationContext({
        messageStartIndex: messageCount,
        selectedText: selectionText,
      });
      setSelectionResponseComplete(null);
      setSelectionResponsePending({
        selectedText: selectionText,
      });
      setGuidedTutorTarget({
        mode: 'selection',
        kind: 'selection_excerpt',
        selectedText: selectionText,
      });
      suppressAvatarClickRef.current = true;

      void sendMessage('Wyjaśnij zaznaczony fragment krok po kroku.', {
        promptMode: 'selected_text',
        selectedText: selectionText,
        focusKind: selectionConversationFocus.kind ?? 'selection',
        focusId: selectionConversationFocus.id ?? 'selection',
        focusLabel: selectionConversationFocus.label ?? selectionText,
        assignmentId: selectionConversationFocus.assignmentId,
        interactionIntent: 'explain',
      });

      const guidanceDelayMs = prefersReducedMotion
        ? 0
        : Math.max(180, Math.round(motionProfile.guidedAvatarTransition.duration * 1000));
      selectionGuidanceRevealTimeoutRef.current = window.setTimeout(() => {
        selectionGuidanceRevealTimeoutRef.current = null;
        setSelectionGuidanceCalloutVisibleText(selectionText);
      }, guidanceDelayMs);
      selectionExplainTimeoutRef.current = window.setTimeout(() => {
        selectionExplainTimeoutRef.current = null;
        setSelectionGuidanceHandoffText(selectionText);
      }, guidanceDelayMs);
    },
    [
      activeSelectionPageRect,
      activateSelectionGlow,
      focusSelectionPageRect,
      messageCount,
      motionProfile.guidedAvatarTransition.duration,
      prefersReducedMotion,
      resetAskModalState,
      selectionConversationFocus,
      selectionExplainTimeoutRef,
      selectionGuidanceRevealTimeoutRef,
      sendMessage,
      setCanonicalTutorModalVisible,
      setContextualTutorMode,
      setGuestIntroHelpVisible,
      setGuestIntroVisible,
      setSelectionConversationContext,
      setSelectionGuidanceCalloutVisibleText,
      setSelectionGuidanceHandoffText,
      setGuidedTutorTarget,
      setHasNewMessage,
      setSelectionResponseComplete,
      setSelectionResponsePending,
      suppressAvatarClickRef,
      telemetryContext,
    ]
  );

  return {
    focusSectionRect,
    focusSelectionPageRect,
    startGuidedSectionExplanation,
    startGuidedSelectionExplanation,
  };
}
