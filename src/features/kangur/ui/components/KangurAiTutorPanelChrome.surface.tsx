'use client';

import { KangurGlassPanel } from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_CENTER_ROW_CLASSNAME,
  KANGUR_WRAP_CENTER_ROW_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { cn } from '@/features/kangur/shared/utils';

import {
  KangurAiTutorChromeBadge,
  KangurAiTutorChromeCloseButton,
  KangurAiTutorChromeKicker,
  KangurAiTutorChromeTextButton,
} from './KangurAiTutorChrome';
import { KangurNarratorControl } from './KangurNarratorControl';
import {
  resolveHeaderSectionDragEnabled,
  resolvePanelHeaderClassName,
  resolvePanelSurfaceClassName,
  resolvePanelSurfaceStyle,
  resolvePanelSurfaceTestId,
  type KangurAiTutorNarratorControlView,
} from './KangurAiTutorPanelChrome.shared';

import type {
  TutorAvatarPointer,
  TutorHorizontalSide,
  TutorPanelChromeVariant,
  TutorPanelSnapState,
} from './KangurAiTutorWidget.shared';
import type { JSX, MotionStyle, PointerEvent, ReactNode } from 'react';
import type { useKangurAiTutorContent } from '@/features/kangur/ui/context/KangurAiTutorContentContext';

const KANGUR_AI_TUTOR_PANEL_SURFACE_ID = 'kangur-ai-tutor-panel-surface';

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

export type KangurAiTutorPanelSurfaceProps = {
  avatarAttachmentSide: TutorHorizontalSide;
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
  isPanelDragging: boolean;
  isPanelDraggable: boolean;
  narratorControl: KangurAiTutorNarratorControlView;
  onHeaderPointerCancel: (event: PointerEvent<HTMLDivElement>) => void;
  onHeaderPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  onHeaderPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  onHeaderPointerUp: (event: PointerEvent<HTMLDivElement>) => void;
  panelMoodDescription: string;
  panelSurfaceRef: { current: HTMLDivElement | null };
  panelSnapState: TutorPanelSnapState | 'none';
  sessionSurfaceLabel: string | null;
  shouldRenderPanelMoodDescription: boolean;
  shouldTrapFocus: boolean;
  shouldUseMinimalPanelShell: boolean;
  showAttachedAvatarShell: boolean;
  snapPreviewTargetLabel: string | null;
  tutorBehaviorMoodId: string;
  tutorBehaviorMoodLabel: string;
  tutorContent: ReturnType<typeof useKangurAiTutorContent>;
  tutorDisplayName: string;
  tutorNarrationRootRef: { current: HTMLDivElement | null };
  uiMode: string;
};

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
    | 'isContextualResultChrome'
    | 'isFollowingContext'
    | 'isPanelDragging'
    | 'isPanelDraggable'
    | 'narratorControl'
    | 'onHeaderPointerCancel'
    | 'onHeaderPointerDown'
    | 'onHeaderPointerMove'
    | 'onHeaderPointerUp'
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
  > & {
    headerClassName: string;
    isHeaderSectionDragEnabled: boolean;
  }
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
    sessionSurfaceLabel,
    shouldRenderPanelMoodDescription,
    shouldUseMinimalPanelShell,
    snapPreviewTargetLabel,
    tutorBehaviorMoodId,
    tutorBehaviorMoodLabel,
    tutorContent,
    tutorDisplayName,
    uiMode,
    headerClassName,
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
      className={headerClassName}
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

export function KangurAiTutorPanelSurface(props: KangurAiTutorPanelSurfaceProps): JSX.Element {
  const {
    avatarAttachmentSide,
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
    isPanelDragging,
    isPanelDraggable,
    narratorControl,
    onHeaderPointerCancel,
    onHeaderPointerDown,
    onHeaderPointerMove,
    onHeaderPointerUp,
    panelMoodDescription,
    panelSnapState,
    panelSurfaceRef,
    sessionSurfaceLabel,
    shouldRenderPanelMoodDescription,
    shouldTrapFocus,
    shouldUseMinimalPanelShell,
    showAttachedAvatarShell,
    snapPreviewTargetLabel,
    tutorBehaviorMoodId,
    tutorBehaviorMoodLabel,
    tutorContent,
    tutorDisplayName,
    tutorNarrationRootRef,
    uiMode,
  } = props;
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

  return (
    <KangurGlassPanel
      id={KANGUR_AI_TUTOR_PANEL_SURFACE_ID}
      data-testid={panelSurfaceTestId}
      surface='warmGlow'
      variant='soft'
      ref={panelSurfaceRef}
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
        headerClassName={panelHeaderClassName}
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
