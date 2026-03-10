'use client';

import { useEffect, useLayoutEffect } from 'react';

import { trackKangurClientEvent } from '@/features/kangur/observability/client';
import type { KangurAiTutorConversationContext } from '@/shared/contracts/kangur-ai-tutor';
import type { KangurAiTutorContent } from '@/shared/contracts/kangur-ai-tutor-content';
import { getMotionSafeScrollBehavior } from '@/shared/utils';

import { AVATAR_SIZE, EDGE_GAP } from './KangurAiTutorWidget.shared';
import {
  clearPersistedTutorAvatarPosition,
  clearPersistedPendingTutorFollowUp,
  clearPersistedTutorSessionKey,
  loadPersistedPendingTutorFollowUp,
  persistTutorAvatarPosition,
  persistTutorSessionKey,
  subscribeToTutorVisibilityChanges,
} from './KangurAiTutorWidget.storage';

import type { KangurAiTutorWidgetState } from './KangurAiTutorWidget.state';
import type { TutorPoint, TutorSurface } from './KangurAiTutorWidget.types';

const FOLLOW_UP_COMPLETION_MAX_AGE_MS = 30 * 60 * 1000;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const clampAvatarPoint = (
  point: TutorPoint,
  viewport: {
    width: number;
    height: number;
  }
): TutorPoint => ({
  x: clamp(point.x, EDGE_GAP, viewport.width - EDGE_GAP - AVATAR_SIZE),
  y: clamp(point.y, EDGE_GAP, viewport.height - EDGE_GAP - AVATAR_SIZE),
});

type ContextSwitchNotice = {
  detail: string | null;
  target: string;
  title: string;
} | null;

type RecordFollowUpCompletionInput = {
  actionId: string;
  actionLabel: string;
  actionPage: string;
  actionReason: string | null;
  targetPath: string;
  targetSearch: string;
};

type CurrentTutorLocation = {
  pathname: string;
  search: string;
} | null;

type UseKangurAiTutorLifecycleEffectsInput = {
  allowCrossPagePersistence: boolean;
  allowSelectedTextSupport: boolean;
  authIsAuthenticated: boolean | undefined;
  clearSelection: () => void;
  closeChat: () => void;
  getContextSwitchNotice: (input: {
    assignmentId: string | null | undefined;
    assignmentSummary?: string | null | undefined;
    contentId: string | null | undefined;
    questionId: string | null | undefined;
    questionProgressLabel?: string | null | undefined;
    surface: TutorSurface | null | undefined;
    title?: string | null | undefined;
    tutorContent: KangurAiTutorContent;
  }) => ContextSwitchNotice;
  getCurrentLocation: () => CurrentTutorLocation;
  isOpen: boolean;
  messages: Array<{
    role: string;
  }>;
  rawSelectedText: string | null;
  recordFollowUpCompletion?: ((input: RecordFollowUpCompletionInput) => void) | null;
  routingPageKey?: string | null;
  selectedText: string | null;
  sessionContext: KangurAiTutorConversationContext | null | undefined;
  setHighlightedText: (value: string | null) => void;
  tutorContent: KangurAiTutorContent;
  tutorSessionKey: string | null;
  viewport: {
    width: number;
    height: number;
  };
  widgetState: KangurAiTutorWidgetState;
};

export function useKangurAiTutorLifecycleEffects({
  allowCrossPagePersistence,
  allowSelectedTextSupport,
  authIsAuthenticated,
  clearSelection,
  closeChat,
  getContextSwitchNotice,
  getCurrentLocation,
  isOpen,
  messages,
  rawSelectedText,
  recordFollowUpCompletion,
  routingPageKey,
  selectedText,
  sessionContext,
  setHighlightedText,
  tutorContent,
  tutorSessionKey,
  viewport,
  widgetState,
}: UseKangurAiTutorLifecycleEffectsInput): void {
  const {
    askModalDockStyle,
    askModalReturnStateRef,
    askModalVisible,
    contextSwitchNotice,
    dismissedSelectedText,
    draggedAvatarPoint,
    inputRef,
    isTutorHidden,
    messagesEndRef,
    mounted,
    panelRef,
    previousSessionKeyRef,
    selectionExplainTimeoutRef,
    setAskModalDockStyle,
    setAskModalVisible,
    setContextSwitchNotice,
    setDismissedSelectedText,
    setDraggedAvatarPoint,
    setGuestIntroHelpVisible,
    setGuestIntroVisible,
    setGuidedTutorTarget,
    setHasNewMessage,
    setHighlightedSection,
    setHomeOnboardingStepIndex,
    setHoveredSectionAnchorId,
    setInputValue,
    setIsTutorHidden,
    setMounted,
    setPanelAnchorMode,
    setPanelMeasuredHeight,
    setPersistedSelectionContainerRect,
    setPersistedSelectionPageRect,
    setPersistedSelectionRect,
    setSectionResponseComplete,
    setSectionResponsePending,
    setSelectionConversationContext,
    setSelectionGuidanceHandoffText,
    setSelectionResponseComplete,
    setSelectionResponsePending,
    setViewportTick,
  } = widgetState;

  useEffect(() => {
    setMounted(true);
  }, [setMounted]);

  useEffect(() => {
    if (authIsAuthenticated) {
      setGuidedTutorTarget(null);
      setGuestIntroVisible(false);
      setGuestIntroHelpVisible(false);
      return;
    }

    setHomeOnboardingStepIndex(null);
  }, [
    authIsAuthenticated,
    setGuestIntroHelpVisible,
    setGuestIntroVisible,
    setGuidedTutorTarget,
    setHomeOnboardingStepIndex,
  ]);

  useEffect(() => subscribeToTutorVisibilityChanges(setIsTutorHidden), [setIsTutorHidden]);

  useEffect(() => {
    if (!draggedAvatarPoint) {
      return;
    }

    const clampedPoint = clampAvatarPoint(draggedAvatarPoint, viewport);
    if (clampedPoint.x === draggedAvatarPoint.x && clampedPoint.y === draggedAvatarPoint.y) {
      return;
    }

    setDraggedAvatarPoint(clampedPoint);
    persistTutorAvatarPosition({
      left: clampedPoint.x,
      top: clampedPoint.y,
    });
  }, [draggedAvatarPoint, setDraggedAvatarPoint, viewport]);

  useEffect(() => {
    if (!isTutorHidden) {
      return;
    }

    setAskModalVisible(false);
    askModalReturnStateRef.current = null;
    setGuidedTutorTarget(null);
    setGuestIntroVisible(false);
    setGuestIntroHelpVisible(false);
    setHomeOnboardingStepIndex(null);
    setHasNewMessage(false);
    setDismissedSelectedText(null);
    setDraggedAvatarPoint(null);
    clearPersistedTutorAvatarPosition();
    setAskModalDockStyle(null);
    clearSelection();
    setHighlightedText(null);
    setHighlightedSection(null);
    setHoveredSectionAnchorId(null);
    setPersistedSelectionRect(null);
    setPersistedSelectionPageRect(null);
    setPersistedSelectionContainerRect(null);
    setSelectionResponsePending(null);
    setSelectionResponseComplete(null);
    setSelectionConversationContext(null);
    setSelectionGuidanceHandoffText(null);
    setSectionResponsePending(null);
    setSectionResponseComplete(null);
    closeChat();
  }, [
    askModalReturnStateRef,
    clearSelection,
    closeChat,
    isTutorHidden,
    setAskModalVisible,
    setDismissedSelectedText,
    setDraggedAvatarPoint,
    setGuestIntroHelpVisible,
    setGuestIntroVisible,
    setGuidedTutorTarget,
    setHasNewMessage,
    setHighlightedSection,
    setHighlightedText,
    setHomeOnboardingStepIndex,
    setHoveredSectionAnchorId,
    setPersistedSelectionContainerRect,
    setPersistedSelectionPageRect,
    setPersistedSelectionRect,
    setSectionResponseComplete,
    setSectionResponsePending,
    setSelectionConversationContext,
    setSelectionGuidanceHandoffText,
    setSelectionResponseComplete,
    setSelectionResponsePending,
  ]);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    let rafId = 0;
    const handleViewportChange = (): void => {
      cancelAnimationFrame(rafId);
      rafId = window.requestAnimationFrame(() => {
        setViewportTick((current) => current + 1);
      });
    };

    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [mounted, setViewportTick]);

  useLayoutEffect(() => {
    if (!isOpen) {
      setPanelMeasuredHeight(null);
      return;
    }

    const panel = panelRef.current;
    if (!panel) {
      return;
    }

    const updateMeasuredHeight = (): void => {
      const nextHeight = Math.ceil(panel.getBoundingClientRect().height);
      if (nextHeight <= 0) {
        return;
      }

      setPanelMeasuredHeight((current) => (current === nextHeight ? current : nextHeight));
    };

    updateMeasuredHeight();

    if (typeof ResizeObserver !== 'function') {
      return;
    }

    const observer = new ResizeObserver(() => {
      updateMeasuredHeight();
    });
    observer.observe(panel);

    return () => {
      observer.disconnect();
    };
  }, [isOpen, panelRef, setPanelMeasuredHeight]);

  useLayoutEffect(() => {
    if (!askModalVisible || !isOpen || isTutorHidden || typeof document === 'undefined') {
      setAskModalDockStyle(null);
      return;
    }

    let frameId = 0;
    const updateAskModalDockStyle = (): void => {
      const askModalHeader = document.querySelector<HTMLElement>(
        '[data-testid=\'kangur-ai-tutor-header\']'
      );
      const askModalSurface = document.querySelector<HTMLElement>(
        '[data-testid=\'kangur-ai-tutor-ask-modal-surface\']'
      );
      const anchorRect =
        askModalHeader?.getBoundingClientRect() ?? askModalSurface?.getBoundingClientRect();
      if (!anchorRect || anchorRect.width <= 0 || anchorRect.height <= 0) {
        setAskModalDockStyle(null);
        return;
      }

      const nextStyle = {
        left: anchorRect.left + anchorRect.width / 2 - AVATAR_SIZE / 2,
        top: Math.max(EDGE_GAP + 8, anchorRect.top - AVATAR_SIZE * 0.42),
      };

      setAskModalDockStyle((current) =>
        current?.left === nextStyle.left && current?.top === nextStyle.top ? current : nextStyle
      );
    };

    const scheduleUpdate = (): void => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(updateAskModalDockStyle);
    };

    scheduleUpdate();
    window.addEventListener('resize', scheduleUpdate);
    window.addEventListener('scroll', scheduleUpdate, true);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', scheduleUpdate);
      window.removeEventListener('scroll', scheduleUpdate, true);
    };
  }, [
    askModalVisible,
    isOpen,
    isTutorHidden,
    setAskModalDockStyle,
    askModalDockStyle,
  ]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setHasNewMessage(false);
    const timeoutId = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 100);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [inputRef, isOpen, setHasNewMessage]);

  useEffect(() => {
    if (!isOpen && askModalVisible) {
      setAskModalVisible(false);
    }
  }, [askModalVisible, isOpen, setAskModalVisible]);

  useEffect(
    () => () => {
      if (selectionExplainTimeoutRef.current !== null) {
        window.clearTimeout(selectionExplainTimeoutRef.current);
        selectionExplainTimeoutRef.current = null;
      }
    },
    [selectionExplainTimeoutRef]
  );

  useEffect(() => {
    if (!askModalVisible || !isOpen) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 80);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [askModalVisible, inputRef, isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: getMotionSafeScrollBehavior('smooth'),
    });
    if (!isOpen && messages.length > 0 && messages[messages.length - 1]?.role === 'assistant') {
      setHasNewMessage(true);
    }
  }, [isOpen, messages, messagesEndRef, setHasNewMessage]);

  useEffect(() => {
    if (!allowSelectedTextSupport) {
      setSelectionConversationContext(null);
      setHighlightedText(null);
      return;
    }

    if (selectedText) {
      setHighlightedText(selectedText);
      return;
    }

    if (!isOpen) {
      setSelectionConversationContext(null);
      setHighlightedText(null);
    }
  }, [
    allowSelectedTextSupport,
    isOpen,
    selectedText,
    setHighlightedText,
    setSelectionConversationContext,
  ]);

  useEffect(() => {
    if (!dismissedSelectedText) {
      return;
    }

    if (selectedText?.trim()) {
      setDismissedSelectedText(null);
      return;
    }

    if (!rawSelectedText || rawSelectedText !== dismissedSelectedText) {
      setDismissedSelectedText(null);
    }
  }, [dismissedSelectedText, rawSelectedText, selectedText, setDismissedSelectedText]);

  useEffect(() => {
    if (!isOpen) {
      setPanelAnchorMode('dock');
      setDismissedSelectedText(null);
      setSelectionConversationContext(null);
      setSelectionGuidanceHandoffText(null);
      setPersistedSelectionRect(null);
      setPersistedSelectionPageRect(null);
      setPersistedSelectionContainerRect(null);
      setContextSwitchNotice(null);
    }
  }, [
    isOpen,
    setContextSwitchNotice,
    setDismissedSelectedText,
    setPanelAnchorMode,
    setPersistedSelectionContainerRect,
    setPersistedSelectionPageRect,
    setPersistedSelectionRect,
    setSelectionConversationContext,
    setSelectionGuidanceHandoffText,
  ]);

  useEffect(() => {
    if (!tutorSessionKey) {
      return;
    }

    const previousSessionKey = allowCrossPagePersistence ? previousSessionKeyRef.current : null;
    if (previousSessionKey && previousSessionKey !== tutorSessionKey) {
      setInputValue('');
      setSelectionConversationContext(null);
      setSelectionGuidanceHandoffText(null);
      setPersistedSelectionRect(null);
      setPersistedSelectionPageRect(null);
      setPersistedSelectionContainerRect(null);
      setContextSwitchNotice(
        isOpen
          ? getContextSwitchNotice({
            tutorContent,
            surface: sessionContext?.surface,
            title: sessionContext?.title ?? null,
            contentId: sessionContext?.contentId ?? null,
            questionProgressLabel: sessionContext?.questionProgressLabel ?? null,
            questionId: sessionContext?.questionId ?? null,
            assignmentSummary: sessionContext?.assignmentSummary ?? null,
            assignmentId: sessionContext?.assignmentId ?? null,
          })
          : null
      );
    }

    previousSessionKeyRef.current = tutorSessionKey;
    if (allowCrossPagePersistence) {
      persistTutorSessionKey(tutorSessionKey);
    } else {
      clearPersistedTutorSessionKey();
    }
  }, [
    allowCrossPagePersistence,
    getContextSwitchNotice,
    isOpen,
    previousSessionKeyRef,
    sessionContext?.assignmentId,
    sessionContext?.assignmentSummary,
    sessionContext?.contentId,
    sessionContext?.questionId,
    sessionContext?.questionProgressLabel,
    sessionContext?.surface,
    sessionContext?.title,
    setContextSwitchNotice,
    setInputValue,
    setPersistedSelectionContainerRect,
    setPersistedSelectionPageRect,
    setPersistedSelectionRect,
    setSelectionConversationContext,
    setSelectionGuidanceHandoffText,
    tutorContent,
    tutorSessionKey,
  ]);

  useEffect(() => {
    if (allowCrossPagePersistence) {
      return;
    }

    clearPersistedTutorSessionKey();
    previousSessionKeyRef.current = tutorSessionKey;
  }, [allowCrossPagePersistence, previousSessionKeyRef, tutorSessionKey]);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    const pendingFollowUp = loadPersistedPendingTutorFollowUp();
    if (!pendingFollowUp) {
      return;
    }

    const createdAtMs = Date.parse(pendingFollowUp.createdAt);
    if (Number.isNaN(createdAtMs) || Date.now() - createdAtMs > FOLLOW_UP_COMPLETION_MAX_AGE_MS) {
      clearPersistedPendingTutorFollowUp();
      return;
    }

    const currentLocation = getCurrentLocation();
    if (
      currentLocation?.pathname !== pendingFollowUp.pathname ||
      currentLocation?.search !== pendingFollowUp.search
    ) {
      return;
    }

    if (
      pendingFollowUp.sourcePathname === pendingFollowUp.pathname &&
      pendingFollowUp.sourceSearch === pendingFollowUp.search
    ) {
      clearPersistedPendingTutorFollowUp();
      return;
    }

    trackKangurClientEvent('kangur_ai_tutor_follow_up_completed', {
      surface: pendingFollowUp.sourceSurface,
      contentId: pendingFollowUp.sourceContentId,
      title: pendingFollowUp.sourceTitle,
      actionId: pendingFollowUp.actionId,
      actionPage: pendingFollowUp.actionPage,
      messageIndex: pendingFollowUp.messageIndex,
      hasQuery: pendingFollowUp.hasQuery,
      targetPath: pendingFollowUp.pathname,
      targetSearch: pendingFollowUp.search || null,
      pageKey: routingPageKey ?? null,
      currentSurface: sessionContext?.surface ?? null,
      currentContentId: sessionContext?.contentId ?? null,
    });
    recordFollowUpCompletion?.({
      actionId: pendingFollowUp.actionId,
      actionLabel: pendingFollowUp.actionLabel,
      actionReason: pendingFollowUp.actionReason,
      actionPage: pendingFollowUp.actionPage,
      targetPath: pendingFollowUp.pathname,
      targetSearch: pendingFollowUp.search,
    });
    clearPersistedPendingTutorFollowUp();
  }, [
    getCurrentLocation,
    mounted,
    recordFollowUpCompletion,
    routingPageKey,
    sessionContext?.contentId,
    sessionContext?.surface,
  ]);

  useEffect(() => {
    if (!contextSwitchNotice || !isOpen) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setContextSwitchNotice(null);
    }, 4_000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [contextSwitchNotice, isOpen, setContextSwitchNotice]);
}
