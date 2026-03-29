'use client';

import {
  AnimatePresence,
  motion,
  type MotionStyle,
  type TargetAndTransition,
  type Transition,
} from 'framer-motion';
import { useEffect, useRef } from 'react';

import { useKangurAiTutorContent } from '@/features/kangur/ui/context/KangurAiTutorContentContext';
import { useKangurAiTutor } from '@/features/kangur/ui/context/KangurAiTutorContext';
import { KangurGlassPanel } from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_CENTER_ROW_CLASSNAME,
  KANGUR_PANEL_ROW_CLASSNAME,
  KANGUR_WRAP_CENTER_ROW_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { repairKangurPolishCopy } from '@/shared/lib/i18n/kangur-polish-diacritics';
import { cn } from '@/features/kangur/shared/utils';

import {
  KangurAiTutorChromeBadge,
  KangurAiTutorChromeCloseButton,
  KangurAiTutorChromeKicker,
  KangurAiTutorChromeTextButton,
} from './KangurAiTutorChrome';
import { KangurAiTutorMoodAvatar } from './KangurAiTutorMoodAvatar';
import { KangurNarratorControl } from './KangurNarratorControl';
import { useKangurAiTutorWidgetStateContext } from './KangurAiTutorWidget.state';

import type {
  TutorAvatarPointer,
  TutorHorizontalSide,
  TutorPanelChromeVariant,
  TutorMotionProfile,
  TutorPanelSnapState,
  TutorReducedMotionPanelTransitions,
} from './KangurAiTutorWidget.shared';
import type { KangurAiTutorPanelBodyContextValue } from './KangurAiTutorPanelBody.context';
import type { CSSProperties, JSX, PointerEvent, ReactNode } from 'react';

const KANGUR_AI_TUTOR_PANEL_SURFACE_ID = 'kangur-ai-tutor-panel-surface';

type Props = {
  attachedAvatarStyle: CSSProperties;
  attachedLaunchOffset: {
    x: number;
    y: number;
  };
  avatarAnchorKind: string;
  avatarAttachmentSide: TutorHorizontalSide;
  avatarButtonClassName: string;
  avatarPointer: TutorAvatarPointer | null;
  bubbleEntryDirection: TutorHorizontalSide;
  bubbleMode: 'bubble' | 'sheet';
  bubbleLaunchOrigin: 'dock-bottom-right' | 'sheet';
  bubbleStrategy: string;
  bubbleStyle: Record<string, number | string | undefined>;
  bubbleTailPlacement: 'bottom' | 'dock' | 'top';
  bubbleWidth?: number;
  canDetachPanelFromContext: boolean;
  children: ReactNode;
  canMovePanelToContext: boolean;
  chromeVariant: TutorPanelChromeVariant;
  compactDockedTutorPanelWidth: number;
  canResetPanelPosition: boolean;
  isAskModalMode: boolean;
  isCompactDockedTutorPanel: boolean;
  isFollowingContext: boolean;
  isGuidedTutorMode: boolean;
  isMinimalPanelMode: boolean;
  isOpen: boolean;
  isPanelDraggable: boolean;
  isPanelDragging: boolean;
  isTutorHidden: boolean;
  minimalPanelStyle: CSSProperties;
  panelAvatarPlacement: string;
  panelBodyContextValue: KangurAiTutorPanelBodyContextValue;
  panelEmptyStateMessage: string;
  panelOpenAnimation: 'dock-launch' | 'fade' | 'sheet';
  panelSnapState: TutorPanelSnapState | 'none';
  panelTransition: Transition;
  pointerMarkerId: string;
  prefersReducedMotion: boolean;
  reducedMotionTransitions: TutorReducedMotionPanelTransitions;
  sessionSurfaceLabel: string | null;
  showAttachedAvatarShell: boolean;
  suppressPanelSurface: boolean;
  uiMode: string;
  onAttachedAvatarClick: () => void;
  onAttachedAvatarPointerCancel: (event: PointerEvent<HTMLButtonElement>) => void;
  onAttachedAvatarPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
  onAttachedAvatarPointerMove: (event: PointerEvent<HTMLButtonElement>) => void;
  onAttachedAvatarPointerUp: (event: PointerEvent<HTMLButtonElement>) => void;
  onBackdropClose: () => void;
  onClose: () => void;
  onDetachPanelFromContext: () => void;
  onDisableTutor: () => void;
  onMovePanelToContext: () => void;
  onResetPanelPosition: () => void;
  onHeaderPointerCancel: (event: PointerEvent<HTMLDivElement>) => void;
  onHeaderPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  onHeaderPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  onHeaderPointerUp: (event: PointerEvent<HTMLDivElement>) => void;
  motionProfile: TutorMotionProfile;
};

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

function toMotionTarget(
  style: Record<string, number | string | undefined>
): TargetAndTransition {
  return Object.fromEntries(
    Object.entries(style).filter((entry): entry is [string, number | string] => entry[1] !== undefined)
  ) as TargetAndTransition;
}

function toMotionStyle(
  style: Record<string, number | string | undefined>
): MotionStyle {
  return Object.fromEntries(
    Object.entries(style).filter((entry): entry is [string, number | string] => entry[1] !== undefined)
  ) as MotionStyle;
}

type KangurAiTutorNarratorControlView = {
  contextRegistry: KangurAiTutorPanelBodyContextValue['tutorNarratorContextRegistry'];
  engine: KangurAiTutorPanelBodyContextValue['narratorSettings']['engine'];
  pauseLabel: string;
  readLabel: string;
  resumeLabel: string;
  script: KangurAiTutorPanelBodyContextValue['tutorNarrationScript'];
  voice: KangurAiTutorPanelBodyContextValue['narratorSettings']['voice'];
};

type KangurAiTutorPanelHeaderInfoProps = {
  isContextualResultChrome: boolean;
  isFollowingContext: boolean;
  panelMoodDescription: string;
  sessionSurfaceLabel: string | null;
  shouldRenderPanelMoodDescription: boolean;
  shouldUseMinimalPanelShell: boolean;
  snapPreviewTargetLabel: string | null;
  tutorBehaviorMoodId: string;
  tutorBehaviorMoodLabel: string;
  tutorContent: ReturnType<typeof useKangurAiTutorContent>;
  tutorDisplayName: string;
  uiMode: string;
  narratorControl: KangurAiTutorNarratorControlView;
};

type KangurAiTutorPanelHeaderActionsProps = {
  canDetachPanelFromContext: boolean;
  canMovePanelToContext: boolean;
  canResetPanelPosition: boolean;
  handleClosePanel: () => void;
  handleDetachPanelFromContext: () => void;
  handleDisableTutor: () => void;
  handleMovePanelToContext: () => void;
  handleResetPanelPosition: () => void;
  isContextualResultChrome: boolean;
  shouldUseMinimalPanelShell: boolean;
  tutorContent: ReturnType<typeof useKangurAiTutorContent>;
  uiMode: string;
  narratorControl: KangurAiTutorNarratorControlView;
};

type KangurAiTutorPanelSurfaceProps = {
  avatarPointer: TutorAvatarPointer | null;
  bubbleMode: 'bubble' | 'sheet';
  bubbleTailPlacement: 'bottom' | 'dock' | 'top';
  canDetachPanelFromContext: boolean;
  canMovePanelToContext: boolean;
  canResetPanelPosition: boolean;
  children: ReactNode;
  chromeVariant: TutorPanelChromeVariant;
  handleClosePanel: () => void;
  handleDetachPanelFromContext: () => void;
  handleDisableTutor: () => void;
  handleMovePanelToContext: () => void;
  handleResetPanelPosition: () => void;
  hasSnapPreview: boolean;
  isAskModalMode: boolean;
  isCompactDockedTutorPanel: boolean;
  isContextualResultChrome: boolean;
  isFollowingContext: boolean;
  isHeaderSectionDragEnabled: boolean;
  isPanelBodySectionDragEnabled: boolean;
  isPanelDragging: boolean;
  isPanelDraggable: boolean;
  narratorControl: KangurAiTutorNarratorControlView;
  onHeaderPointerCancel: (event: PointerEvent<HTMLDivElement>) => void;
  onHeaderPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  onHeaderPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  onHeaderPointerUp: (event: PointerEvent<HTMLDivElement>) => void;
  panelAvatarPlacement: string;
  panelEmptyStateMessage: string;
  panelHeaderClassName: string;
  panelMoodDescription: string;
  panelRefSurface: { current: HTMLDivElement | null };
  panelSnapState: TutorPanelSnapState | 'none';
  panelSurfaceClassName: string;
  panelSurfaceStyle: MotionStyle;
  panelSurfaceTestId: string;
  sessionSurfaceLabel: string | null;
  shouldRenderPanelMoodDescription: boolean;
  shouldTrapFocus: boolean;
  shouldUseMinimalPanelShell: boolean;
  snapPreviewTargetLabel: string | null;
  tutorBehaviorMoodId: string;
  tutorBehaviorMoodLabel: string;
  tutorContent: ReturnType<typeof useKangurAiTutorContent>;
  tutorDisplayName: string;
  tutorNarrationRootRef: { current: HTMLDivElement | null };
  uiMode: string;
};

type KangurAiTutorRenderedPanelProps = {
  attachedAvatarStyle: CSSProperties;
  avatarAnchorKind: string;
  avatarAttachmentSide: TutorHorizontalSide;
  avatarButtonClassName: string;
  avatarPointer: TutorAvatarPointer | null;
  bubbleEntryDirection: TutorHorizontalSide;
  bubbleLaunchOrigin: 'dock-bottom-right' | 'sheet';
  bubbleMode: 'bubble' | 'sheet';
  bubbleStrategy: string;
  hasSnapPreview: boolean;
  dialogLabel: string;
  directionalPanelInitialState: TargetAndTransition;
  isBusy: boolean;
  isAskModalMode: boolean;
  isPanelDraggable: boolean;
  isPanelDragging: boolean;
  motionProfile: TutorMotionProfile;
  onAttachedAvatarClick: () => void;
  onAttachedAvatarPointerCancel: (event: PointerEvent<HTMLButtonElement>) => void;
  onAttachedAvatarPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
  onAttachedAvatarPointerMove: (event: PointerEvent<HTMLButtonElement>) => void;
  onAttachedAvatarPointerUp: (event: PointerEvent<HTMLButtonElement>) => void;
  onBackdropClose: () => void;
  panelAnimateTarget: TargetAndTransition;
  panelContainerClassName: string;
  panelContainerStyle: MotionStyle | undefined;
  panelMotionState: string;
  panelOpenAnimation: 'dock-launch' | 'fade' | 'sheet';
  panelRef: { current: HTMLDivElement | null };
  panelSurface: ReactNode;
  panelStyleName: string;
  panelTransitionValue: Transition;
  panelSnapState: TutorPanelSnapState | 'none';
  prefersReducedMotion: boolean;
  pointerMarkerId: string;
  reducedMotionTransitions: TutorReducedMotionPanelTransitions;
  resolvedPanelAvatarPlacement: string;
  shouldRenderAttachedAvatar: boolean;
  shouldRenderBackdrop: boolean;
  shouldRenderPointer: boolean;
  tutor: ReturnType<typeof useKangurAiTutor>;
  tutorContent: ReturnType<typeof useKangurAiTutorContent>;
  tutorDisplayName: string;
  tutorMoodId: string;
  uiMode: string;
};

const resolvePanelMoodDescription = ({
  isGenericEmptyStateMessage,
  panelEmptyStateMessage,
  tutor,
}: {
  isGenericEmptyStateMessage: boolean;
  panelEmptyStateMessage: string;
  tutor: ReturnType<typeof useKangurAiTutor>;
}): string =>
  (isGenericEmptyStateMessage ? tutor?.tutorBehaviorMoodDescription : null) ?? panelEmptyStateMessage;

const resolveSnapPreviewTargetLabel = ({
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

const resolvePanelSurfaceTestId = (isAskModalMode: boolean): string =>
  isAskModalMode ? 'kangur-ai-tutor-ask-modal-surface' : 'kangur-ai-tutor-panel-surface';

const resolvePanelSurfaceClassName = ({
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

const resolvePanelSurfaceStyle = ({
  bubbleMode,
  isAskModalMode,
  isCompactDockedTutorPanel,
  shouldUseMinimalPanelShell,
}: {
  bubbleMode: 'bubble' | 'sheet';
  isAskModalMode: boolean;
  isCompactDockedTutorPanel: boolean;
  shouldUseMinimalPanelShell: boolean;
}): MotionStyle => ({
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

const resolvePanelHeaderClassName = ({
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

const resolvePanelContainerStyle = ({
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

const resolveDirectionalPanelInitialState = ({
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

const resolveShouldTrapFocus = ({
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

const resolveShouldRenderPanel = ({
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

const resolveHeaderSectionDragEnabled = ({
  isAskModalMode,
  isPanelDraggable,
}: {
  isAskModalMode: boolean;
  isPanelDraggable: boolean;
}): boolean => !isAskModalMode && !isPanelDraggable;

const resolveRenderedPanelAvatarPlacement = ({
  panelAvatarPlacement,
  shouldUseMinimalPanelShell,
}: {
  panelAvatarPlacement: string;
  shouldUseMinimalPanelShell: boolean;
}): string => (shouldUseMinimalPanelShell ? 'independent' : panelAvatarPlacement);

const resolveShouldRenderPanelMoodDescription = ({
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

const resolveShouldRenderBackdrop = ({
  bubbleMode,
  isAskModalMode,
  shouldUseMinimalPanelShell,
}: {
  bubbleMode: 'bubble' | 'sheet';
  isAskModalMode: boolean;
  shouldUseMinimalPanelShell: boolean;
}): boolean => isAskModalMode || (!shouldUseMinimalPanelShell && bubbleMode === 'sheet');

const resolveShouldRenderPointer = ({
  avatarPointer,
  isAskModalMode,
  shouldUseMinimalPanelShell,
}: {
  avatarPointer: TutorAvatarPointer | null;
  isAskModalMode: boolean;
  shouldUseMinimalPanelShell: boolean;
}): boolean => !isAskModalMode && !shouldUseMinimalPanelShell && avatarPointer !== null;

const resolveShouldRenderAttachedAvatar = ({
  isAskModalMode,
  shouldUseMinimalPanelShell,
  showAttachedAvatarShell,
}: {
  isAskModalMode: boolean;
  shouldUseMinimalPanelShell: boolean;
  showAttachedAvatarShell: boolean;
}): boolean => !isAskModalMode && !shouldUseMinimalPanelShell && showAttachedAvatarShell;

const resolvePanelStyleName = (shouldUseMinimalPanelShell: boolean): string =>
  shouldUseMinimalPanelShell ? 'minimal-card' : 'guided-card';

const resolvePanelContainerClassName = ({
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

const resolvePanelAnimateTarget = ({
  bubbleMotionTarget,
  isAskModalMode,
  shouldUseMinimalPanelShell,
}: {
  bubbleMotionTarget: TargetAndTransition;
  isAskModalMode: boolean;
  shouldUseMinimalPanelShell: boolean;
}): TargetAndTransition =>
  isAskModalMode || shouldUseMinimalPanelShell ? { opacity: 1 } : bubbleMotionTarget;

const resolvePanelTransitionValue = ({
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

const isPresentNode = (node: ReactNode | null): node is ReactNode => node !== null;

const resolveHeaderDisplayNameClassName = (isContextualResultChrome: boolean): string =>
  cn(
    'text-sm font-semibold leading-relaxed',
    isContextualResultChrome
      ? '[color:var(--kangur-chat-kicker-text,var(--kangur-chat-accent-border,#f59e0b))]'
      : '[color:var(--kangur-chat-panel-text,var(--kangur-page-text,#1e293b))]'
  );

const resolvePanelHeaderMoodNode = ({
  isContextualResultChrome,
  tutorBehaviorMoodId,
  tutorBehaviorMoodLabel,
  tutorContent,
}: {
  isContextualResultChrome: boolean;
  tutorBehaviorMoodId: string;
  tutorBehaviorMoodLabel: string;
  tutorContent: ReturnType<typeof useKangurAiTutorContent>;
}): JSX.Element | null =>
  isContextualResultChrome ? null : (
    <KangurAiTutorChromeBadge
      key='mood-chip'
      data-testid='kangur-ai-tutor-mood-chip'
      data-mood-id={tutorBehaviorMoodId}
      className='mt-2 tracking-[0.1em] shadow-[0_4px_12px_-8px_rgba(245,158,11,0.18)] [border-color:var(--kangur-chat-chip-border,var(--kangur-chat-header-border,var(--kangur-chat-panel-border,rgba(253,186,116,0.52))))] [background:var(--kangur-chat-chip-background,linear-gradient(135deg,color-mix(in_srgb,var(--kangur-soft-card-background)_88%,#fef3c7),color-mix(in_srgb,var(--kangur-soft-card-background)_80%,#fff7ed)))] [color:var(--kangur-chat-chip-text,var(--kangur-page-text))]'
    >
      {tutorContent.panelChrome.moodPrefix}: {tutorBehaviorMoodLabel}
    </KangurAiTutorChromeBadge>
  );

const resolvePanelHeaderMoodDescriptionNode = ({
  isContextualResultChrome,
  panelMoodDescription,
  shouldRenderPanelMoodDescription,
}: {
  isContextualResultChrome: boolean;
  panelMoodDescription: string;
  shouldRenderPanelMoodDescription: boolean;
}): JSX.Element | null =>
  shouldRenderPanelMoodDescription && !isContextualResultChrome ? (
    <span
      key='mood-description'
      data-testid='kangur-ai-tutor-mood-description'
      className='mt-2 text-xs leading-relaxed [color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))]'
    >
      {panelMoodDescription}
    </span>
  ) : null;

const resolvePanelHeaderFollowingContextNode = ({
  isFollowingContext,
  tutorContent,
  uiMode,
}: {
  isFollowingContext: boolean;
  tutorContent: ReturnType<typeof useKangurAiTutorContent>;
  uiMode: string;
}): JSX.Element | null =>
  isFollowingContext && uiMode === 'freeform' ? (
    <KangurAiTutorChromeBadge
      key='following-context'
      data-testid='kangur-ai-tutor-following-context-badge'
      className='mt-2 tracking-[0.08em] [border-color:var(--kangur-chat-chip-border,var(--kangur-chat-header-border,var(--kangur-chat-panel-border,rgba(253,186,116,0.52))))] [background:var(--kangur-chat-chip-background,color-mix(in_srgb,var(--kangur-soft-card-background)_84%,#fef3c7))] [color:var(--kangur-chat-chip-text,var(--kangur-page-text))]'
    >
      {tutorContent.panelChrome.followingContextLabel}
    </KangurAiTutorChromeBadge>
  ) : null;

const resolvePanelHeaderSessionSurfaceNode = (sessionSurfaceLabel: string | null): JSX.Element | null =>
  sessionSurfaceLabel ? (
    <span
      key='session-surface'
      className='mt-2 text-[11px] [color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))]'
    >
      {sessionSurfaceLabel}
    </span>
  ) : null;

const resolvePanelHeaderSnapPreviewNode = ({
  snapPreviewTargetLabel,
  tutorContent,
}: {
  snapPreviewTargetLabel: string | null;
  tutorContent: ReturnType<typeof useKangurAiTutorContent>;
}): JSX.Element | null =>
  snapPreviewTargetLabel ? (
    <KangurAiTutorChromeBadge
      key='snap-preview'
      data-testid='kangur-ai-tutor-snap-preview'
      className='mt-2 tracking-[0.08em] [border-color:var(--kangur-chat-control-border,var(--kangur-chat-chip-border,var(--kangur-chat-panel-border,rgba(253,186,116,0.52))))] [background:var(--kangur-chat-control-background,color-mix(in_srgb,var(--kangur-soft-card-background)_84%,#fef3c7))] [color:var(--kangur-chat-control-text,var(--kangur-page-text))]'
    >
      {`${tutorContent.panelChrome.snapPreviewPrefix}: ${snapPreviewTargetLabel}`}
    </KangurAiTutorChromeBadge>
  ) : null;

const resolvePanelHeaderMetaNodes = ({
  isContextualResultChrome,
  isFollowingContext,
  panelMoodDescription,
  sessionSurfaceLabel,
  shouldRenderPanelMoodDescription,
  snapPreviewTargetLabel,
  tutorBehaviorMoodId,
  tutorBehaviorMoodLabel,
  tutorContent,
  uiMode,
}: {
  isContextualResultChrome: boolean;
  isFollowingContext: boolean;
  panelMoodDescription: string;
  sessionSurfaceLabel: string | null;
  shouldRenderPanelMoodDescription: boolean;
  snapPreviewTargetLabel: string | null;
  tutorBehaviorMoodId: string;
  tutorBehaviorMoodLabel: string;
  tutorContent: ReturnType<typeof useKangurAiTutorContent>;
  uiMode: string;
}): ReactNode[] =>
  [
    resolvePanelHeaderMoodNode({
      isContextualResultChrome,
      tutorBehaviorMoodId,
      tutorBehaviorMoodLabel,
      tutorContent,
    }),
    resolvePanelHeaderMoodDescriptionNode({
      isContextualResultChrome,
      panelMoodDescription,
      shouldRenderPanelMoodDescription,
    }),
    resolvePanelHeaderFollowingContextNode({
      isFollowingContext,
      tutorContent,
      uiMode,
    }),
    resolvePanelHeaderSessionSurfaceNode(sessionSurfaceLabel),
    resolvePanelHeaderSnapPreviewNode({
      snapPreviewTargetLabel,
      tutorContent,
    }),
  ].filter(isPresentNode);

const resolveDetachContextActionNode = ({
  canDetachPanelFromContext,
  handleDetachPanelFromContext,
  isFreeformMode,
  tutorContent,
}: {
  canDetachPanelFromContext: boolean;
  handleDetachPanelFromContext: () => void;
  isFreeformMode: boolean;
  tutorContent: ReturnType<typeof useKangurAiTutorContent>;
}): JSX.Element | null =>
  canDetachPanelFromContext && isFreeformMode ? (
    <KangurAiTutorChromeTextButton
      key='detach'
      data-testid='kangur-ai-tutor-detach-from-context'
      onClick={handleDetachPanelFromContext}
      aria-label={tutorContent.panelChrome.detachFromContextAria}
    >
      {tutorContent.panelChrome.detachFromContextLabel}
    </KangurAiTutorChromeTextButton>
  ) : null;

const resolveMoveContextActionNode = ({
  canMovePanelToContext,
  handleMovePanelToContext,
  isFreeformMode,
  tutorContent,
}: {
  canMovePanelToContext: boolean;
  handleMovePanelToContext: () => void;
  isFreeformMode: boolean;
  tutorContent: ReturnType<typeof useKangurAiTutorContent>;
}): JSX.Element | null =>
  canMovePanelToContext && isFreeformMode ? (
    <KangurAiTutorChromeTextButton
      key='move'
      data-testid='kangur-ai-tutor-move-to-context'
      onClick={handleMovePanelToContext}
      aria-label={tutorContent.panelChrome.moveToContextAria}
    >
      {tutorContent.panelChrome.moveToContextLabel}
    </KangurAiTutorChromeTextButton>
  ) : null;

const resolveResetContextActionNode = ({
  canResetPanelPosition,
  handleResetPanelPosition,
  isFreeformMode,
  tutorContent,
}: {
  canResetPanelPosition: boolean;
  handleResetPanelPosition: () => void;
  isFreeformMode: boolean;
  tutorContent: ReturnType<typeof useKangurAiTutorContent>;
}): JSX.Element | null =>
  canResetPanelPosition && isFreeformMode ? (
    <KangurAiTutorChromeTextButton
      key='reset'
      data-testid='kangur-ai-tutor-reset-position'
      onClick={handleResetPanelPosition}
      aria-label={tutorContent.panelChrome.resetPositionAria}
    >
      {tutorContent.panelChrome.resetPositionLabel}
    </KangurAiTutorChromeTextButton>
  ) : null;

const resolveDisableTutorActionNode = ({
  handleDisableTutor,
  isContextualResultChrome,
  tutorContent,
}: {
  handleDisableTutor: () => void;
  isContextualResultChrome: boolean;
  tutorContent: ReturnType<typeof useKangurAiTutorContent>;
}): JSX.Element | null =>
  isContextualResultChrome ? null : (
    <KangurAiTutorChromeTextButton
      key='disable'
      onClick={handleDisableTutor}
      aria-label={tutorContent.common.disableTutorAria}
    >
      {tutorContent.common.disableTutorLabel}
    </KangurAiTutorChromeTextButton>
  );

const resolveClosePanelActionNode = ({
  handleClosePanel,
  tutorContent,
}: {
  handleClosePanel: () => void;
  tutorContent: ReturnType<typeof useKangurAiTutorContent>;
}): JSX.Element => (
  <KangurAiTutorChromeCloseButton
    key='close'
    onClick={handleClosePanel}
    iconClassName='h-4 w-4'
    aria-label={tutorContent.common.closeAria}
  />
);

const resolvePanelHeaderActionNodes = ({
  canDetachPanelFromContext,
  canMovePanelToContext,
  canResetPanelPosition,
  handleClosePanel,
  handleDetachPanelFromContext,
  handleDisableTutor,
  handleMovePanelToContext,
  handleResetPanelPosition,
  isContextualResultChrome,
  narratorControl,
  shouldUseMinimalPanelShell,
  tutorContent,
  uiMode,
}: {
  canDetachPanelFromContext: boolean;
  canMovePanelToContext: boolean;
  canResetPanelPosition: boolean;
  handleClosePanel: () => void;
  handleDetachPanelFromContext: () => void;
  handleDisableTutor: () => void;
  handleMovePanelToContext: () => void;
  handleResetPanelPosition: () => void;
  isContextualResultChrome: boolean;
  narratorControl: KangurAiTutorNarratorControlView;
  shouldUseMinimalPanelShell: boolean;
  tutorContent: ReturnType<typeof useKangurAiTutorContent>;
  uiMode: string;
}): ReactNode[] => {
  const isFreeformMode = uiMode === 'freeform';
  const baseNodes = shouldUseMinimalPanelShell
    ? [<KangurAiTutorPanelNarratorIcon key='narrator' narratorControl={narratorControl} />]
    : [];

  return [
    ...baseNodes,
    !shouldUseMinimalPanelShell
      ? resolveDetachContextActionNode({
          canDetachPanelFromContext,
          handleDetachPanelFromContext,
          isFreeformMode,
          tutorContent,
        })
      : null,
    !shouldUseMinimalPanelShell
      ? resolveMoveContextActionNode({
          canMovePanelToContext,
          handleMovePanelToContext,
          isFreeformMode,
          tutorContent,
        })
      : null,
    !shouldUseMinimalPanelShell
      ? resolveResetContextActionNode({
          canResetPanelPosition,
          handleResetPanelPosition,
          isFreeformMode,
          tutorContent,
        })
      : null,
    !shouldUseMinimalPanelShell
      ? resolveDisableTutorActionNode({
          handleDisableTutor,
          isContextualResultChrome,
          tutorContent,
        })
      : null,
    resolveClosePanelActionNode({
      handleClosePanel,
      tutorContent,
    }),
  ].filter(isPresentNode);
};

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

function useKangurAiTutorPanelFocusTrap(input: {
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

function KangurAiTutorPanelNarratorIcon(props: {
  narratorControl: KangurAiTutorNarratorControlView;
}): JSX.Element {
  const { narratorControl } = props;
  return (
    <KangurNarratorControl
      className='w-auto'
      contextRegistry={narratorControl.contextRegistry}
      displayMode='icon'
      docId='kangur_ai_tutor_narrator'
      engine={narratorControl.engine}
      pauseLabel={narratorControl.pauseLabel}
      readLabel={narratorControl.readLabel}
      renderWhenEmpty
      resumeLabel={narratorControl.resumeLabel}
      script={narratorControl.script}
      shellTestId='kangur-ai-tutor-narrator-header'
      showFeedback={false}
      voice={narratorControl.voice}
    />
  );
}

function KangurAiTutorPanelHeaderInfo(props: KangurAiTutorPanelHeaderInfoProps): JSX.Element | null {
  const {
    isContextualResultChrome,
    isFollowingContext,
    narratorControl,
    panelMoodDescription,
    sessionSurfaceLabel,
    shouldRenderPanelMoodDescription,
    shouldUseMinimalPanelShell,
    snapPreviewTargetLabel,
    tutorBehaviorMoodId,
    tutorBehaviorMoodLabel,
    tutorContent,
    tutorDisplayName,
    uiMode,
  } = props;

  if (shouldUseMinimalPanelShell) {
    return null;
  }

  const metaNodes = resolvePanelHeaderMetaNodes({
    isContextualResultChrome,
    isFollowingContext,
    panelMoodDescription,
    sessionSurfaceLabel,
    shouldRenderPanelMoodDescription,
    snapPreviewTargetLabel,
    tutorBehaviorMoodId,
    tutorBehaviorMoodLabel,
    tutorContent,
    uiMode,
  });

  return (
    <div className='min-w-0 flex flex-1 flex-col'>
      <KangurAiTutorChromeKicker
        className='[color:var(--kangur-chat-kicker-text,var(--kangur-page-text))]'
        dotClassName='[background:var(--kangur-chat-kicker-dot,var(--kangur-chat-kicker-text,var(--kangur-page-text)))]'
        dotStyle={{
          backgroundColor:
            'var(--kangur-chat-kicker-dot, var(--kangur-chat-kicker-text, var(--kangur-page-text)))',
        }}
      >
        AI Tutor
      </KangurAiTutorChromeKicker>
      <div className={`mt-1 ${KANGUR_WRAP_CENTER_ROW_CLASSNAME} sm:flex-nowrap`}>
        <span
          data-testid='kangur-ai-tutor-display-name'
          className={resolveHeaderDisplayNameClassName(isContextualResultChrome)}
        >
          {tutorDisplayName}
        </span>
        <KangurAiTutorPanelNarratorIcon narratorControl={narratorControl} />
      </div>
      {metaNodes}
    </div>
  );
}

function KangurAiTutorPanelHeaderActions(
  props: KangurAiTutorPanelHeaderActionsProps
): JSX.Element {
  const {
    canDetachPanelFromContext,
    canMovePanelToContext,
    canResetPanelPosition,
    handleClosePanel,
    handleDetachPanelFromContext,
    handleDisableTutor,
    handleMovePanelToContext,
    handleResetPanelPosition,
    isContextualResultChrome,
    narratorControl,
    shouldUseMinimalPanelShell,
    tutorContent,
    uiMode,
  } = props;
  const actionNodes = resolvePanelHeaderActionNodes({
    canDetachPanelFromContext,
    canMovePanelToContext,
    canResetPanelPosition,
    handleClosePanel,
    handleDetachPanelFromContext,
    handleDisableTutor,
    handleMovePanelToContext,
    handleResetPanelPosition,
    isContextualResultChrome,
    narratorControl,
    shouldUseMinimalPanelShell,
    tutorContent,
    uiMode,
  });

  return (
    <div
      className={cn(
        KANGUR_CENTER_ROW_CLASSNAME,
        'pt-0.5',
        shouldUseMinimalPanelShell ? 'ml-auto' : 'w-full flex-wrap sm:ml-3 sm:w-auto sm:justify-end'
      )}
    >
      {actionNodes}
    </div>
  );
}

function KangurAiTutorPanelTail(props: {
  bubbleTailPlacement: 'bottom' | 'dock' | 'top';
}): JSX.Element {
  const { bubbleTailPlacement } = props;

  return (
    <div
      aria-hidden='true'
      data-testid='kangur-ai-tutor-panel-tail'
      className={cn(
        'absolute left-8 h-4 w-4 rotate-45 border kangur-chat-tail',
        bubbleTailPlacement === 'top' ? '-top-2 border-b-0 border-r-0' : '-bottom-2 border-t-0 border-l-0'
      )}
    />
  );
}

function KangurAiTutorPanelSheetHandle(): JSX.Element {
  return (
    <div className='flex justify-center px-3 pt-3 kangur-chat-header-surface'>
      <div
        aria-hidden='true'
        data-testid='kangur-ai-tutor-sheet-handle'
        className='h-1.5 w-14 rounded-full kangur-chat-sheet-handle'
      />
    </div>
  );
}

function KangurAiTutorPanelHeaderSection(
  props: Pick<
    KangurAiTutorPanelSurfaceProps,
    | 'canDetachPanelFromContext'
    | 'canMovePanelToContext'
    | 'canResetPanelPosition'
    | 'chromeVariant'
    | 'handleClosePanel'
    | 'handleDetachPanelFromContext'
    | 'handleDisableTutor'
    | 'handleMovePanelToContext'
    | 'handleResetPanelPosition'
    | 'hasSnapPreview'
    | 'isCompactDockedTutorPanel'
    | 'isContextualResultChrome'
    | 'isFollowingContext'
    | 'isHeaderSectionDragEnabled'
    | 'isPanelDragging'
    | 'isPanelDraggable'
    | 'narratorControl'
    | 'onHeaderPointerCancel'
    | 'onHeaderPointerDown'
    | 'onHeaderPointerMove'
    | 'onHeaderPointerUp'
    | 'panelAvatarPlacement'
    | 'panelEmptyStateMessage'
    | 'panelHeaderClassName'
    | 'panelMoodDescription'
    | 'panelSnapState'
    | 'sessionSurfaceLabel'
    | 'shouldRenderPanelMoodDescription'
    | 'shouldUseMinimalPanelShell'
    | 'snapPreviewTargetLabel'
    | 'tutorBehaviorMoodId'
    | 'tutorBehaviorMoodLabel'
    | 'tutorContent'
    | 'tutorDisplayName'
    | 'uiMode'
  >
): JSX.Element {
  const {
    canDetachPanelFromContext,
    canMovePanelToContext,
    canResetPanelPosition,
    chromeVariant,
    handleClosePanel,
    handleDetachPanelFromContext,
    handleDisableTutor,
    handleMovePanelToContext,
    handleResetPanelPosition,
    hasSnapPreview,
    isContextualResultChrome,
    isFollowingContext,
    isHeaderSectionDragEnabled,
    isPanelDragging,
    isPanelDraggable,
    narratorControl,
    onHeaderPointerCancel,
    onHeaderPointerDown,
    onHeaderPointerMove,
    onHeaderPointerUp,
    panelMoodDescription,
    panelSnapState,
    panelHeaderClassName,
    sessionSurfaceLabel,
    shouldRenderPanelMoodDescription,
    shouldUseMinimalPanelShell,
    snapPreviewTargetLabel,
    tutorBehaviorMoodId,
    tutorBehaviorMoodLabel,
    tutorContent,
    tutorDisplayName,
    uiMode,
  } = props;

  return (
    <div
      data-testid='kangur-ai-tutor-header'
      data-panel-draggable={isPanelDraggable ? 'true' : 'false'}
      data-panel-section-draggable={isHeaderSectionDragEnabled ? 'true' : 'false'}
      data-panel-dragging={isPanelDragging ? 'true' : 'false'}
      data-panel-snap={panelSnapState}
      data-panel-snap-preview={hasSnapPreview ? 'true' : 'false'}
      data-panel-chrome-variant={chromeVariant}
      className={panelHeaderClassName}
      onPointerCancel={onHeaderPointerCancel}
      onPointerDown={onHeaderPointerDown}
      onPointerMove={onHeaderPointerMove}
      onPointerUp={onHeaderPointerUp}
    >
      <KangurAiTutorPanelHeaderInfo
        isContextualResultChrome={isContextualResultChrome}
        isFollowingContext={isFollowingContext}
        narratorControl={narratorControl}
        panelMoodDescription={panelMoodDescription}
        sessionSurfaceLabel={sessionSurfaceLabel}
        shouldRenderPanelMoodDescription={shouldRenderPanelMoodDescription}
        shouldUseMinimalPanelShell={shouldUseMinimalPanelShell}
        snapPreviewTargetLabel={snapPreviewTargetLabel}
        tutorBehaviorMoodId={tutorBehaviorMoodId}
        tutorBehaviorMoodLabel={tutorBehaviorMoodLabel}
        tutorContent={tutorContent}
        tutorDisplayName={tutorDisplayName}
        uiMode={uiMode}
      />
      <KangurAiTutorPanelHeaderActions
        canDetachPanelFromContext={canDetachPanelFromContext}
        canMovePanelToContext={canMovePanelToContext}
        canResetPanelPosition={canResetPanelPosition}
        handleClosePanel={handleClosePanel}
        handleDetachPanelFromContext={handleDetachPanelFromContext}
        handleDisableTutor={handleDisableTutor}
        handleMovePanelToContext={handleMovePanelToContext}
        handleResetPanelPosition={handleResetPanelPosition}
        isContextualResultChrome={isContextualResultChrome}
        narratorControl={narratorControl}
        shouldUseMinimalPanelShell={shouldUseMinimalPanelShell}
        tutorContent={tutorContent}
        uiMode={uiMode}
      />
    </div>
  );
}

function KangurAiTutorPanelBodySection(props: {
  children: ReactNode;
  isPanelBodySectionDragEnabled: boolean;
  onHeaderPointerCancel: (event: PointerEvent<HTMLDivElement>) => void;
  onHeaderPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  onHeaderPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  onHeaderPointerUp: (event: PointerEvent<HTMLDivElement>) => void;
  tutorNarrationRootRef: { current: HTMLDivElement | null };
}): JSX.Element {
  const {
    children,
    isPanelBodySectionDragEnabled,
    onHeaderPointerCancel,
    onHeaderPointerDown,
    onHeaderPointerMove,
    onHeaderPointerUp,
    tutorNarrationRootRef,
  } = props;

  return (
    <div
      ref={tutorNarrationRootRef}
      data-testid='kangur-ai-tutor-drag-surface'
      data-panel-section-draggable={isPanelBodySectionDragEnabled ? 'true' : 'false'}
      className={cn(
        'flex min-h-0 flex-1 flex-col',
        isPanelBodySectionDragEnabled ? 'touch-none select-none cursor-grab' : null
      )}
      onPointerCancel={isPanelBodySectionDragEnabled ? onHeaderPointerCancel : undefined}
      onPointerDown={isPanelBodySectionDragEnabled ? onHeaderPointerDown : undefined}
      onPointerMove={isPanelBodySectionDragEnabled ? onHeaderPointerMove : undefined}
      onPointerUp={isPanelBodySectionDragEnabled ? onHeaderPointerUp : undefined}
    >
      {children}
    </div>
  );
}

const resolveShouldRenderPanelTail = ({
  avatarPointer,
  bubbleTailPlacement,
  isAskModalMode,
  shouldUseMinimalPanelShell,
}: {
  avatarPointer: TutorAvatarPointer | null;
  bubbleTailPlacement: 'bottom' | 'dock' | 'top';
  isAskModalMode: boolean;
  shouldUseMinimalPanelShell: boolean;
}): boolean =>
  !isAskModalMode && !shouldUseMinimalPanelShell && !avatarPointer && bubbleTailPlacement !== 'dock';

const resolveShouldRenderPanelSheetHandle = ({
  bubbleMode,
  isAskModalMode,
  shouldUseMinimalPanelShell,
}: {
  bubbleMode: 'bubble' | 'sheet';
  isAskModalMode: boolean;
  shouldUseMinimalPanelShell: boolean;
}): boolean => !isAskModalMode && !shouldUseMinimalPanelShell && bubbleMode === 'sheet';

const renderPanelTailNode = (input: {
  avatarPointer: TutorAvatarPointer | null;
  bubbleTailPlacement: 'bottom' | 'dock' | 'top';
  isAskModalMode: boolean;
  shouldUseMinimalPanelShell: boolean;
}): JSX.Element | null =>
  resolveShouldRenderPanelTail(input) ? (
    <KangurAiTutorPanelTail bubbleTailPlacement={input.bubbleTailPlacement} />
  ) : null;

const renderPanelSheetHandleNode = (input: {
  bubbleMode: 'bubble' | 'sheet';
  isAskModalMode: boolean;
  shouldUseMinimalPanelShell: boolean;
}): JSX.Element | null =>
  resolveShouldRenderPanelSheetHandle(input) ? <KangurAiTutorPanelSheetHandle /> : null;

function KangurAiTutorPanelSurface(props: KangurAiTutorPanelSurfaceProps): JSX.Element {
  const {
    avatarPointer,
    bubbleMode,
    bubbleTailPlacement,
    canDetachPanelFromContext,
    canMovePanelToContext,
    canResetPanelPosition,
    children,
    chromeVariant,
    handleClosePanel,
    handleDetachPanelFromContext,
    handleDisableTutor,
    handleMovePanelToContext,
    handleResetPanelPosition,
    hasSnapPreview,
    isAskModalMode,
    isCompactDockedTutorPanel,
    isContextualResultChrome,
    isFollowingContext,
    isHeaderSectionDragEnabled,
    isPanelBodySectionDragEnabled,
    isPanelDragging,
    isPanelDraggable,
    narratorControl,
    onHeaderPointerCancel,
    onHeaderPointerDown,
    onHeaderPointerMove,
    onHeaderPointerUp,
    panelAvatarPlacement,
    panelEmptyStateMessage,
    panelHeaderClassName,
    panelMoodDescription,
    panelRefSurface,
    panelSnapState,
    panelSurfaceClassName,
    panelSurfaceStyle,
    panelSurfaceTestId,
    sessionSurfaceLabel,
    shouldRenderPanelMoodDescription,
    shouldTrapFocus,
    shouldUseMinimalPanelShell,
    snapPreviewTargetLabel,
    tutorBehaviorMoodId,
    tutorBehaviorMoodLabel,
    tutorContent,
    tutorDisplayName,
    tutorNarrationRootRef,
    uiMode,
  } = props;

  return (
    <KangurGlassPanel
      id={KANGUR_AI_TUTOR_PANEL_SURFACE_ID}
      data-testid={panelSurfaceTestId}
      surface='warmGlow'
      variant='soft'
      ref={panelRefSurface}
      tabIndex={shouldTrapFocus ? -1 : undefined}
      className={panelSurfaceClassName}
      style={panelSurfaceStyle}
    >
      {renderPanelTailNode({
        avatarPointer,
        bubbleTailPlacement,
        isAskModalMode,
        shouldUseMinimalPanelShell,
      })}
      {renderPanelSheetHandleNode({
        bubbleMode,
        isAskModalMode,
        shouldUseMinimalPanelShell,
      })}
      <KangurAiTutorPanelHeaderSection
        canDetachPanelFromContext={canDetachPanelFromContext}
        canMovePanelToContext={canMovePanelToContext}
        canResetPanelPosition={canResetPanelPosition}
        chromeVariant={chromeVariant}
        handleClosePanel={handleClosePanel}
        handleDetachPanelFromContext={handleDetachPanelFromContext}
        handleDisableTutor={handleDisableTutor}
        handleMovePanelToContext={handleMovePanelToContext}
        handleResetPanelPosition={handleResetPanelPosition}
        hasSnapPreview={hasSnapPreview}
        isCompactDockedTutorPanel={isCompactDockedTutorPanel}
        isContextualResultChrome={isContextualResultChrome}
        isFollowingContext={isFollowingContext}
        isHeaderSectionDragEnabled={isHeaderSectionDragEnabled}
        isPanelDragging={isPanelDragging}
        isPanelDraggable={isPanelDraggable}
        narratorControl={narratorControl}
        onHeaderPointerCancel={onHeaderPointerCancel}
        onHeaderPointerDown={onHeaderPointerDown}
        onHeaderPointerMove={onHeaderPointerMove}
        onHeaderPointerUp={onHeaderPointerUp}
        panelAvatarPlacement={panelAvatarPlacement}
        panelEmptyStateMessage={panelEmptyStateMessage}
        panelHeaderClassName={panelHeaderClassName}
        panelMoodDescription={panelMoodDescription}
        panelSnapState={panelSnapState}
        sessionSurfaceLabel={sessionSurfaceLabel}
        shouldRenderPanelMoodDescription={shouldRenderPanelMoodDescription}
        shouldUseMinimalPanelShell={shouldUseMinimalPanelShell}
        snapPreviewTargetLabel={snapPreviewTargetLabel}
        tutorBehaviorMoodId={tutorBehaviorMoodId}
        tutorBehaviorMoodLabel={tutorBehaviorMoodLabel}
        tutorContent={tutorContent}
        tutorDisplayName={tutorDisplayName}
        uiMode={uiMode}
      />
      <KangurAiTutorPanelBodySection
        isPanelBodySectionDragEnabled={isPanelBodySectionDragEnabled}
        onHeaderPointerCancel={onHeaderPointerCancel}
        onHeaderPointerDown={onHeaderPointerDown}
        onHeaderPointerMove={onHeaderPointerMove}
        onHeaderPointerUp={onHeaderPointerUp}
        tutorNarrationRootRef={tutorNarrationRootRef}
      >
        {children}
      </KangurAiTutorPanelBodySection>
    </KangurGlassPanel>
  );
}

function KangurAiTutorPanelBackdrop(props: {
  isAskModalMode: boolean;
  onBackdropClose: () => void;
  prefersReducedMotion: boolean;
  reducedMotionTransitions: TutorReducedMotionPanelTransitions;
  tutorContent: ReturnType<typeof useKangurAiTutorContent>;
}): JSX.Element {
  const { isAskModalMode, onBackdropClose, prefersReducedMotion, reducedMotionTransitions, tutorContent } =
    props;

  return (
    <motion.button
      data-kangur-ai-tutor-root='true'
      key={isAskModalMode ? 'ask-modal-backdrop' : 'chat-backdrop'}
      data-testid={isAskModalMode ? 'kangur-ai-tutor-ask-modal-backdrop' : 'kangur-ai-tutor-backdrop'}
      type='button'
      aria-label={tutorContent.common.closeTutorAria}
      initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
      transition={prefersReducedMotion ? reducedMotionTransitions.instant : { duration: 0.18 }}
      className={cn(
        'fixed inset-0 cursor-pointer',
        isAskModalMode
          ? 'z-[76] kangur-chat-backdrop-strong backdrop-blur-[2px]'
          : 'z-[62] kangur-chat-backdrop'
      )}
      onClick={onBackdropClose}
    />
  );
}

function KangurAiTutorPanelPointer(props: {
  avatarPointer: TutorAvatarPointer;
  pointerMarkerId: string;
}): JSX.Element {
  const { avatarPointer, pointerMarkerId } = props;

  return (
    <svg
      aria-hidden='true'
      data-testid='kangur-ai-tutor-pointer'
      data-pointer-side={avatarPointer.side}
      className='pointer-events-none absolute z-0 overflow-visible'
      style={{
        left: avatarPointer.left,
        top: avatarPointer.top,
        width: avatarPointer.width,
        height: avatarPointer.height,
      }}
      viewBox={`0 0 ${avatarPointer.width} ${avatarPointer.height}`}
    >
      <defs>
        <marker
          id={pointerMarkerId}
          markerWidth='10'
          markerHeight='10'
          refX='8'
          refY='5'
          orient='auto'
          viewBox='0 0 10 10'
        >
          <path
            d='M1 1 Q3 5 1 9 L9 5 Z'
            data-testid='kangur-ai-tutor-pointer-marker'
            className='kangur-chat-pointer-marker'
            opacity='0.85'
          />
        </marker>
        <filter id={`${pointerMarkerId}-glow`}>
          <feGaussianBlur stdDeviation='2' result='blur' />
          <feMerge>
            <feMergeNode in='blur' />
            <feMergeNode in='SourceGraphic' />
          </feMerge>
        </filter>
      </defs>
      <line
        data-testid='kangur-ai-tutor-pointer-glow'
        x1={avatarPointer.start.x}
        y1={avatarPointer.start.y}
        x2={avatarPointer.end.x}
        y2={avatarPointer.end.y}
        className='kangur-chat-pointer-glow'
        strokeLinecap='round'
        strokeWidth='7'
        opacity='0.6'
        filter={`url(#${pointerMarkerId}-glow)`}
      />
      <line
        data-testid='kangur-ai-tutor-pointer-line'
        x1={avatarPointer.start.x}
        y1={avatarPointer.start.y}
        x2={avatarPointer.end.x}
        y2={avatarPointer.end.y}
        markerEnd={`url(#${pointerMarkerId})`}
        className='kangur-chat-pointer-line'
        strokeLinecap='round'
        strokeWidth='2.5'
        strokeDasharray='6 4'
        opacity='0.75'
      />
    </svg>
  );
}

function KangurAiTutorAttachedAvatarButton(props: {
  attachedAvatarStyle: CSSProperties;
  avatarAnchorKind: string;
  avatarAttachmentSide: TutorHorizontalSide;
  avatarButtonClassName: string;
  motionProfile: TutorMotionProfile;
  onAttachedAvatarClick: () => void;
  onAttachedAvatarPointerCancel: (event: PointerEvent<HTMLButtonElement>) => void;
  onAttachedAvatarPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
  onAttachedAvatarPointerMove: (event: PointerEvent<HTMLButtonElement>) => void;
  onAttachedAvatarPointerUp: (event: PointerEvent<HTMLButtonElement>) => void;
  prefersReducedMotion: boolean;
  tutor: ReturnType<typeof useKangurAiTutor>;
  tutorContent: ReturnType<typeof useKangurAiTutorContent>;
  tutorDisplayName: string;
  tutorMoodId: string;
  uiMode: string;
}): JSX.Element {
  const {
    attachedAvatarStyle,
    avatarAnchorKind,
    avatarAttachmentSide,
    avatarButtonClassName,
    motionProfile,
    onAttachedAvatarClick,
    onAttachedAvatarPointerCancel,
    onAttachedAvatarPointerDown,
    onAttachedAvatarPointerMove,
    onAttachedAvatarPointerUp,
    prefersReducedMotion,
    tutor,
    tutorContent,
    tutorDisplayName,
    tutorMoodId,
    uiMode,
  } = props;

  return (
    <motion.button
      data-testid='kangur-ai-tutor-avatar'
      data-anchor-kind={avatarAnchorKind}
      data-avatar-placement='attached'
      data-avatar-attachment-side={avatarAttachmentSide}
      data-motion-preset={motionProfile.kind}
      data-motion-behavior={prefersReducedMotion ? 'reduced' : 'animated'}
      data-ui-mode={uiMode}
      type='button'
      onClick={onAttachedAvatarClick}
      onPointerCancel={onAttachedAvatarPointerCancel}
      onPointerDown={onAttachedAvatarPointerDown}
      onPointerMove={onAttachedAvatarPointerMove}
      onPointerUp={onAttachedAvatarPointerUp}
      whileHover={prefersReducedMotion ? undefined : { scale: motionProfile.hoverScale }}
      whileTap={prefersReducedMotion ? undefined : { scale: motionProfile.tapScale }}
      className={cn('absolute z-10', avatarButtonClassName)}
      style={attachedAvatarStyle}
      aria-label={tutorContent.common.closeTutorAria}
      title={tutorContent.common.closeTutorAria}
    >
      <KangurAiTutorMoodAvatar
        svgContent={tutor?.tutorAvatarSvg ?? null}
        avatarImageUrl={tutor?.tutorAvatarImageUrl ?? null}
        label={`${tutorDisplayName} avatar (${tutorMoodId})`}
        className='h-12 w-12 border kangur-chat-avatar-shell'
        svgClassName='kangur-chat-avatar-svg'
        data-testid='kangur-ai-tutor-avatar-image'
      />
    </motion.button>
  );
}

type KangurAiTutorPanelFrameResolvedProps = {
  ariaModal?: 'true';
  hasPointerValue: 'true' | 'false';
  keyValue: string;
  layout: 'modal' | 'bubble' | 'sheet';
  motionBehavior: 'animated' | 'reduced';
  panelDraggingValue: 'true' | 'false';
  panelDraggableValue: 'true' | 'false';
  panelSnapPreviewValue: 'true' | 'false';
  pointerSide: string;
  role: 'dialog' | 'region';
  testId: string;
};

const toDataBoolean = (value: boolean): 'true' | 'false' => (value ? 'true' : 'false');

const resolvePanelFrameKey = (isAskModalMode: boolean): string =>
  isAskModalMode ? 'ask-modal' : 'chat-panel';

const resolvePanelFrameTestId = (isAskModalMode: boolean): string =>
  isAskModalMode ? 'kangur-ai-tutor-ask-modal' : 'kangur-ai-tutor-panel';

const resolvePanelFrameLayout = ({
  bubbleMode,
  isAskModalMode,
}: {
  bubbleMode: 'bubble' | 'sheet';
  isAskModalMode: boolean;
}): 'modal' | 'bubble' | 'sheet' => (isAskModalMode ? 'modal' : bubbleMode);

const resolvePanelFrameMotionBehavior = (
  prefersReducedMotion: boolean
): 'animated' | 'reduced' => (prefersReducedMotion ? 'reduced' : 'animated');

const resolvePanelFrameRole = (isAskModalMode: boolean): 'dialog' | 'region' =>
  isAskModalMode ? 'dialog' : 'region';

const resolvePanelFrameAriaModal = (isAskModalMode: boolean): 'true' | undefined =>
  isAskModalMode ? 'true' : undefined;

const resolvePanelFramePointerSide = ({
  avatarPointer,
  shouldRenderPointer,
}: {
  avatarPointer: TutorAvatarPointer | null;
  shouldRenderPointer: boolean;
}): string => (shouldRenderPointer ? avatarPointer?.side ?? 'none' : 'none');

const resolvePanelFrameResolvedProps = ({
  avatarPointer,
  bubbleMode,
  hasSnapPreview,
  isAskModalMode,
  isPanelDraggable,
  isPanelDragging,
  prefersReducedMotion,
  shouldRenderPointer,
}: {
  avatarPointer: TutorAvatarPointer | null;
  bubbleMode: 'bubble' | 'sheet';
  hasSnapPreview: boolean;
  isAskModalMode: boolean;
  isPanelDraggable: boolean;
  isPanelDragging: boolean;
  prefersReducedMotion: boolean;
  shouldRenderPointer: boolean;
}): KangurAiTutorPanelFrameResolvedProps => ({
  ariaModal: resolvePanelFrameAriaModal(isAskModalMode),
  hasPointerValue: toDataBoolean(shouldRenderPointer),
  keyValue: resolvePanelFrameKey(isAskModalMode),
  layout: resolvePanelFrameLayout({
    bubbleMode,
    isAskModalMode,
  }),
  motionBehavior: resolvePanelFrameMotionBehavior(prefersReducedMotion),
  panelDraggingValue: toDataBoolean(isPanelDragging),
  panelDraggableValue: toDataBoolean(isPanelDraggable),
  panelSnapPreviewValue: toDataBoolean(hasSnapPreview),
  pointerSide: resolvePanelFramePointerSide({
    avatarPointer,
    shouldRenderPointer,
  }),
  role: resolvePanelFrameRole(isAskModalMode),
  testId: resolvePanelFrameTestId(isAskModalMode),
});

function KangurAiTutorPanelFrame(props: {
  animateTarget: TargetAndTransition;
  bubbleEntryDirection: TutorHorizontalSide;
  bubbleLaunchOrigin: 'dock-bottom-right' | 'sheet';
  bubbleStrategy: string;
  children: ReactNode;
  className: string;
  dialogLabel: string;
  frame: KangurAiTutorPanelFrameResolvedProps;
  initialTarget: TargetAndTransition;
  isBusy: boolean;
  motionProfile: TutorMotionProfile;
  panelMotionState: string;
  panelOpenAnimation: 'dock-launch' | 'fade' | 'sheet';
  panelRef: { current: HTMLDivElement | null };
  panelSnapState: TutorPanelSnapState | 'none';
  panelStyleName: string;
  prefersReducedMotion: boolean;
  resolvedPanelAvatarPlacement: string;
  style: MotionStyle | undefined;
  transitionValue: Transition;
  uiMode: string;
}): JSX.Element {
  const {
    animateTarget,
    bubbleEntryDirection,
    bubbleLaunchOrigin,
    bubbleStrategy,
    children,
    className,
    dialogLabel,
    frame,
    initialTarget,
    isBusy,
    motionProfile,
    panelMotionState,
    panelOpenAnimation,
    panelRef,
    panelSnapState,
    panelStyleName,
    prefersReducedMotion,
    resolvedPanelAvatarPlacement,
    style,
    transitionValue,
    uiMode,
  } = props;

  return (
    <motion.div
      data-kangur-ai-tutor-root='true'
      key={frame.keyValue}
      ref={panelRef}
      data-testid={frame.testId}
      data-layout={frame.layout}
      data-avatar-placement={resolvedPanelAvatarPlacement}
      data-motion-behavior={frame.motionBehavior}
      data-motion-preset={motionProfile.kind}
      data-motion-state={panelMotionState}
      data-open-animation={panelOpenAnimation}
      data-entry-direction={bubbleEntryDirection}
      data-panel-draggable={frame.panelDraggableValue}
      data-panel-dragging={frame.panelDraggingValue}
      data-panel-snap={panelSnapState}
      data-panel-snap-preview={frame.panelSnapPreviewValue}
      data-placement-strategy={bubbleStrategy}
      data-launch-origin={bubbleLaunchOrigin}
      data-panel-style={panelStyleName}
      data-has-pointer={frame.hasPointerValue}
      data-pointer-side={frame.pointerSide}
      data-ui-mode={uiMode}
      role={frame.role}
      aria-modal={frame.ariaModal}
      aria-label={dialogLabel}
      aria-busy={isBusy ? 'true' : undefined}
      initial={initialTarget}
      animate={animateTarget}
      exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
      transition={transitionValue}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}

const renderPanelBackdropNode = (props: {
  isAskModalMode: boolean;
  onBackdropClose: () => void;
  prefersReducedMotion: boolean;
  reducedMotionTransitions: TutorReducedMotionPanelTransitions;
  shouldRenderBackdrop: boolean;
  tutorContent: ReturnType<typeof useKangurAiTutorContent>;
}): JSX.Element | null =>
  props.shouldRenderBackdrop ? (
    <KangurAiTutorPanelBackdrop
      isAskModalMode={props.isAskModalMode}
      onBackdropClose={props.onBackdropClose}
      prefersReducedMotion={props.prefersReducedMotion}
      reducedMotionTransitions={props.reducedMotionTransitions}
      tutorContent={props.tutorContent}
    />
  ) : null;

const renderPanelPointerNode = (props: {
  avatarPointer: TutorAvatarPointer | null;
  pointerMarkerId: string;
  shouldRenderPointer: boolean;
}): JSX.Element | null =>
  props.shouldRenderPointer && props.avatarPointer ? (
    <KangurAiTutorPanelPointer
      avatarPointer={props.avatarPointer}
      pointerMarkerId={props.pointerMarkerId}
    />
  ) : null;

const renderAttachedAvatarNode = (props: {
  attachedAvatarStyle: CSSProperties;
  avatarAnchorKind: string;
  avatarAttachmentSide: TutorHorizontalSide;
  avatarButtonClassName: string;
  motionProfile: TutorMotionProfile;
  onAttachedAvatarClick: () => void;
  onAttachedAvatarPointerCancel: (event: PointerEvent<HTMLButtonElement>) => void;
  onAttachedAvatarPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
  onAttachedAvatarPointerMove: (event: PointerEvent<HTMLButtonElement>) => void;
  onAttachedAvatarPointerUp: (event: PointerEvent<HTMLButtonElement>) => void;
  prefersReducedMotion: boolean;
  shouldRenderAttachedAvatar: boolean;
  tutor: ReturnType<typeof useKangurAiTutor>;
  tutorContent: ReturnType<typeof useKangurAiTutorContent>;
  tutorDisplayName: string;
  tutorMoodId: string;
  uiMode: string;
}): JSX.Element | null =>
  props.shouldRenderAttachedAvatar ? (
    <KangurAiTutorAttachedAvatarButton
      attachedAvatarStyle={props.attachedAvatarStyle}
      avatarAnchorKind={props.avatarAnchorKind}
      avatarAttachmentSide={props.avatarAttachmentSide}
      avatarButtonClassName={props.avatarButtonClassName}
      motionProfile={props.motionProfile}
      onAttachedAvatarClick={props.onAttachedAvatarClick}
      onAttachedAvatarPointerCancel={props.onAttachedAvatarPointerCancel}
      onAttachedAvatarPointerDown={props.onAttachedAvatarPointerDown}
      onAttachedAvatarPointerMove={props.onAttachedAvatarPointerMove}
      onAttachedAvatarPointerUp={props.onAttachedAvatarPointerUp}
      prefersReducedMotion={props.prefersReducedMotion}
      tutor={props.tutor}
      tutorContent={props.tutorContent}
      tutorDisplayName={props.tutorDisplayName}
      tutorMoodId={props.tutorMoodId}
      uiMode={props.uiMode}
    />
  ) : null;

const resolveShouldUseMinimalPanelShell = ({
  isAskModalMode,
  isMinimalPanelMode,
}: {
  isAskModalMode: boolean;
  isMinimalPanelMode: boolean;
}): boolean => isMinimalPanelMode && !isAskModalMode;

const resolveIsContextualResultChrome = (chromeVariant: TutorPanelChromeVariant): boolean =>
  chromeVariant === 'contextual_result';

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

const resolveTutorPanelIdentity = ({
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

const resolveIsGenericEmptyStateMessage = ({
  panelEmptyStateMessage,
  tutorContent,
}: {
  panelEmptyStateMessage: string;
  tutorContent: ReturnType<typeof useKangurAiTutorContent>;
}): boolean =>
  panelEmptyStateMessage === tutorContent.emptyStates.lesson ||
  panelEmptyStateMessage === tutorContent.emptyStates.game;

const resolveHasSnapPreview = (snapPreviewTargetLabel: string | null): boolean =>
  snapPreviewTargetLabel !== null;

const resolveBubbleMotionTarget = ({
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

const resolveNarratorControlView = ({
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

function KangurAiTutorRenderedPanel(props: KangurAiTutorRenderedPanelProps): JSX.Element {
  const {
    attachedAvatarStyle,
    avatarAnchorKind,
    avatarAttachmentSide,
    avatarButtonClassName,
    avatarPointer,
    bubbleEntryDirection,
    bubbleLaunchOrigin,
    bubbleMode,
    bubbleStrategy,
    hasSnapPreview,
    dialogLabel,
    directionalPanelInitialState,
    isBusy,
    isAskModalMode,
    isPanelDraggable,
    isPanelDragging,
    motionProfile,
    onAttachedAvatarClick,
    onAttachedAvatarPointerCancel,
    onAttachedAvatarPointerDown,
    onAttachedAvatarPointerMove,
    onAttachedAvatarPointerUp,
    onBackdropClose,
    panelAnimateTarget,
    panelContainerClassName,
    panelContainerStyle,
    panelMotionState,
    panelOpenAnimation,
    panelRef,
    panelSurface,
    panelStyleName,
    panelTransitionValue,
    panelSnapState,
    prefersReducedMotion,
    pointerMarkerId,
    reducedMotionTransitions,
    resolvedPanelAvatarPlacement,
    shouldRenderAttachedAvatar,
    shouldRenderBackdrop,
    shouldRenderPointer,
    tutor,
    tutorContent,
    tutorDisplayName,
    tutorMoodId,
    uiMode,
  } = props;
  const frame = resolvePanelFrameResolvedProps({
    avatarPointer,
    bubbleMode,
    hasSnapPreview,
    isAskModalMode,
    isPanelDraggable,
    isPanelDragging,
    prefersReducedMotion,
    shouldRenderPointer,
  });

  return (
    <>
      {renderPanelBackdropNode({
        isAskModalMode,
        onBackdropClose,
        prefersReducedMotion,
        reducedMotionTransitions,
        shouldRenderBackdrop,
        tutorContent,
      })}

      <KangurAiTutorPanelFrame
        animateTarget={panelAnimateTarget}
        bubbleEntryDirection={bubbleEntryDirection}
        bubbleLaunchOrigin={bubbleLaunchOrigin}
        bubbleStrategy={bubbleStrategy}
        className={panelContainerClassName}
        dialogLabel={dialogLabel}
        frame={frame}
        initialTarget={directionalPanelInitialState}
        isBusy={isBusy}
        motionProfile={motionProfile}
        panelMotionState={panelMotionState}
        panelOpenAnimation={panelOpenAnimation}
        panelRef={panelRef}
        panelSnapState={panelSnapState}
        panelStyleName={panelStyleName}
        prefersReducedMotion={prefersReducedMotion}
        resolvedPanelAvatarPlacement={resolvedPanelAvatarPlacement}
        style={panelContainerStyle}
        transitionValue={panelTransitionValue}
        uiMode={uiMode}
      >
        {renderPanelPointerNode({
          avatarPointer,
          pointerMarkerId,
          shouldRenderPointer,
        })}
        {renderAttachedAvatarNode({
          attachedAvatarStyle,
          avatarAnchorKind,
          avatarAttachmentSide,
          avatarButtonClassName,
          motionProfile,
          onAttachedAvatarClick,
          onAttachedAvatarPointerCancel,
          onAttachedAvatarPointerDown,
          onAttachedAvatarPointerMove,
          onAttachedAvatarPointerUp,
          prefersReducedMotion,
          shouldRenderAttachedAvatar,
          tutor,
          tutorContent,
          tutorDisplayName,
          tutorMoodId,
          uiMode,
        })}
        {panelSurface}
      </KangurAiTutorPanelFrame>
    </>
  );
}

export function KangurAiTutorPanelChrome({
  attachedAvatarStyle,
  avatarAnchorKind,
  avatarAttachmentSide,
  avatarButtonClassName,
  avatarPointer,
  bubbleEntryDirection,
  bubbleMode,
  bubbleLaunchOrigin,
  bubbleStrategy,
  bubbleStyle,
  bubbleTailPlacement,
  bubbleWidth,
  canDetachPanelFromContext,
  children,
  canMovePanelToContext,
  chromeVariant,
  compactDockedTutorPanelWidth,
  canResetPanelPosition,
  isAskModalMode,
  isCompactDockedTutorPanel,
  isFollowingContext,
  isGuidedTutorMode,
  isMinimalPanelMode,
  isOpen,
  isPanelDraggable,
  isPanelDragging,
  isTutorHidden,
  minimalPanelStyle,
  motionProfile,
  panelAvatarPlacement,
  panelBodyContextValue,
  panelEmptyStateMessage,
  panelOpenAnimation,
  panelSnapState,
  panelTransition,
  pointerMarkerId,
  prefersReducedMotion,
  reducedMotionTransitions,
  sessionSurfaceLabel,
  showAttachedAvatarShell,
  suppressPanelSurface,
  uiMode,
  onAttachedAvatarClick,
  onAttachedAvatarPointerCancel,
  onAttachedAvatarPointerDown,
  onAttachedAvatarPointerMove,
  onAttachedAvatarPointerUp,
  onBackdropClose,
  onClose,
  onDetachPanelFromContext,
  onDisableTutor,
  onMovePanelToContext,
  onResetPanelPosition,
  onHeaderPointerCancel,
  onHeaderPointerDown,
  onHeaderPointerMove,
  onHeaderPointerUp,
}: Props): JSX.Element {
  const tutorContent = useKangurAiTutorContent();
  const tutor = useKangurAiTutor();
  const { panelMotionState, panelRef, tutorNarrationRootRef } =
    useKangurAiTutorWidgetStateContext();
  const panelSurfaceRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const {
    narratorSettings,
    tutorNarrationScript,
    tutorNarratorContextRegistry,
  } = panelBodyContextValue;
  const shouldUseMinimalPanelShell = resolveShouldUseMinimalPanelShell({
    isAskModalMode,
    isMinimalPanelMode,
  });
  const isContextualResultChrome = resolveIsContextualResultChrome(chromeVariant);
  const shouldRenderPanel = resolveShouldRenderPanel({
    isGuidedTutorMode,
    isMinimalPanelMode,
    isOpen,
    isTutorHidden,
    suppressPanelSurface,
  });
  const {
    dialogLabel,
    tutorBehaviorMoodId,
    tutorBehaviorMoodLabel,
    tutorDisplayName,
    tutorMoodId,
  } = resolveTutorPanelIdentity({
    tutor,
    tutorContent,
  });
  const handleDetachPanelFromContext = onDetachPanelFromContext;
  const handleMovePanelToContext = onMovePanelToContext;
  const handleResetPanelPosition = onResetPanelPosition;
  const handleDisableTutor = onDisableTutor;
  const handleClosePanel = onClose;
  const isGenericEmptyStateMessage = resolveIsGenericEmptyStateMessage({
    panelEmptyStateMessage,
    tutorContent,
  });
  const panelMoodDescription = resolvePanelMoodDescription({
    isGenericEmptyStateMessage,
    panelEmptyStateMessage,
    tutor,
  });
  const snapPreviewTargetLabel = resolveSnapPreviewTargetLabel({
    isPanelDragging,
    panelSnapState,
    tutorContent,
  });
  const hasSnapPreview = resolveHasSnapPreview(snapPreviewTargetLabel);
  const panelSurfaceTestId = resolvePanelSurfaceTestId(isAskModalMode);
  const panelSurfaceClassName = resolvePanelSurfaceClassName({
    bubbleMode,
    hasSnapPreview,
    isAskModalMode,
    isCompactDockedTutorPanel,
    shouldUseMinimalPanelShell,
  });
  const panelSurfaceStyle = resolvePanelSurfaceStyle({
    bubbleMode,
    isAskModalMode,
    isCompactDockedTutorPanel,
    shouldUseMinimalPanelShell,
  });
  const isHeaderSectionDragEnabled = resolveHeaderSectionDragEnabled({
    isAskModalMode,
    isPanelDraggable,
  });
  const isPanelBodySectionDragEnabled = isHeaderSectionDragEnabled;
  const panelHeaderClassName = resolvePanelHeaderClassName({
    avatarAttachmentSide,
    hasSnapPreview,
    isAskModalMode,
    isCompactDockedTutorPanel,
    isPanelDragging,
    isPanelDraggable,
    shouldUseMinimalPanelShell,
    showAttachedAvatarShell,
  });
  const resolvedPanelAvatarPlacement = resolveRenderedPanelAvatarPlacement({
    panelAvatarPlacement,
    shouldUseMinimalPanelShell,
  });
  const shouldRenderPanelMoodDescription = resolveShouldRenderPanelMoodDescription({
    isCompactDockedTutorPanel,
    panelEmptyStateMessage,
    panelMoodDescription,
    shouldUseMinimalPanelShell,
  });
  const bubbleMotionTarget = resolveBubbleMotionTarget({
    bubbleMode,
    bubbleStyle,
  });
  const panelContainerStyle = resolvePanelContainerStyle({
    bubbleStyle,
    bubbleWidth,
    compactDockedTutorPanelWidth,
    isAskModalMode,
    isCompactDockedTutorPanel,
    minimalPanelStyle,
    shouldUseMinimalPanelShell,
  });
  const directionalPanelInitialState = resolveDirectionalPanelInitialState({
    bubbleEntryDirection,
    bubbleMode,
    bubbleMotionTarget,
    isAskModalMode,
    panelOpenAnimation,
    prefersReducedMotion,
    shouldUseMinimalPanelShell,
  });
  const shouldTrapFocus = resolveShouldTrapFocus({
    bubbleMode,
    isAskModalMode,
    isOpen,
    isTutorHidden,
    shouldUseMinimalPanelShell,
  });
  const narratorControl = resolveNarratorControlView({
    narratorSettings,
    tutorContent,
    tutorNarrationScript,
    tutorNarratorContextRegistry,
  });
  const shouldRenderBackdrop = resolveShouldRenderBackdrop({
    bubbleMode,
    isAskModalMode,
    shouldUseMinimalPanelShell,
  });
  const shouldRenderPointer = resolveShouldRenderPointer({
    avatarPointer,
    isAskModalMode,
    shouldUseMinimalPanelShell,
  });
  const shouldRenderAttachedAvatar = resolveShouldRenderAttachedAvatar({
    isAskModalMode,
    shouldUseMinimalPanelShell,
    showAttachedAvatarShell,
  });
  const panelContainerClassName = resolvePanelContainerClassName({
    isAskModalMode,
    shouldUseMinimalPanelShell,
  });
  const panelAnimateTarget = resolvePanelAnimateTarget({
    bubbleMotionTarget,
    isAskModalMode,
    shouldUseMinimalPanelShell,
  });
  const panelTransitionValue = resolvePanelTransitionValue({
    isAskModalMode,
    motionProfile,
    panelTransition,
    shouldUseMinimalPanelShell,
  });
  const panelStyleName = resolvePanelStyleName(shouldUseMinimalPanelShell);

  useKangurAiTutorPanelFocusTrap({
    panelSurfaceRef,
    previousFocusRef,
    shouldTrapFocus,
  });

  const panelSurface = (
    <KangurAiTutorPanelSurface
      avatarPointer={avatarPointer}
      bubbleMode={bubbleMode}
      bubbleTailPlacement={bubbleTailPlacement}
      canDetachPanelFromContext={canDetachPanelFromContext}
      canMovePanelToContext={canMovePanelToContext}
      canResetPanelPosition={canResetPanelPosition}
      chromeVariant={chromeVariant}
      handleClosePanel={handleClosePanel}
      handleDetachPanelFromContext={handleDetachPanelFromContext}
      handleDisableTutor={handleDisableTutor}
      handleMovePanelToContext={handleMovePanelToContext}
      handleResetPanelPosition={handleResetPanelPosition}
      hasSnapPreview={hasSnapPreview}
      isAskModalMode={isAskModalMode}
      isCompactDockedTutorPanel={isCompactDockedTutorPanel}
      isContextualResultChrome={isContextualResultChrome}
      isFollowingContext={isFollowingContext}
      isHeaderSectionDragEnabled={isHeaderSectionDragEnabled}
      isPanelBodySectionDragEnabled={isPanelBodySectionDragEnabled}
      isPanelDragging={isPanelDragging}
      isPanelDraggable={isPanelDraggable}
      narratorControl={narratorControl}
      onHeaderPointerCancel={onHeaderPointerCancel}
      onHeaderPointerDown={onHeaderPointerDown}
      onHeaderPointerMove={onHeaderPointerMove}
      onHeaderPointerUp={onHeaderPointerUp}
      panelAvatarPlacement={resolvedPanelAvatarPlacement}
      panelEmptyStateMessage={panelEmptyStateMessage}
      panelHeaderClassName={panelHeaderClassName}
      panelMoodDescription={panelMoodDescription}
      panelRefSurface={panelSurfaceRef}
      panelSnapState={panelSnapState}
      panelSurfaceClassName={panelSurfaceClassName}
      panelSurfaceStyle={panelSurfaceStyle}
      panelSurfaceTestId={panelSurfaceTestId}
      sessionSurfaceLabel={sessionSurfaceLabel}
      shouldRenderPanelMoodDescription={shouldRenderPanelMoodDescription}
      shouldTrapFocus={shouldTrapFocus}
      shouldUseMinimalPanelShell={shouldUseMinimalPanelShell}
      snapPreviewTargetLabel={snapPreviewTargetLabel}
      tutorBehaviorMoodId={tutorBehaviorMoodId}
      tutorBehaviorMoodLabel={tutorBehaviorMoodLabel}
      tutorContent={tutorContent}
      tutorDisplayName={tutorDisplayName}
      tutorNarrationRootRef={tutorNarrationRootRef}
      uiMode={uiMode}
    >
      {children}
    </KangurAiTutorPanelSurface>
  );

  return (
    <AnimatePresence>
      {shouldRenderPanel ? (
        <KangurAiTutorRenderedPanel
          attachedAvatarStyle={attachedAvatarStyle}
          avatarAnchorKind={avatarAnchorKind}
          avatarAttachmentSide={avatarAttachmentSide}
          avatarButtonClassName={avatarButtonClassName}
          avatarPointer={avatarPointer}
          bubbleEntryDirection={bubbleEntryDirection}
          bubbleLaunchOrigin={bubbleLaunchOrigin}
          bubbleMode={bubbleMode}
          bubbleStrategy={bubbleStrategy}
          hasSnapPreview={hasSnapPreview}
          dialogLabel={dialogLabel}
          directionalPanelInitialState={directionalPanelInitialState}
          isBusy={panelBodyContextValue.isLoading}
          isAskModalMode={isAskModalMode}
          isPanelDraggable={isPanelDraggable}
          isPanelDragging={isPanelDragging}
          motionProfile={motionProfile}
          onAttachedAvatarClick={onAttachedAvatarClick}
          onAttachedAvatarPointerCancel={onAttachedAvatarPointerCancel}
          onAttachedAvatarPointerDown={onAttachedAvatarPointerDown}
          onAttachedAvatarPointerMove={onAttachedAvatarPointerMove}
          onAttachedAvatarPointerUp={onAttachedAvatarPointerUp}
          onBackdropClose={onBackdropClose}
          panelAnimateTarget={panelAnimateTarget}
          panelContainerClassName={panelContainerClassName}
          panelContainerStyle={panelContainerStyle}
          panelMotionState={panelMotionState}
          panelOpenAnimation={panelOpenAnimation}
          panelRef={panelRef}
          panelSurface={panelSurface}
          panelStyleName={panelStyleName}
          panelTransitionValue={panelTransitionValue}
          panelSnapState={panelSnapState}
          prefersReducedMotion={prefersReducedMotion}
          pointerMarkerId={pointerMarkerId}
          reducedMotionTransitions={reducedMotionTransitions}
          resolvedPanelAvatarPlacement={resolvedPanelAvatarPlacement}
          shouldRenderAttachedAvatar={shouldRenderAttachedAvatar}
          shouldRenderBackdrop={shouldRenderBackdrop}
          shouldRenderPointer={shouldRenderPointer}
          tutor={tutor}
          tutorContent={tutorContent}
          tutorDisplayName={tutorDisplayName}
          tutorMoodId={tutorMoodId}
          uiMode={uiMode}
        />
      ) : null}
    </AnimatePresence>
  );
}
