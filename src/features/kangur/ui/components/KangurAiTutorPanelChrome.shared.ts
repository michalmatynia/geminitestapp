'use client';

import { useEffect } from 'react';
import type { MotionStyle, TargetAndTransition, Transition } from 'framer-motion';
import type { CSSProperties } from 'react';

import { useKangurAiTutorContent } from '@/features/kangur/ui/context/KangurAiTutorContentContext';
import { useKangurAiTutor } from '@/features/kangur/ui/context/KangurAiTutorContext';
import {
  KANGUR_PANEL_ROW_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { cn } from '@/features/kangur/shared/utils';
import { repairKangurPolishCopy } from '@/shared/lib/i18n/kangur-polish-diacritics';

import type {
  TutorAvatarPointer,
  TutorHorizontalSide,
  TutorMotionProfile,
  TutorPanelChromeVariant,
  TutorPanelSnapState,
} from './ai-tutor-widget/KangurAiTutorWidget.shared';
import type { KangurAiTutorPanelBodyContextValue } from './KangurAiTutorPanelBody.context';

const CONTEXTUAL_PANEL_ENTRY_OFFSET_PX = 84;
const FOCUSABLE_SELECTOR =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

const getFocusableElements = (container: HTMLElement | null): HTMLElement[] => {
  if (!container) {
    return [];
  }

  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) =>
      !element.hasAttribute('disabled') &&
      element.getAttribute('aria-hidden') !== 'true' &&
      (element.offsetWidth > 0 || element.offsetHeight > 0 || element.getClientRects().length > 0)
  );
};

const SNAP_TARGET_CONTENT_KEYS: Record<
  Exclude<TutorPanelSnapState, 'free'>,
  keyof ReturnType<typeof useKangurAiTutorContent>['panelChrome']['snapTargets']
> = {
  bottom: 'bottom',
  'bottom-left': 'bottomLeft',
  'bottom-right': 'bottomRight',
  left: 'left',
  right: 'right',
  top: 'top',
  'top-left': 'topLeft',
  'top-right': 'topRight',
};

const toMotionTarget = (
  style: Record<string, number | string | undefined>
): TargetAndTransition => {
  return Object.fromEntries(
    Object.entries(style).filter((entry): entry is [string, number | string] => entry[1] !== undefined)
  ) as TargetAndTransition;
};

const toMotionStyle = (
  style: Record<string, number | string | undefined>
): MotionStyle => {
  return Object.fromEntries(
    Object.entries(style).filter((entry): entry is [string, number | string] => entry[1] !== undefined)
  ) as MotionStyle;
};

export type KangurAiTutorNarratorControlView = {
  contextRegistry: KangurAiTutorPanelBodyContextValue['tutorNarratorContextRegistry'];
  engine: KangurAiTutorPanelBodyContextValue['narratorSettings']['engine'];
  pauseLabel: string;
  readLabel: string;
  resumeLabel: string;
  script: KangurAiTutorPanelBodyContextValue['tutorNarrationScript'];
  voice: KangurAiTutorPanelBodyContextValue['narratorSettings']['voice'];
};

export const resolvePanelMoodDescription = ({
  isGenericEmptyStateMessage,
  panelEmptyStateMessage,
  tutor,
}: {
  isGenericEmptyStateMessage: boolean;
  panelEmptyStateMessage: string;
  tutor: ReturnType<typeof useKangurAiTutor>;
}): string =>
  (isGenericEmptyStateMessage ? tutor?.tutorBehaviorMoodDescription : null) ?? panelEmptyStateMessage;

export const resolveSnapPreviewTargetLabel = ({
  isPanelDragging,
  panelSnapState,
  tutorContent,
}: {
  isPanelDragging: boolean;
  panelSnapState: TutorPanelSnapState | 'none';
  tutorContent: ReturnType<typeof useKangurAiTutorContent>;
}): string | null =>
  isPanelDragging && panelSnapState !== 'free' && panelSnapState !== 'none'
    ? tutorContent.panelChrome.snapTargets[SNAP_TARGET_CONTENT_KEYS[panelSnapState]]
    : null;

export const resolvePanelContainerStyle = ({
  bubbleStyle,
  bubbleWidth,
  compactDockedTutorPanelWidth,
  isAskModalMode,
  isCompactDockedTutorPanel,
  minimalPanelStyle,
  shouldUseMinimalPanelShell,
}: {
  bubbleStyle: Record<string, number | string | undefined>;
  bubbleWidth?: number;
  compactDockedTutorPanelWidth: number;
  isAskModalMode: boolean;
  isCompactDockedTutorPanel: boolean;
  minimalPanelStyle: CSSProperties;
  shouldUseMinimalPanelShell: boolean;
}): MotionStyle | undefined => {
  if (isAskModalMode) {
    return undefined;
  }
  if (shouldUseMinimalPanelShell) {
    return minimalPanelStyle;
  }
  return toMotionStyle({
    ...bubbleStyle,
    ...(bubbleWidth
      ? {
          width: isCompactDockedTutorPanel ? compactDockedTutorPanelWidth : bubbleWidth,
        }
      : {}),
  });
};

export const resolvePanelSurfaceTestId = (isAskModalMode: boolean): string =>
  isAskModalMode ? 'kangur-ai-tutor-ask-modal-surface' : 'kangur-ai-tutor-panel-surface';

export const resolvePanelSurfaceClassName = ({
  bubbleMode,
  hasSnapPreview,
  isAskModalMode,
  isCompactDockedTutorPanel,
  shouldUseMinimalPanelShell,
}: {
  bubbleMode: 'bubble' | 'sheet';
  hasSnapPreview: boolean;
  isAskModalMode: boolean;
  isCompactDockedTutorPanel: boolean;
  shouldUseMinimalPanelShell: boolean;
}): string =>
  cn(
    'relative flex flex-col overflow-hidden border kangur-chat-panel-surface backdrop-blur-[8px]',
    shouldUseMinimalPanelShell
      ? 'kangur-chat-panel-shell-minimal kangur-chat-panel-shadow-minimal'
      : 'kangur-chat-panel-shadow-default',
    hasSnapPreview ? 'kangur-chat-panel-snap-preview' : null,
    isAskModalMode ? 'pointer-events-auto w-full max-w-[min(92vw,560px)]' : null,
    isCompactDockedTutorPanel ? 'kangur-chat-panel-shell-compact' : null,
    !shouldUseMinimalPanelShell && bubbleMode === 'sheet' ? 'kangur-chat-panel-shell-sheet' : null
  );

export const resolvePanelSurfaceStyle = ({
  bubbleMode,
  isAskModalMode,
  isCompactDockedTutorPanel,
  shouldUseMinimalPanelShell,
}: {
  bubbleMode: 'bubble' | 'sheet';
  isAskModalMode: boolean;
  isCompactDockedTutorPanel: boolean;
  shouldUseMinimalPanelShell: boolean;
}): CSSProperties => ({
  maxHeight: isAskModalMode
    ? 'min(82vh, 720px)'
    : shouldUseMinimalPanelShell
      ? 'min(68vh, 560px)'
      : isCompactDockedTutorPanel
        ? 'min(58vh, 440px)'
        : bubbleMode === 'sheet'
          ? 'min(76vh, 680px)'
          : '70vh',
});

const resolvePanelHeaderPaddingClassName = ({
  isCompactDockedTutorPanel,
  shouldUseMinimalPanelShell,
}: {
  isCompactDockedTutorPanel: boolean;
  shouldUseMinimalPanelShell: boolean;
}): string =>
  isCompactDockedTutorPanel
    ? 'kangur-chat-header-padding-sm'
    : shouldUseMinimalPanelShell
      ? 'kangur-chat-header-padding-lg'
      : 'kangur-chat-header-padding-md';

const resolvePanelHeaderAttachmentClassName = ({
  avatarAttachmentSide,
  showAttachedAvatarShell,
}: {
  avatarAttachmentSide: TutorHorizontalSide;
  showAttachedAvatarShell: boolean;
}): string | null => {
  if (!showAttachedAvatarShell) {
    return null;
  }

  if (avatarAttachmentSide === 'left') {
    return 'pl-16';
  }

  return avatarAttachmentSide === 'right' ? 'pr-16' : null;
};

const resolvePanelHeaderDragClassName = ({
  isPanelDragging,
  isPanelDraggable,
}: {
  isPanelDragging: boolean;
  isPanelDraggable: boolean;
}): string | null => {
  if (!isPanelDraggable) {
    return null;
  }

  return cn('touch-none select-none cursor-grab', isPanelDragging ? 'cursor-grabbing' : null);
};

export const resolvePanelHeaderClassName = ({
  avatarAttachmentSide,
  hasSnapPreview,
  isAskModalMode,
  isCompactDockedTutorPanel,
  isPanelDragging,
  isPanelDraggable,
  shouldUseMinimalPanelShell,
  showAttachedAvatarShell,
}: {
  avatarAttachmentSide: TutorHorizontalSide;
  hasSnapPreview: boolean;
  isAskModalMode: boolean;
  isCompactDockedTutorPanel: boolean;
  isPanelDragging: boolean;
  isPanelDraggable: boolean;
  shouldUseMinimalPanelShell: boolean;
  showAttachedAvatarShell: boolean;
}): string =>
  cn(
    'relative',
    KANGUR_PANEL_ROW_CLASSNAME,
    'items-start border-b kangur-chat-header-surface sm:justify-between',
    resolvePanelHeaderPaddingClassName({
      isCompactDockedTutorPanel,
      shouldUseMinimalPanelShell,
    }),
    resolvePanelHeaderAttachmentClassName({
      avatarAttachmentSide,
      showAttachedAvatarShell,
    }),
    resolvePanelHeaderDragClassName({
      isPanelDragging,
      isPanelDraggable,
    }),
    isAskModalMode ? 'pt-5' : null,
    hasSnapPreview ? 'kangur-chat-header-surface-snap' : null
  );

export const resolveDirectionalPanelInitialState = ({
  bubbleEntryDirection,
  bubbleMode,
  bubbleMotionTarget,
  isAskModalMode,
  panelOpenAnimation,
  prefersReducedMotion,
  shouldUseMinimalPanelShell,
}: {
  bubbleEntryDirection: TutorHorizontalSide;
  bubbleMode: 'bubble' | 'sheet';
  bubbleMotionTarget: TargetAndTransition;
  isAskModalMode: boolean;
  panelOpenAnimation: 'dock-launch' | 'fade' | 'sheet';
  prefersReducedMotion: boolean;
  shouldUseMinimalPanelShell: boolean;
}): TargetAndTransition => {
  if (prefersReducedMotion) {
    return { opacity: 1 };
  }
  if (isAskModalMode || shouldUseMinimalPanelShell) {
    return { opacity: 0 };
  }
  if (panelOpenAnimation !== 'dock-launch') {
    return { opacity: 0 };
  }
  return {
    ...bubbleMotionTarget,
    opacity: 0,
    x:
      bubbleEntryDirection === 'left'
        ? -CONTEXTUAL_PANEL_ENTRY_OFFSET_PX
        : CONTEXTUAL_PANEL_ENTRY_OFFSET_PX,
    ...(bubbleMode === 'sheet' ? {} : { scale: 0.985 }),
  };
};

export const resolveShouldTrapFocus = ({
  bubbleMode,
  isAskModalMode,
  isOpen,
  isTutorHidden,
  shouldUseMinimalPanelShell,
}: {
  bubbleMode: 'bubble' | 'sheet';
  isAskModalMode: boolean;
  isOpen: boolean;
  isTutorHidden: boolean;
  shouldUseMinimalPanelShell: boolean;
}): boolean =>
  isOpen &&
  !isTutorHidden &&
  (isAskModalMode || (!shouldUseMinimalPanelShell && bubbleMode === 'sheet'));

export const resolveShouldRenderPanel = ({
  isGuidedTutorMode,
  isMinimalPanelMode,
  isOpen,
  isTutorHidden,
  suppressPanelSurface,
}: {
  isGuidedTutorMode: boolean;
  isMinimalPanelMode: boolean;
  isOpen: boolean;
  isTutorHidden: boolean;
  suppressPanelSurface: boolean;
}): boolean =>
  isOpen && !isTutorHidden && (!isGuidedTutorMode || isMinimalPanelMode) && !suppressPanelSurface;

export const resolveHeaderSectionDragEnabled = ({
  isAskModalMode,
  isPanelDraggable,
}: {
  isAskModalMode: boolean;
  isPanelDraggable: boolean;
}): boolean => !isAskModalMode && !isPanelDraggable;

export const resolveRenderedPanelAvatarPlacement = ({
  panelAvatarPlacement,
  shouldUseMinimalPanelShell,
}: {
  panelAvatarPlacement: string;
  shouldUseMinimalPanelShell: boolean;
}): string => (shouldUseMinimalPanelShell ? 'independent' : panelAvatarPlacement);

export const resolveShouldRenderPanelMoodDescription = ({
  isCompactDockedTutorPanel,
  panelEmptyStateMessage,
  panelMoodDescription,
  shouldUseMinimalPanelShell,
}: {
  isCompactDockedTutorPanel: boolean;
  panelEmptyStateMessage: string;
  panelMoodDescription: string;
  shouldUseMinimalPanelShell: boolean;
}): boolean =>
  !shouldUseMinimalPanelShell &&
  (isCompactDockedTutorPanel || panelMoodDescription !== panelEmptyStateMessage);

export const resolveShouldRenderBackdrop = ({
  bubbleMode,
  isAskModalMode,
  shouldUseMinimalPanelShell,
}: {
  bubbleMode: 'bubble' | 'sheet';
  isAskModalMode: boolean;
  shouldUseMinimalPanelShell: boolean;
}): boolean => isAskModalMode || (!shouldUseMinimalPanelShell && bubbleMode === 'sheet');

export const resolveShouldRenderPointer = ({
  avatarPointer,
  isAskModalMode,
  shouldUseMinimalPanelShell,
}: {
  avatarPointer: TutorAvatarPointer | null;
  isAskModalMode: boolean;
  shouldUseMinimalPanelShell: boolean;
}): boolean => !isAskModalMode && !shouldUseMinimalPanelShell && avatarPointer !== null;

export const resolveShouldRenderAttachedAvatar = ({
  isAskModalMode,
  shouldUseMinimalPanelShell,
  showAttachedAvatarShell,
}: {
  isAskModalMode: boolean;
  shouldUseMinimalPanelShell: boolean;
  showAttachedAvatarShell: boolean;
}): boolean => !isAskModalMode && !shouldUseMinimalPanelShell && showAttachedAvatarShell;

export const resolvePanelContainerClassName = ({
  isAskModalMode,
  shouldUseMinimalPanelShell,
}: {
  isAskModalMode: boolean;
  shouldUseMinimalPanelShell: boolean;
}): string => {
  if (isAskModalMode) {
    return 'fixed inset-0 z-[77] flex items-center justify-center px-4 pt-10 pb-6 pointer-events-none';
  }
  return shouldUseMinimalPanelShell ? 'fixed z-[75]' : 'fixed z-[65]';
};

export const resolvePanelAnimateTarget = ({
  bubbleMotionTarget,
  isAskModalMode,
  shouldUseMinimalPanelShell,
}: {
  bubbleMotionTarget: TargetAndTransition;
  isAskModalMode: boolean;
  shouldUseMinimalPanelShell: boolean;
}): TargetAndTransition =>
  isAskModalMode || shouldUseMinimalPanelShell ? { opacity: 1 } : bubbleMotionTarget;

export const resolvePanelTransitionValue = ({
  isAskModalMode,
  motionProfile,
  panelTransition,
  shouldUseMinimalPanelShell,
}: {
  isAskModalMode: boolean;
  motionProfile: TutorMotionProfile;
  panelTransition: Transition;
  shouldUseMinimalPanelShell: boolean;
}): Transition =>
  isAskModalMode || shouldUseMinimalPanelShell ? motionProfile.bubbleTransition : panelTransition;

export const resolvePanelStyleName = (shouldUseMinimalPanelShell: boolean): string =>
  shouldUseMinimalPanelShell ? 'minimal-card' : 'guided-card';

const focusPanelFallbackTarget = (container: HTMLElement): HTMLElement => {
  const focusables = getFocusableElements(container);
  return focusables[0] ?? container;
};

const restorePreviousPanelFocus = (previousFocusRef: { current: HTMLElement | null }): void => {
  const previousFocus = previousFocusRef.current;
  if (previousFocus && typeof previousFocus.focus === 'function') {
    previousFocus.focus();
  }
};

const handleEmptyPanelFocusTrap = (event: KeyboardEvent, fallbackTarget: HTMLElement): void => {
  event.preventDefault();
  fallbackTarget.focus();
};

const handleBackwardPanelFocusTrap = ({
  active,
  container,
  event,
  first,
  last,
}: {
  active: HTMLElement | null;
  container: HTMLElement;
  event: KeyboardEvent;
  first: HTMLElement;
  last: HTMLElement;
}): void => {
  if (active === first || !container.contains(active)) {
    event.preventDefault();
    last.focus();
  }
};

const handleForwardPanelFocusTrap = ({
  active,
  event,
  first,
  last,
}: {
  active: HTMLElement | null;
  event: KeyboardEvent;
  first: HTMLElement;
  last: HTMLElement;
}): void => {
  if (active === last) {
    event.preventDefault();
    first.focus();
  }
};

const createPanelFocusTrapKeyDownHandler = ({
  container,
  fallbackTarget,
}: {
  container: HTMLElement;
  fallbackTarget: HTMLElement;
}) => {
  return (event: KeyboardEvent): void => {
    if (event.key !== 'Tab') {
      return;
    }

    const candidates = getFocusableElements(container);
    if (candidates.length === 0) {
      handleEmptyPanelFocusTrap(event, fallbackTarget);
      return;
    }

    const first = candidates[0];
    const last = candidates[candidates.length - 1];
    if (!first || !last) {
      return;
    }

    const active = document.activeElement as HTMLElement | null;
    if (event.shiftKey) {
      handleBackwardPanelFocusTrap({
        active,
        container,
        event,
        first,
        last,
      });
      return;
    }

    handleForwardPanelFocusTrap({
      active,
      event,
      first,
      last,
    });
  };
};

export function useKangurAiTutorPanelFocusTrap(input: {
  panelSurfaceRef: { current: HTMLDivElement | null };
  previousFocusRef: { current: HTMLElement | null };
  shouldTrapFocus: boolean;
}): void {
  const { panelSurfaceRef, previousFocusRef, shouldTrapFocus } = input;

  useEffect(() => {
    if (!shouldTrapFocus) {
      return;
    }

    const container = panelSurfaceRef.current;
    if (!container) {
      return;
    }

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const fallbackTarget = focusPanelFallbackTarget(container);
    if (typeof fallbackTarget.focus === 'function') {
      fallbackTarget.focus();
    }

    const handleKeyDown = createPanelFocusTrapKeyDownHandler({
      container,
      fallbackTarget,
    });
    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      restorePreviousPanelFocus(previousFocusRef);
    };
  }, [panelSurfaceRef, previousFocusRef, shouldTrapFocus]);
}

export const resolveIsContextualResultChrome = (
  chromeVariant: TutorPanelChromeVariant
): boolean => chromeVariant === 'contextual_result';

const resolveTutorDisplayName = ({
  tutor,
  tutorContent,
}: {
  tutor: ReturnType<typeof useKangurAiTutor>;
  tutorContent: ReturnType<typeof useKangurAiTutorContent>;
}): string => tutor?.tutorName ?? tutorContent.common.defaultTutorName;

const resolveTutorChatTitleSuffix = (
  tutorContent: ReturnType<typeof useKangurAiTutorContent>
): string => tutorContent.narrator?.chatTitleSuffix ?? '';

const resolveTutorMoodId = (tutor: ReturnType<typeof useKangurAiTutor>): string =>
  tutor?.tutorMoodId ?? 'default';

const resolveTutorBehaviorMoodId = ({
  tutor,
  tutorMoodId,
}: {
  tutor: ReturnType<typeof useKangurAiTutor>;
  tutorMoodId: string;
}): string => tutor?.tutorBehaviorMoodId ?? tutorMoodId;

const resolveTutorBehaviorMoodLabel = ({
  tutor,
  tutorBehaviorMoodId,
}: {
  tutor: ReturnType<typeof useKangurAiTutor>;
  tutorBehaviorMoodId: string;
}): string => repairKangurPolishCopy(tutor?.tutorBehaviorMoodLabel ?? tutorBehaviorMoodId);

const resolveTutorDialogLabel = ({
  chatTitleSuffix,
  tutorDisplayName,
}: {
  chatTitleSuffix: string;
  tutorDisplayName: string;
}): string => `${tutorDisplayName} ${chatTitleSuffix}`.trim();

export const resolveTutorPanelIdentity = ({
  tutor,
  tutorContent,
}: {
  tutor: ReturnType<typeof useKangurAiTutor>;
  tutorContent: ReturnType<typeof useKangurAiTutorContent>;
}): {
  dialogLabel: string;
  tutorBehaviorMoodId: string;
  tutorBehaviorMoodLabel: string;
  tutorDisplayName: string;
  tutorMoodId: string;
} => {
  const tutorDisplayName = resolveTutorDisplayName({
    tutor,
    tutorContent,
  });
  const chatTitleSuffix = resolveTutorChatTitleSuffix(tutorContent);
  const tutorMoodId = resolveTutorMoodId(tutor);
  const tutorBehaviorMoodId = resolveTutorBehaviorMoodId({
    tutor,
    tutorMoodId,
  });

  return {
    dialogLabel: resolveTutorDialogLabel({
      chatTitleSuffix,
      tutorDisplayName,
    }),
    tutorBehaviorMoodId,
    tutorBehaviorMoodLabel: resolveTutorBehaviorMoodLabel({
      tutor,
      tutorBehaviorMoodId,
    }),
    tutorDisplayName,
    tutorMoodId,
  };
};

export const resolveIsGenericEmptyStateMessage = ({
  panelEmptyStateMessage,
  tutorContent,
}: {
  panelEmptyStateMessage: string;
  tutorContent: ReturnType<typeof useKangurAiTutorContent>;
}): boolean =>
  panelEmptyStateMessage === tutorContent.emptyStates.lesson ||
  panelEmptyStateMessage === tutorContent.emptyStates.game;

export const resolveHasSnapPreview = (snapPreviewTargetLabel: string | null): boolean =>
  snapPreviewTargetLabel !== null;

export const resolveBubbleMotionTarget = ({
  bubbleMode,
  bubbleStyle,
}: {
  bubbleMode: 'bubble' | 'sheet';
  bubbleStyle: Record<string, number | string | undefined>;
}): TargetAndTransition =>
  ({
    ...toMotionTarget(bubbleStyle),
    opacity: 1,
    x: 0,
    y: 0,
    ...(bubbleMode === 'sheet' ? {} : { scale: 1 }),
  }) satisfies TargetAndTransition;

export const resolveNarratorControlView = ({
  narratorSettings,
  tutorContent,
  tutorNarrationScript,
  tutorNarratorContextRegistry,
}: {
  narratorSettings: KangurAiTutorPanelBodyContextValue['narratorSettings'];
  tutorContent: ReturnType<typeof useKangurAiTutorContent>;
  tutorNarrationScript: KangurAiTutorPanelBodyContextValue['tutorNarrationScript'];
  tutorNarratorContextRegistry: KangurAiTutorPanelBodyContextValue['tutorNarratorContextRegistry'];
}): KangurAiTutorNarratorControlView => ({
  contextRegistry: tutorNarratorContextRegistry,
  engine: narratorSettings.engine,
  pauseLabel: tutorContent.narrator.pauseLabel,
  readLabel: tutorContent.narrator.readLabel,
  resumeLabel: tutorContent.narrator.resumeLabel,
  script: tutorNarrationScript,
  voice: narratorSettings.voice,
});
