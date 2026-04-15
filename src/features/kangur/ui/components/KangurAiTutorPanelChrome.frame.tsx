'use client';

import { motion, type MotionStyle, type TargetAndTransition, type Transition } from 'framer-motion';
import { cn } from '@/features/kangur/shared/utils';

import { type useKangurAiTutorContent } from '@/features/kangur/ui/context/KangurAiTutorContentContext';
import { type useKangurAiTutor } from '@/features/kangur/ui/context/KangurAiTutorContext';

import { KangurAiTutorMoodAvatar } from './KangurAiTutorMoodAvatar';

import type {
  TutorAvatarPointer,
  TutorHorizontalSide,
  TutorMotionProfile,
  TutorPanelSnapState,
  TutorReducedMotionPanelTransitions,
} from './ai-tutor-widget/KangurAiTutorWidget.shared';
import type { CSSProperties, JSX, PointerEvent, ReactNode } from 'react';

export type KangurAiTutorRenderedPanelProps = {
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

export function KangurAiTutorRenderedPanel(props: KangurAiTutorRenderedPanelProps): JSX.Element {
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
