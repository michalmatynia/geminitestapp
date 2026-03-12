'use client';

import {
  AnimatePresence,
  motion,
  type MotionStyle,
  type TargetAndTransition,
  type Transition,
} from 'framer-motion';

import { useKangurAiTutorContent } from '@/features/kangur/ui/context/KangurAiTutorContentContext';
import { useKangurAiTutor } from '@/features/kangur/ui/context/KangurAiTutorContext';
import { KangurGlassPanel } from '@/features/kangur/ui/design/primitives';
import { cn } from '@/shared/utils';

import {
  KangurAiTutorChromeBadge,
  KangurAiTutorChromeCloseButton,
  KangurAiTutorChromeKicker,
  KangurAiTutorChromeTextButton,
} from './KangurAiTutorChrome';
import { KangurAiTutorMoodAvatar } from './KangurAiTutorMoodAvatar';
import { useKangurAiTutorWidgetStateContext } from './KangurAiTutorWidget.state';

import type {
  TutorAvatarPointer,
  TutorHorizontalSide,
  TutorMotionProfile,
  TutorPanelSnapState,
} from './KangurAiTutorWidget.shared';
import type { CSSProperties, JSX, PointerEvent, ReactNode } from 'react';

type ReducedMotionTransitions = {
  instant: {
    duration: number;
  };
  stableState: {
    opacity: number;
    scale: number;
    y: number;
  };
  staticSheetState: {
    opacity: number;
    y: number;
  };
};

type AvatarPointer = TutorAvatarPointer;

type Props = {
  attachedAvatarStyle: CSSProperties;
  attachedLaunchOffset: {
    x: number;
    y: number;
  };
  avatarAnchorKind: string;
  avatarAttachmentSide: TutorHorizontalSide;
  avatarButtonClassName: string;
  avatarPointer: AvatarPointer | null;
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
  panelEmptyStateMessage: string;
  panelOpenAnimation: 'dock-launch' | 'fade' | 'sheet';
  panelSnapState: TutorPanelSnapState | 'none';
  panelTransition: Transition;
  pointerMarkerId: string;
  prefersReducedMotion: boolean;
  reducedMotionTransitions: ReducedMotionTransitions;
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
  const shouldUseMinimalPanelShell = isMinimalPanelMode && !isAskModalMode;
  const tutorDisplayName = tutor?.tutorName ?? tutorContent.common.defaultTutorName;
  const tutorMoodId = tutor?.tutorMoodId ?? 'default';
  const tutorBehaviorMoodId = tutor?.tutorBehaviorMoodId ?? tutorMoodId;
  const tutorBehaviorMoodLabel = tutor?.tutorBehaviorMoodLabel ?? tutorBehaviorMoodId;
  const panelMoodDescription = isCompactDockedTutorPanel
    ? panelEmptyStateMessage
    : (tutor?.tutorBehaviorMoodDescription ?? panelEmptyStateMessage);
  const snapPreviewTargetLabel =
    isPanelDragging && panelSnapState !== 'free' && panelSnapState !== 'none'
      ? tutorContent.panelChrome.snapTargets[SNAP_TARGET_CONTENT_KEYS[panelSnapState]]
      : null;
  const hasSnapPreview = snapPreviewTargetLabel !== null;
  const panelSurfaceTestId = isAskModalMode ? 'kangur-ai-tutor-ask-modal-surface' : undefined;
  const panelSurfaceClassName = cn(
    'relative flex flex-col overflow-hidden border [border-color:var(--kangur-chat-panel-border,rgba(253,186,116,0.52))] [background:var(--kangur-chat-panel-background,linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(255,253,250,0.94)_100%))] backdrop-blur-[8px]',
    shouldUseMinimalPanelShell
      ? '[box-shadow:var(--kangur-chat-panel-shadow,0_26px_60px_-34px_rgba(180,83,9,0.34),inset_0_1px_0_rgba(255,255,255,0.5))] rounded-[28px]'
      : '[box-shadow:var(--kangur-chat-panel-shadow,0_20px_48px_-30px_rgba(180,83,9,0.34),inset_0_1px_0_rgba(255,255,255,0.5))]',
    hasSnapPreview
      ? 'ring-2 ring-amber-300/80 ring-offset-2 ring-offset-transparent [box-shadow:0_0_0_1px_rgba(251,191,36,0.22),0_28px_56px_-28px_rgba(217,119,6,0.45),inset_0_1px_0_rgba(255,255,255,0.6)]'
      : null,
    isAskModalMode ? 'pointer-events-auto w-full max-w-[min(92vw,560px)]' : null,
    isCompactDockedTutorPanel ? 'rounded-[24px]' : null,
    !shouldUseMinimalPanelShell && bubbleMode === 'sheet' ? 'rounded-[28px] rounded-b-[24px]' : null
  );
  const panelSurfaceStyle = {
    maxHeight: isAskModalMode
      ? 'min(82vh, 720px)'
      : shouldUseMinimalPanelShell
        ? 'min(68vh, 560px)'
      : isCompactDockedTutorPanel
        ? 'min(58vh, 440px)'
        : bubbleMode === 'sheet'
          ? 'min(76vh, 680px)'
          : '70vh',
  } satisfies MotionStyle;
  const isHeaderSectionDragEnabled = !isAskModalMode && !isPanelDraggable;
  const isPanelBodySectionDragEnabled = isHeaderSectionDragEnabled;
  const panelHeaderClassName = cn(
    'relative flex flex-col items-start gap-3 border-b [border-color:var(--kangur-chat-header-border,var(--kangur-chat-panel-border,rgba(253,186,116,0.52)))] [background:var(--kangur-chat-header-background,linear-gradient(180deg,color-mix(in_srgb,var(--kangur-soft-card-background)_72%,#fff8d6)_0%,color-mix(in_srgb,var(--kangur-soft-card-background)_82%,#fff7cf)_100%))] sm:flex-row sm:justify-between',
    shouldUseMinimalPanelShell ? 'px-5 py-4' : 'px-4 py-3',
    isAskModalMode ? 'pt-5' : null,
    isCompactDockedTutorPanel ? 'px-3 py-2.5' : null,
    showAttachedAvatarShell && avatarAttachmentSide === 'left' ? 'pl-16' : null,
    showAttachedAvatarShell && avatarAttachmentSide === 'right' ? 'pr-16' : null,
    isPanelDraggable || isHeaderSectionDragEnabled ? 'touch-none select-none cursor-grab' : null,
    isPanelDraggable && isPanelDragging ? 'cursor-grabbing' : null,
    hasSnapPreview
      ? '[background:linear-gradient(180deg,color-mix(in_srgb,var(--kangur-soft-card-background)_64%,#fff2c6)_0%,color-mix(in_srgb,var(--kangur-soft-card-background)_78%,#ffe8b4)_100%)]'
      : null
  );
  const resolvedPanelAvatarPlacement = shouldUseMinimalPanelShell ? 'independent' : panelAvatarPlacement;
  const shouldRenderPanelMoodDescription =
    !shouldUseMinimalPanelShell &&
    (isCompactDockedTutorPanel || panelMoodDescription !== panelEmptyStateMessage);
  const bubbleMotionTarget = {
    ...toMotionTarget(bubbleStyle),
    opacity: 1,
    x: 0,
    y: 0,
    ...(bubbleMode === 'sheet' ? {} : { scale: 1 }),
  } satisfies TargetAndTransition;
  const panelContainerStyle: MotionStyle | undefined = isAskModalMode
    ? undefined
    : shouldUseMinimalPanelShell
      ? minimalPanelStyle
      : toMotionStyle({
          ...bubbleStyle,
          ...(bubbleWidth
            ? {
                width: isCompactDockedTutorPanel ? compactDockedTutorPanelWidth : bubbleWidth,
              }
            : {}),
        });
  const directionalPanelInitialState =
    prefersReducedMotion
      ? { opacity: 1 }
      : isAskModalMode || shouldUseMinimalPanelShell
        ? { opacity: 0 }
        : panelOpenAnimation === 'dock-launch'
          ? {
            ...bubbleMotionTarget,
            opacity: 0,
            x:
              bubbleEntryDirection === 'left'
                ? -CONTEXTUAL_PANEL_ENTRY_OFFSET_PX
                : CONTEXTUAL_PANEL_ENTRY_OFFSET_PX,
            ...(bubbleMode === 'sheet' ? {} : { scale: 0.985 }),
          }
          : { opacity: 0 };

  return (
    <AnimatePresence>
      {isOpen &&
      !isTutorHidden &&
      (!isGuidedTutorMode || isMinimalPanelMode) &&
      !suppressPanelSurface ? (
          <>
            {isAskModalMode || (!shouldUseMinimalPanelShell && bubbleMode === 'sheet') ? (
              <motion.button
                data-kangur-ai-tutor-root='true'
                key={isAskModalMode ? 'ask-modal-backdrop' : 'chat-backdrop'}
                data-testid={
                  isAskModalMode
                    ? 'kangur-ai-tutor-ask-modal-backdrop'
                    : 'kangur-ai-tutor-backdrop'
                }
                type='button'
                aria-label={tutorContent.common.closeTutorAria}
                initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
                transition={prefersReducedMotion ? reducedMotionTransitions.instant : { duration: 0.18 }}
                className={cn(
                  'fixed inset-0 cursor-pointer',
                  isAskModalMode
                    ? 'z-[76] bg-slate-900/32 backdrop-blur-[2px]'
                    : 'z-[62] bg-slate-900/18'
                )}
                onClick={onBackdropClose}
              />
            ) : null}

            <motion.div
              data-kangur-ai-tutor-root='true'
              key={isAskModalMode ? 'ask-modal' : 'chat-panel'}
              ref={panelRef}
              data-testid={isAskModalMode ? 'kangur-ai-tutor-ask-modal' : 'kangur-ai-tutor-panel'}
              data-layout={isAskModalMode ? 'modal' : bubbleMode}
              data-avatar-placement={resolvedPanelAvatarPlacement}
              data-motion-behavior={prefersReducedMotion ? 'reduced' : 'animated'}
              data-motion-preset={motionProfile.kind}
              data-motion-state={panelMotionState}
              data-open-animation={panelOpenAnimation}
              data-entry-direction={bubbleEntryDirection}
              data-panel-draggable={isPanelDraggable ? 'true' : 'false'}
              data-panel-dragging={isPanelDragging ? 'true' : 'false'}
              data-panel-snap={panelSnapState}
              data-panel-snap-preview={hasSnapPreview ? 'true' : 'false'}
              data-placement-strategy={bubbleStrategy}
              data-launch-origin={bubbleLaunchOrigin}
              data-panel-style={shouldUseMinimalPanelShell ? 'minimal-card' : 'guided-card'}
              data-has-pointer={
                !isAskModalMode && !shouldUseMinimalPanelShell && avatarPointer ? 'true' : 'false'
              }
              data-pointer-side={
                !isAskModalMode && !shouldUseMinimalPanelShell
                  ? (avatarPointer?.side ?? 'none')
                  : 'none'
              }
              data-ui-mode={uiMode}
              role={isAskModalMode ? 'dialog' : undefined}
              aria-modal={isAskModalMode ? 'true' : undefined}
              initial={directionalPanelInitialState}
              animate={
                isAskModalMode
                  ? { opacity: 1 }
                  : shouldUseMinimalPanelShell
                    ? { opacity: 1 }
                    : bubbleMotionTarget
              }
              exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
              transition={
                isAskModalMode || shouldUseMinimalPanelShell
                  ? motionProfile.bubbleTransition
                  : panelTransition
              }
              className={
                isAskModalMode
                  ? 'fixed inset-0 z-[77] flex items-center justify-center px-4 pt-10 pb-6 pointer-events-none'
                  : shouldUseMinimalPanelShell
                    ? 'fixed z-[75]'
                    : 'fixed z-[65]'
              }
              style={panelContainerStyle}
            >
              {!isAskModalMode && !shouldUseMinimalPanelShell && avatarPointer ? (
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
                      <path d='M1 1 Q3 5 1 9 L9 5 Z' fill='#b45309' opacity='0.85' />
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
                    x1={avatarPointer.start.x}
                    y1={avatarPointer.start.y}
                    x2={avatarPointer.end.x}
                    y2={avatarPointer.end.y}
                    stroke='#fef3c7'
                    strokeLinecap='round'
                    strokeWidth='7'
                    opacity='0.6'
                    filter={`url(#${pointerMarkerId}-glow)`}
                  />
                  <line
                    x1={avatarPointer.start.x}
                    y1={avatarPointer.start.y}
                    x2={avatarPointer.end.x}
                    y2={avatarPointer.end.y}
                    markerEnd={`url(#${pointerMarkerId})`}
                    stroke='#b45309'
                    strokeLinecap='round'
                    strokeWidth='2.5'
                    strokeDasharray='6 4'
                    opacity='0.75'
                  />
                </svg>
              ) : null}

              {!isAskModalMode && !shouldUseMinimalPanelShell && showAttachedAvatarShell ? (
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
                >
                  <KangurAiTutorMoodAvatar
                    svgContent={tutor?.tutorAvatarSvg ?? null}
                    avatarImageUrl={tutor?.tutorAvatarImageUrl ?? null}
                    label={`${tutorDisplayName} avatar (${tutorMoodId})`}
                    className='h-12 w-12 border border-white/25 bg-white/12 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]'
                    svgClassName='[&_svg]:drop-shadow-[0_1px_1px_rgba(15,23,42,0.1)]'
                    data-testid='kangur-ai-tutor-avatar-image'
                  />
                </motion.button>
              ) : null}

              <KangurGlassPanel
                data-testid={panelSurfaceTestId}
                surface='warmGlow'
                variant='soft'
                className={panelSurfaceClassName}
                style={panelSurfaceStyle}
              >
                {!isAskModalMode &&
                !shouldUseMinimalPanelShell &&
                !avatarPointer &&
                bubbleTailPlacement !== 'dock' ? (
                  <div
                    aria-hidden='true'
                    className={cn(
                      'absolute left-8 h-4 w-4 rotate-45 border border-amber-200/80 [background:var(--kangur-soft-card-background)]',
                      bubbleTailPlacement === 'top'
                        ? '-top-2 border-b-0 border-r-0'
                        : '-bottom-2 border-t-0 border-l-0'
                    )}
                  />
                ) : null}

                {!isAskModalMode && !shouldUseMinimalPanelShell && bubbleMode === 'sheet' ? (
                  <div className='flex justify-center px-3 pt-3 [background:var(--kangur-chat-header-background,color-mix(in_srgb,var(--kangur-soft-card-background)_92%,#fef3c7))]'>
                    <div
                      aria-hidden='true'
                      className='h-1.5 w-14 rounded-full [background:var(--kangur-chat-header-border,rgba(251,191,36,0.22))]'
                    />
                  </div>
                ) : null}

                <div
                  data-testid='kangur-ai-tutor-header'
                  data-panel-draggable={isPanelDraggable ? 'true' : 'false'}
                  data-panel-section-draggable={isHeaderSectionDragEnabled ? 'true' : 'false'}
                  data-panel-dragging={isPanelDragging ? 'true' : 'false'}
                  data-panel-snap={panelSnapState}
                  data-panel-snap-preview={hasSnapPreview ? 'true' : 'false'}
                  className={panelHeaderClassName}
                  onPointerCancel={onHeaderPointerCancel}
                  onPointerDown={onHeaderPointerDown}
                  onPointerMove={onHeaderPointerMove}
                  onPointerUp={onHeaderPointerUp}
                >
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
                    <span className='mt-1 text-sm font-semibold leading-relaxed [color:var(--kangur-chat-panel-text,var(--kangur-page-text,#1e293b))]'>
                      {tutorDisplayName}
                    </span>
                    {!shouldUseMinimalPanelShell ? (
                      <KangurAiTutorChromeBadge
                        data-testid='kangur-ai-tutor-mood-chip'
                        data-mood-id={tutorBehaviorMoodId}
                        className='mt-2 tracking-[0.1em] shadow-[0_4px_12px_-8px_rgba(245,158,11,0.18)] [border-color:var(--kangur-chat-chip-border,var(--kangur-chat-header-border,var(--kangur-chat-panel-border,rgba(253,186,116,0.52))))] [background:var(--kangur-chat-chip-background,linear-gradient(135deg,color-mix(in_srgb,var(--kangur-soft-card-background)_88%,#fef3c7),color-mix(in_srgb,var(--kangur-soft-card-background)_80%,#fff7ed)))] [color:var(--kangur-chat-chip-text,var(--kangur-page-text))]'
                      >
                        {tutorContent.panelChrome.moodPrefix}: {tutorBehaviorMoodLabel}
                      </KangurAiTutorChromeBadge>
                    ) : null}
                    {shouldRenderPanelMoodDescription ? (
                      <span
                        data-testid='kangur-ai-tutor-mood-description'
                        className='mt-2 text-xs leading-relaxed [color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))]'
                      >
                        {panelMoodDescription}
                      </span>
                    ) : null}
                    {isFollowingContext && uiMode === 'freeform' ? (
                      <KangurAiTutorChromeBadge
                        data-testid='kangur-ai-tutor-following-context-badge'
                        className='mt-2 tracking-[0.08em] [border-color:var(--kangur-chat-chip-border,var(--kangur-chat-header-border,var(--kangur-chat-panel-border,rgba(253,186,116,0.52))))] [background:var(--kangur-chat-chip-background,color-mix(in_srgb,var(--kangur-soft-card-background)_84%,#fef3c7))] [color:var(--kangur-chat-chip-text,var(--kangur-page-text))]'
                      >
                        {tutorContent.panelChrome.followingContextLabel}
                      </KangurAiTutorChromeBadge>
                    ) : null}
                    {sessionSurfaceLabel ? (
                      <span className='mt-2 text-[11px] [color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))]'>
                        {sessionSurfaceLabel}
                      </span>
                    ) : null}
                    {snapPreviewTargetLabel ? (
                      <KangurAiTutorChromeBadge
                        data-testid='kangur-ai-tutor-snap-preview'
                        className='mt-2 tracking-[0.08em] [border-color:var(--kangur-chat-control-border,var(--kangur-chat-chip-border,var(--kangur-chat-panel-border,rgba(253,186,116,0.52))))] [background:var(--kangur-chat-control-background,color-mix(in_srgb,var(--kangur-soft-card-background)_84%,#fef3c7))] [color:var(--kangur-chat-control-text,var(--kangur-page-text))]'
                      >
                        {`${tutorContent.panelChrome.snapPreviewPrefix}: ${snapPreviewTargetLabel}`}
                      </KangurAiTutorChromeBadge>
                    ) : null}
                  </div>
                  <div className='flex w-full flex-wrap items-center gap-2 pt-0.5 sm:ml-3 sm:w-auto sm:justify-end'>
                    {!shouldUseMinimalPanelShell ? (
                      canDetachPanelFromContext && uiMode === 'freeform' ? (
                        <KangurAiTutorChromeTextButton
                          data-testid='kangur-ai-tutor-detach-from-context'
                          onClick={onDetachPanelFromContext}
                          aria-label={tutorContent.panelChrome.detachFromContextAria}
                        >
                          {tutorContent.panelChrome.detachFromContextLabel}
                        </KangurAiTutorChromeTextButton>
                      ) : null
                    ) : null}
                    {!shouldUseMinimalPanelShell ? (
                      canMovePanelToContext && uiMode === 'freeform' ? (
                        <KangurAiTutorChromeTextButton
                          data-testid='kangur-ai-tutor-move-to-context'
                          onClick={onMovePanelToContext}
                          aria-label={tutorContent.panelChrome.moveToContextAria}
                        >
                          {tutorContent.panelChrome.moveToContextLabel}
                        </KangurAiTutorChromeTextButton>
                      ) : null
                    ) : null}
                    {!shouldUseMinimalPanelShell ? (
                      canResetPanelPosition && uiMode === 'freeform' ? (
                        <KangurAiTutorChromeTextButton
                          data-testid='kangur-ai-tutor-reset-position'
                          onClick={onResetPanelPosition}
                          aria-label={tutorContent.panelChrome.resetPositionAria}
                        >
                          {tutorContent.panelChrome.resetPositionLabel}
                        </KangurAiTutorChromeTextButton>
                      ) : null
                    ) : null}
                    {!shouldUseMinimalPanelShell ? (
                      <KangurAiTutorChromeTextButton
                        onClick={onDisableTutor}
                        aria-label={tutorContent.common.disableTutorAria}
                      >
                        {tutorContent.common.disableTutorLabel}
                      </KangurAiTutorChromeTextButton>
                    ) : null}
                    <KangurAiTutorChromeCloseButton
                      onClick={onClose}
                      iconClassName='h-4 w-4'
                      aria-label={tutorContent.common.closeAria}
                    />
                  </div>
                </div>

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
              </KangurGlassPanel>
            </motion.div>
          </>
        ) : null}
    </AnimatePresence>
  );
}
