'use client';

import { AnimatePresence, motion, type TargetAndTransition, type Transition } from 'framer-motion';
import { X } from 'lucide-react';

import { useKangurAiTutorContent } from '@/features/kangur/ui/context/KangurAiTutorContentContext';
import { useKangurAiTutor } from '@/features/kangur/ui/context/KangurAiTutorContext';
import { KangurGlassPanel } from '@/features/kangur/ui/design/primitives';
import { cn } from '@/shared/utils';

import { KangurAiTutorMoodAvatar } from './KangurAiTutorMoodAvatar';
import { useKangurAiTutorWidgetStateContext } from './KangurAiTutorWidget.state';

import type { TutorMotionProfile } from './KangurAiTutorWidget.shared';
import type { CSSProperties, JSX, ReactNode } from 'react';

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

type AvatarPointer = {
  end: {
    x: number;
    y: number;
  };
  height: number;
  left: number;
  side: 'left' | 'right';
  start: {
    x: number;
    y: number;
  };
  top: number;
  width: number;
};

type Props = {
  attachedAvatarStyle: CSSProperties;
  attachedLaunchOffset: {
    x: number;
    y: number;
  };
  avatarAnchorKind: string;
  avatarAttachmentSide: 'left' | 'right';
  avatarButtonClassName: string;
  avatarPointer: AvatarPointer | null;
  bubbleMode: 'bubble' | 'sheet';
  bubbleLaunchOrigin: 'dock-bottom-right' | 'sheet';
  bubbleStrategy: string;
  bubbleStyle: Record<string, number | string | undefined>;
  bubbleTailPlacement: 'bottom' | 'dock' | 'top';
  bubbleWidth?: number;
  children: ReactNode;
  compactDockedTutorPanelWidth: number;
  isAskModalMode: boolean;
  isCompactDockedTutorPanel: boolean;
  isGuidedTutorMode: boolean;
  isMinimalPanelMode: boolean;
  isOpen: boolean;
  isTutorHidden: boolean;
  minimalPanelStyle: CSSProperties;
  panelAvatarPlacement: string;
  panelEmptyStateMessage: string;
  panelOpenAnimation: 'dock-launch' | 'fade' | 'sheet';
  panelTransition: Transition;
  pointerMarkerId: string;
  prefersReducedMotion: boolean;
  reducedMotionTransitions: ReducedMotionTransitions;
  sessionSurfaceLabel: string | null;
  showAttachedAvatarShell: boolean;
  suppressPanelSurface: boolean;
  uiMode: string;
  onAttachedAvatarClick: () => void;
  onBackdropClose: () => void;
  onClose: () => void;
  onDisableTutor: () => void;
  motionProfile: TutorMotionProfile;
};

function toMotionTarget(
  style: Record<string, number | string | undefined>
): TargetAndTransition {
  return Object.fromEntries(
    Object.entries(style).filter((entry): entry is [string, number | string] => entry[1] !== undefined)
  ) as TargetAndTransition;
}

export function KangurAiTutorPanelChrome({
  attachedAvatarStyle,
  avatarAnchorKind,
  avatarAttachmentSide,
  avatarButtonClassName,
  avatarPointer,
  bubbleMode,
  bubbleLaunchOrigin,
  bubbleStrategy,
  bubbleStyle,
  bubbleTailPlacement,
  bubbleWidth,
  children,
  compactDockedTutorPanelWidth,
  isAskModalMode,
  isCompactDockedTutorPanel,
  isGuidedTutorMode,
  isMinimalPanelMode,
  isOpen,
  isTutorHidden,
  minimalPanelStyle,
  motionProfile,
  panelAvatarPlacement,
  panelEmptyStateMessage,
  panelOpenAnimation,
  panelTransition,
  pointerMarkerId,
  prefersReducedMotion,
  reducedMotionTransitions,
  sessionSurfaceLabel,
  showAttachedAvatarShell,
  suppressPanelSurface,
  uiMode,
  onAttachedAvatarClick,
  onBackdropClose,
  onClose,
  onDisableTutor,
}: Props): JSX.Element {
  const tutorContent = useKangurAiTutorContent();
  const tutor = useKangurAiTutor();
  const { panelMotionState, panelRef, tutorNarrationRootRef } =
    useKangurAiTutorWidgetStateContext();
  const shouldUseMinimalPanelShell = isMinimalPanelMode && !isAskModalMode;
  const panelSurfaceTestId = isAskModalMode ? 'kangur-ai-tutor-ask-modal-surface' : undefined;
  const panelSurfaceClassName = cn(
    'relative flex flex-col overflow-hidden border border-amber-200/80 bg-white/94 backdrop-blur-[6px]',
    shouldUseMinimalPanelShell
      ? 'shadow-[0_26px_60px_-34px_rgba(180,83,9,0.38)] rounded-[28px]'
      : 'shadow-[0_20px_48px_-30px_rgba(180,83,9,0.38)]',
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
  } satisfies CSSProperties;
  const panelHeaderClassName = cn(
    'flex items-start justify-between gap-3 border-b border-amber-200/80 bg-[#fff7cf]/78',
    shouldUseMinimalPanelShell ? 'px-5 py-4' : 'px-4 py-3',
    isAskModalMode ? 'pt-5' : null,
    isCompactDockedTutorPanel ? 'px-3 py-2.5' : null,
    showAttachedAvatarShell && avatarAttachmentSide === 'left' ? 'pl-16' : null,
    showAttachedAvatarShell && avatarAttachmentSide === 'right' ? 'pr-16' : null
  );
  const tutorDisplayName = tutor?.tutorName ?? tutorContent.common.defaultTutorName;
  const tutorMoodId = tutor?.tutorMoodId ?? 'default';
  const tutorBehaviorMoodId = tutor?.tutorBehaviorMoodId ?? tutorMoodId;
  const tutorBehaviorMoodLabel = tutor?.tutorBehaviorMoodLabel ?? tutorBehaviorMoodId;
  const panelMoodDescription = isCompactDockedTutorPanel
    ? panelEmptyStateMessage
    : (tutor?.tutorBehaviorMoodDescription ?? panelEmptyStateMessage);
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

  return (
    <AnimatePresence>
      {isOpen &&
      !isTutorHidden &&
      !isGuidedTutorMode &&
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
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
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
              style={
                isAskModalMode
                  ? undefined
                  : shouldUseMinimalPanelShell
                    ? minimalPanelStyle
                  : bubbleWidth
                    ? {
                      width: isCompactDockedTutorPanel ? compactDockedTutorPanelWidth : bubbleWidth,
                    }
                    : undefined
              }
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
                      markerWidth='9'
                      markerHeight='9'
                      refX='7'
                      refY='4.5'
                      orient='auto'
                      viewBox='0 0 9 9'
                    >
                      <path d='M0 0 L9 4.5 L0 9 Z' fill='#b45309' />
                    </marker>
                  </defs>
                  <line
                    x1={avatarPointer.start.x}
                    y1={avatarPointer.start.y}
                    x2={avatarPointer.end.x}
                    y2={avatarPointer.end.y}
                    stroke='#fff7cf'
                    strokeLinecap='round'
                    strokeWidth='6'
                  />
                  <line
                    x1={avatarPointer.start.x}
                    y1={avatarPointer.start.y}
                    x2={avatarPointer.end.x}
                    y2={avatarPointer.end.y}
                    markerEnd={`url(#${pointerMarkerId})`}
                    stroke='#b45309'
                    strokeLinecap='round'
                    strokeWidth='3'
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
                      'absolute left-8 h-4 w-4 rotate-45 border border-amber-200/80 bg-white',
                      bubbleTailPlacement === 'top'
                        ? '-top-2 border-b-0 border-r-0'
                        : '-bottom-2 border-t-0 border-l-0'
                    )}
                  />
                ) : null}

                {!isAskModalMode && !shouldUseMinimalPanelShell && bubbleMode === 'sheet' ? (
                  <div className='flex justify-center bg-white/92 px-3 pt-3'>
                    <div aria-hidden='true' className='h-1.5 w-14 rounded-full bg-amber-200' />
                  </div>
                ) : null}

                <div
                  data-testid='kangur-ai-tutor-header'
                  className={panelHeaderClassName}
                >
                  <div className='min-w-0 flex flex-1 flex-col'>
                    <span className='text-[10px] font-semibold tracking-[0.16em] text-amber-700'>
                      AI Tutor
                    </span>
                    <span className='mt-1 text-sm font-semibold leading-relaxed text-slate-900'>
                      {tutorDisplayName}
                    </span>
                    {!shouldUseMinimalPanelShell ? (
                      <span
                        data-testid='kangur-ai-tutor-mood-chip'
                        data-mood-id={tutorBehaviorMoodId}
                        className='mt-2 inline-flex w-fit items-center rounded-full border border-amber-200/80 bg-white/85 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-amber-800'
                      >
                        {tutorContent.panelChrome.moodPrefix}: {tutorBehaviorMoodLabel}
                      </span>
                    ) : null}
                    {shouldRenderPanelMoodDescription ? (
                      <span
                        data-testid='kangur-ai-tutor-mood-description'
                        className='mt-2 text-xs leading-relaxed text-slate-600'
                      >
                        {panelMoodDescription}
                      </span>
                    ) : null}
                    {sessionSurfaceLabel ? (
                      <span className='mt-2 text-[11px] text-slate-500'>{sessionSurfaceLabel}</span>
                    ) : null}
                  </div>
                  <div className='ml-3 flex items-center gap-2 pt-0.5'>
                    {!shouldUseMinimalPanelShell ? (
                      <button
                        type='button'
                        onClick={onDisableTutor}
                        className='cursor-pointer rounded-full border border-amber-200/80 bg-white/85 px-2.5 py-1 text-[11px] font-semibold text-amber-900 transition-colors hover:bg-white'
                        aria-label={tutorContent.common.disableTutorAria}
                      >
                        {tutorContent.common.disableTutorLabel}
                      </button>
                    ) : null}
                    <button
                      type='button'
                      onClick={onClose}
                      className='shrink-0 cursor-pointer rounded-full border border-amber-200/80 bg-white/85 p-1 text-amber-900 transition-[background-color,box-shadow,transform] hover:-translate-y-[1px] hover:scale-[1.03] hover:bg-white hover:shadow-[0_10px_20px_-14px_rgba(180,83,9,0.42)]'
                      aria-label={tutorContent.common.closeAria}
                    >
                      <X className='h-4 w-4' />
                    </button>
                  </div>
                </div>

                <div ref={tutorNarrationRootRef} className='flex min-h-0 flex-1 flex-col'>
                  {children}
                </div>
              </KangurGlassPanel>
            </motion.div>
          </>
        ) : null}
    </AnimatePresence>
  );
}
