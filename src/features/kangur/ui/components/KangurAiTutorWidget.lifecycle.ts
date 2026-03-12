'use client';

import { useEffect, useLayoutEffect } from 'react';

import { trackKangurClientEvent } from '@/features/kangur/observability/client';
import type { KangurAiTutorConversationContext } from '@/shared/contracts/kangur-ai-tutor';
import type { KangurAiTutorContent } from '@/shared/contracts/kangur-ai-tutor-content';
import { getMotionSafeScrollBehavior } from '@/shared/utils';

import {
  AVATAR_SIZE,
  EDGE_GAP,
  applyTutorPanelSnapState,
  clampTutorPanelPoint,
} from './KangurAiTutorWidget.shared';
import { scrollToAndSpotlightAnchor } from './KangurAiTutorWidget.navigation-spotlight';
import {
  clearPersistedPendingNavigationTarget,
  clearPersistedTutorAvatarPosition,
  clearPersistedTutorPanelPosition,
  clearPersistedPendingTutorFollowUp,
  clearPersistedTutorSessionKey,
  loadPersistedPendingNavigationTarget,
  loadPersistedPendingTutorFollowUp,
  persistTutorAvatarPosition,
  persistTutorPanelPosition,
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
  hasContextualFreeformFocus: boolean;
  contextualFreeformPanelPoint: TutorPoint | null;
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
  uiMode: 'anchored' | 'freeform' | 'static';
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
  hasContextualFreeformFocus,
  contextualFreeformPanelPoint,
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
  uiMode,
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
    panelPosition,
    panelPositionMode,
    panelSnapPreference,
    previousSessionKeyRef,
    selectionExplainTimeoutRef,
    selectionGuidanceRevealTimeoutRef,
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
    setPanelPosition,
    setPanelPositionMode,
    setPanelSnapPreference,
    setPersistedSelectionContainerRect,
    setPersistedSelectionPageRect,
    setPersistedSelectionPageRects,
    setPersistedSelectionRect,
    setSectionResponseComplete,
    setSectionResponsePending,
    setSelectionGuidanceCalloutVisibleText,
    setSelectionConversationContext,
    setSelectionGuidanceHandoffText,
    setSelectionResponseComplete,
    setSelectionResponsePending,
    suppressAvatarClickRef,
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
    if (
      contextualFreeformPanelPoint !== null ||
      !isOpen ||
      askModalVisible ||
      uiMode !== 'freeform' ||
      panelPositionMode !== 'contextual' ||
      hasContextualFreeformFocus
    ) {
      return;
    }

    setPanelPositionMode('manual');
    if (!panelPosition) {
      clearPersistedTutorPanelPosition();
      return;
    }

    persistTutorPanelPosition({
      left: panelPosition.x,
      mode: 'manual',
      snap: panelSnapPreference,
      top: panelPosition.y,
    });
  }, [
    askModalVisible,
    contextualFreeformPanelPoint,
    hasContextualFreeformFocus,
    isOpen,
    panelPosition,
    panelPositionMode,
    panelSnapPreference,
    setPanelPositionMode,
    uiMode,
  ]);

  useEffect(() => {
    if (
      !contextualFreeformPanelPoint ||
      !isOpen ||
      askModalVisible ||
      uiMode !== 'freeform' ||
      panelPositionMode !== 'contextual'
    ) {
      return;
    }

    const panelRect = panelRef.current?.getBoundingClientRect();
    if (!panelRect || panelRect.width <= 0 || panelRect.height <= 0) {
      return;
    }

    const nextPoint = clampTutorPanelPoint(contextualFreeformPanelPoint, viewport, {
      width: panelRect.width,
      height: panelRect.height,
    });
    const shouldPersist =
      panelPosition?.x !== nextPoint.x ||
      panelPosition?.y !== nextPoint.y ||
      panelSnapPreference !== 'free';
    if (!shouldPersist) {
      return;
    }

    setPanelPosition(nextPoint);
    setPanelSnapPreference('free');
    persistTutorPanelPosition({
      left: nextPoint.x,
      mode: 'contextual',
      snap: 'free',
      top: nextPoint.y,
    });
  }, [
    askModalVisible,
    contextualFreeformPanelPoint,
    isOpen,
    panelPosition,
    panelPositionMode,
    panelRef,
    panelSnapPreference,
    setPanelPosition,
    setPanelSnapPreference,
    uiMode,
    viewport,
  ]);

  useEffect(() => {
    if (!panelPosition || !isOpen || askModalVisible || uiMode !== 'freeform') {
      return;
    }

    const panelRect = panelRef.current?.getBoundingClientRect();
    if (!panelRect || panelRect.width <= 0 || panelRect.height <= 0) {
      return;
    }

    const nextPoint =
      panelSnapPreference === 'free'
        ? clampTutorPanelPoint(panelPosition, viewport, {
            width: panelRect.width,
            height: panelRect.height,
          })
        : applyTutorPanelSnapState(panelPosition, panelSnapPreference, viewport, {
            width: panelRect.width,
            height: panelRect.height,
          });
    if (nextPoint.x === panelPosition.x && nextPoint.y === panelPosition.y) {
      return;
    }

    setPanelPosition(nextPoint);
    persistTutorPanelPosition({
      left: nextPoint.x,
      mode: panelPositionMode,
      snap: panelSnapPreference,
      top: nextPoint.y,
    });
  }, [
    askModalVisible,
    isOpen,
    panelPosition,
    panelPositionMode,
    panelRef,
    panelSnapPreference,
    setPanelPosition,
    uiMode,
    viewport,
  ]);

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
    setPanelPosition(null);
    setPanelPositionMode('manual');
    setPanelSnapPreference('free');
    clearPersistedTutorAvatarPosition();
    clearPersistedTutorPanelPosition();
    setAskModalDockStyle(null);
    if (selectionGuidanceRevealTimeoutRef.current !== null) {
      window.clearTimeout(selectionGuidanceRevealTimeoutRef.current);
      selectionGuidanceRevealTimeoutRef.current = null;
    }
    clearSelection();
    setHighlightedText(null);
    setHighlightedSection(null);
    setHoveredSectionAnchorId(null);
    setPersistedSelectionRect(null);
    setPersistedSelectionPageRect(null);
    setPersistedSelectionPageRects([]);
    setPersistedSelectionContainerRect(null);
    setSelectionResponsePending(null);
    setSelectionResponseComplete(null);
    setSelectionGuidanceCalloutVisibleText(null);
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
    setPanelPosition,
    setPanelPositionMode,
    setPanelSnapPreference,
    setPersistedSelectionContainerRect,
    setPersistedSelectionPageRect,
    setPersistedSelectionPageRects,
    setPersistedSelectionRect,
    selectionGuidanceRevealTimeoutRef,
    setSectionResponseComplete,
    setSectionResponsePending,
    setSelectionGuidanceCalloutVisibleText,
    setSelectionConversationContext,
    setSelectionGuidanceHandoffText,
    setSelectionResponseComplete,
    setSelectionResponsePending,
  ]);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    suppressAvatarClickRef.current = false;
  }, [mounted, routingPageKey, suppressAvatarClickRef]);

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
      if (selectionGuidanceRevealTimeoutRef.current !== null) {
        window.clearTimeout(selectionGuidanceRevealTimeoutRef.current);
        selectionGuidanceRevealTimeoutRef.current = null;
      }
    },
    [selectionExplainTimeoutRef, selectionGuidanceRevealTimeoutRef]
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
      setSelectionGuidanceCalloutVisibleText(null);
      setSelectionConversationContext(null);
      setSelectionGuidanceHandoffText(null);
      setPersistedSelectionRect(null);
      setPersistedSelectionPageRect(null);
      setPersistedSelectionPageRects([]);
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
    setPersistedSelectionPageRects,
    setPersistedSelectionRect,
    setSelectionGuidanceCalloutVisibleText,
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
      setSelectionGuidanceCalloutVisibleText(null);
      setSelectionConversationContext(null);
      setSelectionGuidanceHandoffText(null);
      setPersistedSelectionRect(null);
      setPersistedSelectionPageRect(null);
      setPersistedSelectionPageRects([]);
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
    setPersistedSelectionPageRects,
    setPersistedSelectionRect,
    setSelectionGuidanceCalloutVisibleText,
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
    if (!mounted) {
      return;
    }

    const pendingTarget = loadPersistedPendingNavigationTarget();
    if (!pendingTarget) {
      return;
    }

    const createdAtMs = Date.parse(pendingTarget.createdAt);
    if (Number.isNaN(createdAtMs) || Date.now() - createdAtMs > FOLLOW_UP_COMPLETION_MAX_AGE_MS) {
      clearPersistedPendingNavigationTarget();
      return;
    }

    const currentLocation = getCurrentLocation();
    if (currentLocation?.pathname !== pendingTarget.pathname) {
      return;
    }

    clearPersistedPendingNavigationTarget();

    const anchorId = pendingTarget.anchorId;
    if (!anchorId) {
      trackKangurClientEvent('kangur_ai_tutor_navigation_target_arrived', {
        nodeId: pendingTarget.nodeId,
        label: pendingTarget.label,
        targetPath: pendingTarget.pathname,
        anchorId: null,
        spotlightApplied: false,
      });
      return;
    }

    const rafId = requestAnimationFrame(() => {
      const result = scrollToAndSpotlightAnchor(anchorId);
      trackKangurClientEvent('kangur_ai_tutor_navigation_target_arrived', {
        nodeId: pendingTarget.nodeId,
        label: pendingTarget.label,
        targetPath: pendingTarget.pathname,
        anchorId,
        spotlightApplied: Boolean(result),
      });
    });

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [getCurrentLocation, mounted]);

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
