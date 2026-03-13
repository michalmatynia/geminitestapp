'use client';

import { motion, type TargetAndTransition, type Transition } from 'framer-motion';

import { useKangurAiTutor } from '@/features/kangur/ui/context/KangurAiTutorContext';
import { cn } from '@/shared/utils';

import { KangurAiTutorMoodAvatar } from './KangurAiTutorMoodAvatar';
import { useKangurAiTutorWidgetStateContext } from './KangurAiTutorWidget.state';

import type {
  TutorGuidedArrowhead,
  TutorMotionPosition,
  TutorMotionProfile,
} from './KangurAiTutorWidget.shared';
import type { CSSProperties, JSX, MouseEvent, PointerEvent } from 'react';

const KANGUR_AI_TUTOR_PANEL_SURFACE_ID = 'kangur-ai-tutor-panel-surface';

type GuidedArrowhead = TutorGuidedArrowhead;

type ReducedMotionTransitions = {
  instant: {
    duration: number;
  };
};

type Props = {
  ariaLabel: string;
  avatarAnchorKind: string;
  avatarButtonClassName: string;
  avatarButtonStyle: CSSProperties;
  avatarStyle: TutorMotionPosition;
  floatingAvatarPlacement: string;
  guidedArrowheadTransition?: string;
  guidedAvatarArrowhead: GuidedArrowhead | null;
  guidedAvatarArrowheadDisplayAngle: number | null;
  guidedAvatarArrowheadDisplayAngleLabel?: string;
  guidedAvatarPlacement: string;
  guidedTargetKind: string;
  isAskModalMode: boolean;
  isGuidedTutorMode: boolean;
  isOpen: boolean;
  motionProfile: TutorMotionProfile;
  onClick: () => void;
  onMouseDown: (event: MouseEvent<HTMLButtonElement>) => void;
  onMouseUp: (event: MouseEvent<HTMLButtonElement>) => void;
  onPointerCancel: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLButtonElement>) => void;
  prefersReducedMotion: boolean;
  reducedMotionTransitions: ReducedMotionTransitions;
  rimColor: string;
  showFloatingAvatar: boolean;
  uiMode: string;
};

function toMotionTarget(
  style: Record<string, number | string | undefined>
): TargetAndTransition {
  return Object.fromEntries(
    Object.entries(style).filter((entry): entry is [string, number | string] => entry[1] !== undefined)
  ) as TargetAndTransition;
}

export function KangurAiTutorFloatingAvatar({
  ariaLabel,
  avatarAnchorKind,
  avatarButtonClassName,
  avatarButtonStyle,
  avatarStyle,
  floatingAvatarPlacement,
  guidedArrowheadTransition,
  guidedAvatarArrowhead,
  guidedAvatarArrowheadDisplayAngle,
  guidedAvatarArrowheadDisplayAngleLabel,
  guidedAvatarPlacement,
  guidedTargetKind,
  isAskModalMode,
  isGuidedTutorMode,
  isOpen,
  motionProfile,
  onClick,
  onMouseDown,
  onMouseUp,
  onPointerCancel,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  prefersReducedMotion,
  reducedMotionTransitions,
  rimColor,
  showFloatingAvatar,
  uiMode,
}: Props): JSX.Element | null {
  const tutor = useKangurAiTutor();
  const { hasNewMessage, isAvatarDragging } = useKangurAiTutorWidgetStateContext();

  if (!showFloatingAvatar) {
    return null;
  }

  const isGuidedAvatarPlacement = floatingAvatarPlacement === 'guided';
  const avatarTransition: Transition =
    prefersReducedMotion
      ? reducedMotionTransitions.instant
      : isGuidedAvatarPlacement || isGuidedTutorMode || isAskModalMode
        ? motionProfile.guidedAvatarTransition
        : motionProfile.avatarTransition;
  const avatarMotionTarget = toMotionTarget(avatarStyle);

  return (
    <motion.button
      data-kangur-ai-tutor-root='true'
      data-testid='kangur-ai-tutor-avatar'
      data-anchor-kind={avatarAnchorKind}
      data-avatar-placement={floatingAvatarPlacement}
      data-guidance-target={guidedTargetKind}
      data-guidance-avatar-placement={guidedAvatarPlacement}
      data-guidance-motion={isGuidedTutorMode ? 'gentle' : 'standard'}
      data-guidance-transition={
        prefersReducedMotion
          ? 'reduced'
          : isGuidedAvatarPlacement || isGuidedTutorMode || isAskModalMode
            ? 'guided'
            : 'standard'
      }
      data-guidance-pointer={guidedAvatarArrowhead ? 'rim-arrowhead' : 'none'}
      data-guidance-interaction={isGuidedTutorMode ? 'suppressed' : 'interactive'}
      data-is-dragging={isAvatarDragging ? 'true' : 'false'}
      data-drag-visual={isAvatarDragging ? 'ghost' : 'solid'}
      data-motion-preset={motionProfile.kind}
      data-motion-behavior={prefersReducedMotion ? 'reduced' : 'animated'}
      data-ui-mode={uiMode}
      type='button'
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onClick={onClick}
      initial={false}
      animate={avatarMotionTarget}
      transition={avatarTransition}
      whileHover={
        prefersReducedMotion || isGuidedTutorMode || isAskModalMode
          ? undefined
          : { scale: motionProfile.hoverScale }
      }
      whileTap={
        prefersReducedMotion || isGuidedTutorMode || isAskModalMode
          ? undefined
          : { scale: motionProfile.tapScale }
      }
      className={cn(
        'fixed touch-none rounded-full',
        isAskModalMode ? 'z-[78]' : 'z-[74]',
        isAskModalMode
          ? 'pointer-events-none cursor-default'
          : isAvatarDragging
            ? 'cursor-grabbing'
            : 'cursor-grab',
        isAvatarDragging ? 'opacity-85 saturate-75' : null,
        !isAvatarDragging && !isGuidedTutorMode && !isAskModalMode && !isOpen
          ? 'tutor-avatar-idle'
          : null,
        avatarButtonClassName
      )}
      style={avatarButtonStyle}
      aria-label={ariaLabel}
      aria-controls={KANGUR_AI_TUTOR_PANEL_SURFACE_ID}
      aria-expanded={isOpen ? 'true' : 'false'}
    >
      <KangurAiTutorMoodAvatar
        svgContent={tutor?.tutorAvatarSvg ?? null}
        avatarImageUrl={tutor?.tutorAvatarImageUrl ?? null}
        label={
          tutor ? `${tutor.tutorName} avatar (${tutor.tutorMoodId})` : 'Kangur AI tutor avatar'
        }
        className='relative z-[1] h-12 w-12 border kangur-chat-avatar-shell'
        svgClassName='kangur-chat-avatar-svg'
        data-testid='kangur-ai-tutor-avatar-image'
      />
      <span
        aria-hidden='true'
        data-testid='kangur-ai-tutor-avatar-rim'
        className={cn(
          'pointer-events-none absolute inset-0 z-[2] rounded-full border-2',
          !isGuidedTutorMode && !isAvatarDragging ? 'tutor-avatar-rim-shimmer' : null
        )}
        style={{ borderColor: rimColor }}
      />
      {guidedAvatarArrowhead ? (
        <span
          aria-hidden='true'
          data-testid='kangur-ai-tutor-guided-arrowhead'
          data-guidance-layer='below-rim'
          data-guidance-anchor-avatar-left={guidedAvatarArrowhead.anchorAvatarLeft.toFixed(2)}
          data-guidance-anchor-avatar-top={guidedAvatarArrowhead.anchorAvatarTop.toFixed(2)}
          data-pointer-side={guidedAvatarArrowhead.side}
          data-guidance-angle={guidedAvatarArrowhead.angle.toFixed(2)}
          data-guidance-render-angle={guidedAvatarArrowheadDisplayAngleLabel}
          data-guidance-quadrant={guidedAvatarArrowhead.quadrant}
          data-guidance-rim-color={rimColor}
          data-guidance-target-x={guidedAvatarArrowhead.targetX.toFixed(2)}
          data-guidance-target-y={guidedAvatarArrowhead.targetY.toFixed(2)}
          className='pointer-events-none absolute z-0 h-[18px] w-[18px]'
          style={{
            left: guidedAvatarArrowhead.left,
            top: guidedAvatarArrowhead.top,
            transform: `rotate(${guidedAvatarArrowheadDisplayAngle ?? guidedAvatarArrowhead.angle}deg)`,
            transformOrigin: `${guidedAvatarArrowhead.anchorOffsetX}px ${guidedAvatarArrowhead.anchorOffsetY}px`,
            transition: guidedArrowheadTransition,
          }}
        >
          <svg
            viewBox='0 0 18 18'
            className='h-[18px] w-[18px] overflow-visible drop-shadow-[0_1px_2px_rgba(15,23,42,0.22)]'
          >
            <defs>
              <radialGradient id='tutor-arrowhead-glow' cx='70%' cy='50%' r='50%'>
                <stop offset='0%' stopColor={rimColor} stopOpacity='1' />
                <stop offset='100%' stopColor={rimColor} stopOpacity='0.7' />
              </radialGradient>
            </defs>
            <circle cx='12.5' cy='9' r='3.4' fill='url(#tutor-arrowhead-glow)' />
            <path d='M1.2 9 Q6 5.8 12.2 3.4 Q10.4 6.6 10.2 9 Q10.4 11.4 12.2 14.6 Q6 12.2 1.2 9Z' fill={rimColor} />
          </svg>
        </span>
      ) : null}
      {hasNewMessage && !isOpen ? (
        <span
          className='absolute -top-0.5 -right-0.5 z-[4] flex h-4 w-4 items-center justify-center rounded-full ring-2 tutor-badge-enter [background:var(--kangur-chat-notice-badge-background,#ef4444)] [--tw-ring-color:var(--kangur-chat-notice-badge-ring,#ffffff)]'
        >
          <span className='h-1.5 w-1.5 rounded-full [background:var(--kangur-chat-notice-badge-dot,#ffffff)]' />
        </span>
      ) : null}
    </motion.button>
  );
}
