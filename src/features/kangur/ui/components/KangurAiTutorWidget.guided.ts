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
  formatKangurAiTutorTemplate,
  type KangurAiTutorContent,
} from '@/shared/contracts/kangur-ai-tutor-content';
import { getMotionSafeScrollBehavior } from '@/shared/utils';

import {
  getPageRect,
  isSectionGuidedTutorTarget,
} from './KangurAiTutorWidget.helpers';

import type { TutorMotionProfile } from './KangurAiTutorWidget.shared';
import type {
  GuidedTutorSectionKind,
  GuidedTutorTarget,
  PendingSelectionResponse,
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
  const prompt =
    tutorContent.sectionExplainPrompts[anchor.kind] ?? tutorContent.sectionExplainPrompts.default;

  if (label && prompt.labeledPrompt) {
    return formatKangurAiTutorTemplate(prompt.labeledPrompt, { label });
  }

  return prompt.defaultPrompt;
};

export function useKangurAiTutorSelectionGuidanceHandoffEffect(input: {
  activeFocusKind: string | null;
  activeSelectedText: string | null;
  isLoading?: boolean;
  isOpen: boolean;
  panelMotionState: 'animating' | 'settled';
  selectionGuidanceHandoffText: string | null;
  setGuidedTutorTarget: Dispatch<SetStateAction<GuidedTutorTarget | null>>;
}): void {
  const {
    activeFocusKind,
    activeSelectedText,
    isLoading = false,
    isOpen,
    panelMotionState,
    selectionGuidanceHandoffText,
    setGuidedTutorTarget,
  } = input;

  useEffect(() => {
    if (
      !selectionGuidanceHandoffText ||
      isLoading ||
      !isOpen ||
      activeFocusKind !== 'selection' ||
      panelMotionState !== 'settled' ||
      (activeSelectedText !== null && activeSelectedText !== selectionGuidanceHandoffText)
    ) {
      return;
    }

    setGuidedTutorTarget((current) =>
      current?.mode === 'selection' && current.selectedText === selectionGuidanceHandoffText
        ? null
        : current
    );
  }, [
    activeFocusKind,
    activeSelectedText,
    isLoading,
    isOpen,
    panelMotionState,
    selectionGuidanceHandoffText,
    setGuidedTutorTarget,
  ]);
}

export function useKangurAiTutorGuidedFlow(input: {
  activeSelectionPageRect: DOMRect | null;
  clearSelection: () => void;
  handleOpenChat: (
    reason: 'section_explain' | 'selection_explain',
    options?: {
      panelShellMode?: 'default' | 'minimal';
    }
  ) => void;
  motionProfile: Pick<TutorMotionProfile, 'guidedAvatarTransition'>;
  prefersReducedMotion: boolean;
  resetAskModalState: () => void;
  selectionExplainTimeoutRef: MutableRefObject<number | null>;
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
  setPersistedSelectionRect: (value: DOMRect | null) => void;
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
    clearSelection,
    handleOpenChat,
    motionProfile,
    prefersReducedMotion,
    resetAskModalState,
    selectionExplainTimeoutRef,
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
    setPersistedSelectionRect,
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

      setSelectionGuidanceHandoffText(null);
      setCanonicalTutorModalVisible(false);
      setContextualTutorMode('section_explain');
      setGuestIntroVisible(false);
      setGuestIntroHelpVisible(false);
      resetAskModalState();

      const anchorRect = anchor.getRect();
      const sectionLabel = anchor.metadata?.label ?? null;
      const nextSection: SectionExplainContext = {
        anchorId: anchor.id,
        assignmentId: anchor.metadata?.assignmentId ?? null,
        contentId: anchor.metadata?.contentId ?? null,
        kind: anchor.kind,
        label: sectionLabel,
        surface: anchor.surface,
      };

      clearSelection();
      setHighlightedText(null);
      setPersistedSelectionRect(null);
      setPersistedSelectionPageRect(null);
      setPersistedSelectionContainerRect(null);
      setDismissedSelectedText(null);
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
          interactionIntent: 'explain',
        });
      }, guidanceDelayMs);
    },
    [
      clearSelection,
      focusSectionRect,
      handleOpenChat,
      motionProfile.guidedAvatarTransition.duration,
      prefersReducedMotion,
      resetAskModalState,
      selectionExplainTimeoutRef,
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
      setPersistedSelectionRect,
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

      setSelectionGuidanceHandoffText(null);
      setCanonicalTutorModalVisible(false);
      setContextualTutorMode('selection_explain');
      setGuestIntroVisible(false);
      setGuestIntroHelpVisible(false);
      resetAskModalState();

      trackKangurClientEvent('kangur_ai_tutor_selection_guidance_started', {
        ...telemetryContext,
        selectionLength: selectionText.length,
      });
      focusSelectionPageRect(activeSelectionPageRect);
      setHasNewMessage(false);
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

      const guidanceDelayMs = prefersReducedMotion
        ? 0
        : Math.max(180, Math.round(motionProfile.guidedAvatarTransition.duration * 1000 * 0.9));
      selectionExplainTimeoutRef.current = window.setTimeout(() => {
        selectionExplainTimeoutRef.current = null;
        setSelectionGuidanceHandoffText(selectionText);
        handleOpenChat('selection_explain', {
          panelShellMode: 'minimal',
        });
        void sendMessage('Wyjaśnij zaznaczony fragment krok po kroku.', {
          promptMode: 'selected_text',
          selectedText: selectionText,
          focusKind: 'selection',
          focusId: 'selection',
          focusLabel: selectionText,
          assignmentId: null,
          interactionIntent: 'explain',
        });
      }, guidanceDelayMs);
    },
    [
      activeSelectionPageRect,
      focusSelectionPageRect,
      handleOpenChat,
      motionProfile.guidedAvatarTransition.duration,
      prefersReducedMotion,
      resetAskModalState,
      selectionExplainTimeoutRef,
      sendMessage,
      setCanonicalTutorModalVisible,
      setContextualTutorMode,
      setGuestIntroHelpVisible,
      setGuestIntroVisible,
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
