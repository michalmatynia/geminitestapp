'use client';

import { useKangurProgressOwnerKey } from '@/features/kangur/ui/hooks/useKangurProgressOwnerKey';
import { useLocale, useTranslations } from 'next-intl';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';

import { KangurDrawingActionRow } from '@/features/kangur/ui/components/drawing-engine/KangurDrawingActionRow';
import { KangurDrawingKeyboardCursorOverlay } from '@/features/kangur/ui/components/drawing-engine/KangurDrawingOverlays';
import { KangurDrawingPracticeBoard } from '@/features/kangur/ui/components/drawing-engine/KangurDrawingPracticeBoard';
import { KangurDrawingStatusRegions } from '@/features/kangur/ui/components/drawing-engine/KangurDrawingStatusRegions';
import {
  createKangurDrawingDraftStorageKey,
  createKangurDrawingExportFilename,
} from '@/features/kangur/ui/components/drawing-engine/drawing-identifiers';
import { KANGUR_DRAWING_HISTORY_ARIA_SHORTCUTS } from '@/features/kangur/ui/components/drawing-engine/keyboard-shortcuts';
import { flattenKangurStrokePoints } from '@/features/kangur/ui/components/drawing-engine/stroke-metrics';
import { useKangurKeyboardPointDrawing } from '@/features/kangur/ui/components/drawing-engine/useKangurKeyboardPointDrawing';
import { useKangurManagedStoredPointDrawing } from '@/features/kangur/ui/components/drawing-engine/useKangurManagedStoredPointDrawing';
import { KangurManagedDrawingUtilityActions } from '@/features/kangur/ui/components/drawing-engine/KangurManagedDrawingUtilityActions';
import {
  KangurButton,
  KangurDisplayEmoji,
  KangurGlassPanel,
  KangurHeadline,
  KangurInfoCard,
  KangurProgressBar,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_ACCENT_STYLES,
  KANGUR_PANEL_GAP_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import type {
  KangurMiniGameInformationalFeedback,
  KangurRewardBreakdownEntry,
} from '@/features/kangur/ui/types';
import { cn } from '@/features/kangur/shared/utils';
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  KEYBOARD_CURSOR_START,
  KEYBOARD_DRAW_STEP,
  ROUNDS,
} from './GeometrySymmetryGame.data';
import {
  clearGeometrySymmetryInfoFeedback,
  drawGeometrySymmetryRoundBackground,
  persistGeometrySymmetryCompletion,
  resolveGeometrySymmetryBoardAccent,
  resolveGeometrySymmetryCheckResult,
  resolveGeometrySymmetryFallbackCopy,
  resolveGeometrySymmetryMinimumDrawingPoints,
  resolveGeometrySymmetryResultLocked,
  resolveGeometrySymmetryRounds,
  resolveGeometrySymmetryTranslateWithFallback,
  type GeometrySymmetryFallbackCopy,
  type GeometrySymmetryFinishProps,
  type GeometrySymmetryTranslateWithFallback,
  type GeometrySymmetryTranslations,
} from './GeometrySymmetryGame.logic';
import { GeometrySymmetrySummaryView } from './GeometrySymmetryGame.summary';
import type { SymmetryRound } from './GeometrySymmetryGame.types';

type GeometrySymmetryGameRuntime = {
  baseLayerCacheKey: string;
  boardAccent: 'amber' | 'emerald' | 'rose';
  canRedo: boolean;
  canUndo: boolean;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  clearDrawing: () => void;
  currentRound: SymmetryRound | undefined;
  done: boolean;
  exportDrawing: () => void;
  exportFileName: string;
  fallbackCopy: GeometrySymmetryFallbackCopy;
  feedback: KangurMiniGameInformationalFeedback | null;
  handleCanvasKeyDown: (event: ReactKeyboardEvent<HTMLCanvasElement>) => void;
  handleCheck: () => void;
  handlePointerDown: (event: React.PointerEvent<HTMLCanvasElement>) => void;
  handlePointerMove: (event: React.PointerEvent<HTMLCanvasElement>) => void;
  handlePointerUp: (event: React.PointerEvent<HTMLCanvasElement>) => void;
  handleRestart: () => void;
  hasDrawableContent: boolean;
  isCoarsePointer: boolean;
  isPointerDrawing: boolean;
  isResultLocked: boolean;
  keyboardCursor: ReturnType<typeof useKangurKeyboardPointDrawing>['keyboardCursor'];
  keyboardDrawing: boolean;
  keyboardStatus: string;
  points: ReturnType<typeof flattenKangurStrokePoints>;
  redoDrawing: () => void;
  resetKeyboard: (status: string) => void;
  resolvedRounds: SymmetryRound[];
  roundIndex: number;
  score: number;
  setFeedback: React.Dispatch<React.SetStateAction<KangurMiniGameInformationalFeedback | null>>;
  setShowMirrorHint: React.Dispatch<React.SetStateAction<boolean>>;
  showMirrorHint: boolean;
  strokeWidth: number;
  totalRounds: number;
  translateWithFallback: GeometrySymmetryTranslateWithFallback;
  translations: GeometrySymmetryTranslations;
  undoDrawing: () => void;
  xpBreakdown: KangurRewardBreakdownEntry[];
  xpEarned: number;
};

type GeometrySymmetryPromptCardProps = {
  currentRound: SymmetryRound | undefined;
  fallbackCopy: GeometrySymmetryFallbackCopy;
  isResultLocked: boolean;
  setShowMirrorHint: React.Dispatch<React.SetStateAction<boolean>>;
  showMirrorHint: boolean;
  translateWithFallback: GeometrySymmetryTranslateWithFallback;
};

const resolveGeometrySymmetryMinimumPointDistance = (isCoarsePointer: boolean): number =>
  isCoarsePointer ? 5 : 2;

const resolveGeometrySymmetryStrokeWidth = (isCoarsePointer: boolean): number =>
  isCoarsePointer ? 7 : 5;

const resolveGeometrySymmetryBaseLayerCacheKey = (
  currentRound: SymmetryRound | undefined,
  showMirrorHint: boolean
): string =>
  currentRound ? `geometry-symmetry:${currentRound.id}:${showMirrorHint ? 'hint' : 'plain'}` : 'geometry-symmetry:empty';

function useGeometrySymmetryRoundAdvance(input: {
  clearDrawing: () => void;
  nextRoundTimeoutRef: React.RefObject<number | null>;
  ownerKey: string;
  roundIndex: number;
  score: number;
  sessionStartedAtRef: React.RefObject<number>;
  setDone: React.Dispatch<React.SetStateAction<boolean>>;
  setFeedback: React.Dispatch<React.SetStateAction<KangurMiniGameInformationalFeedback | null>>;
  setRoundIndex: React.Dispatch<React.SetStateAction<number>>;
  setScore: React.Dispatch<React.SetStateAction<number>>;
  setShowMirrorHint: React.Dispatch<React.SetStateAction<boolean>>;
  setXpBreakdown: React.Dispatch<React.SetStateAction<KangurRewardBreakdownEntry[]>>;
  setXpEarned: React.Dispatch<React.SetStateAction<number>>;
  totalRounds: number;
}): (wasCorrect: boolean) => void {
  const {
    clearDrawing,
    nextRoundTimeoutRef,
    ownerKey,
    roundIndex,
    score,
    sessionStartedAtRef,
    setDone,
    setFeedback,
    setRoundIndex,
    setScore,
    setShowMirrorHint,
    setXpBreakdown,
    setXpEarned,
    totalRounds,
  } = input;

  return useCallback(
    (wasCorrect: boolean): void => {
      const nextScore = wasCorrect ? score + 1 : score;

      if (wasCorrect) {
        setScore(nextScore);
      }

      if (nextRoundTimeoutRef.current !== null) {
        window.clearTimeout(nextRoundTimeoutRef.current);
      }

      const isLastRound = roundIndex + 1 >= totalRounds;
      nextRoundTimeoutRef.current = window.setTimeout((): void => {
        nextRoundTimeoutRef.current = null;
        setFeedback(null);
        clearDrawing();
        setShowMirrorHint(false);

        if (isLastRound) {
          persistGeometrySymmetryCompletion({
            nextScore,
            ownerKey,
            sessionStartedAtRef,
            setDone,
            setXpBreakdown,
            setXpEarned,
            totalRounds,
          });
          return;
        }

        setRoundIndex((current) => current + 1);
      }, 1200);
    },
    [
      clearDrawing,
      nextRoundTimeoutRef,
      ownerKey,
      roundIndex,
      score,
      sessionStartedAtRef,
      setDone,
      setFeedback,
      setRoundIndex,
      setScore,
      setShowMirrorHint,
      setXpBreakdown,
      setXpEarned,
      totalRounds,
    ]
  );
}

function useGeometrySymmetryCheckHandler(input: {
  currentRound: SymmetryRound | undefined;
  done: boolean;
  fallbackCopy: GeometrySymmetryFallbackCopy;
  feedback: KangurMiniGameInformationalFeedback | null;
  locale: string;
  minDrawingPoints: number;
  moveToNextRound: (wasCorrect: boolean) => void;
  points: ReturnType<typeof flattenKangurStrokePoints>;
  setFeedback: React.Dispatch<React.SetStateAction<KangurMiniGameInformationalFeedback | null>>;
  translateWithFallback: GeometrySymmetryTranslateWithFallback;
  translations: GeometrySymmetryTranslations;
}): () => void {
  const {
    currentRound,
    done,
    fallbackCopy,
    feedback,
    locale,
    minDrawingPoints,
    moveToNextRound,
    points,
    setFeedback,
    translateWithFallback,
    translations,
  } = input;

  return useCallback((): void => {
    if (done || feedback) {
      return;
    }

    const result = resolveGeometrySymmetryCheckResult({
      currentRound,
      fallbackCopy,
      locale,
      minDrawingPoints,
      points,
      translateWithFallback,
      translations,
    });

    if (!result) {
      return;
    }

    setFeedback(result.feedback);
    if (result.feedback.kind === 'info') {
      return;
    }

    moveToNextRound(result.accepted);
  }, [
    currentRound,
    done,
    fallbackCopy,
    feedback,
    locale,
    minDrawingPoints,
    moveToNextRound,
    points,
    setFeedback,
    translateWithFallback,
    translations,
  ]);
}

function useGeometrySymmetryGameRuntime(input: {
  isCoarsePointer: boolean;
  locale: string;
  ownerKey: string;
  translations: GeometrySymmetryTranslations;
}): GeometrySymmetryGameRuntime {
  const { isCoarsePointer, locale, ownerKey, translations } = input;
  const fallbackCopy = useMemo(() => resolveGeometrySymmetryFallbackCopy(locale), [locale]);
  const translateWithFallback = useCallback(
    resolveGeometrySymmetryTranslateWithFallback({
      translations,
    }),
    [translations]
  );
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sessionStartedAtRef = useRef(Date.now());
  const nextRoundTimeoutRef = useRef<number | null>(null);
  const resolvedRounds = useMemo(
    () =>
      resolveGeometrySymmetryRounds({
        fallbackCopy,
        rounds: ROUNDS,
        translations,
      }),
    [fallbackCopy, translations]
  );
  const [roundIndex, setRoundIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [xpBreakdown, setXpBreakdown] = useState<KangurRewardBreakdownEntry[]>([]);
  const [feedback, setFeedback] = useState<KangurMiniGameInformationalFeedback | null>(null);
  const [showMirrorHint, setShowMirrorHint] = useState(false);

  const totalRounds = resolvedRounds.length;
  const currentRound = resolvedRounds[roundIndex];
  const minPointDistance = resolveGeometrySymmetryMinimumPointDistance(isCoarsePointer);
  const minDrawingPoints = resolveGeometrySymmetryMinimumDrawingPoints(isCoarsePointer);
  const strokeWidth = resolveGeometrySymmetryStrokeWidth(isCoarsePointer);
  const baseLayerCacheKey = resolveGeometrySymmetryBaseLayerCacheKey(currentRound, showMirrorHint);
  const exportFileName = useMemo(
    () => createKangurDrawingExportFilename('geometry-symmetry', currentRound?.id ?? 'drawing'),
    [currentRound?.id]
  );
  const keyboardReadyStatus = translateWithFallback(
    'geometrySymmetry.inRound.keyboard.ready',
    fallbackCopy.keyboard.ready
  );
  const keyboardStartedStatus = translateWithFallback(
    'geometrySymmetry.inRound.keyboard.started',
    fallbackCopy.keyboard.started
  );
  const keyboardFinishedStatus = translateWithFallback(
    'geometrySymmetry.inRound.keyboard.finished',
    fallbackCopy.keyboard.finished
  );
  const keyboardClearedStatus = translateWithFallback(
    'geometrySymmetry.inRound.keyboard.cleared',
    fallbackCopy.keyboard.cleared
  );
  const keyboardBoardClearedStatus = translateWithFallback(
    'geometrySymmetry.inRound.keyboard.boardCleared',
    fallbackCopy.keyboard.boardCleared
  );
  const keyboardRestartedStatus = translateWithFallback(
    'geometrySymmetry.inRound.keyboard.restarted',
    fallbackCopy.keyboard.restarted
  );
  const keyboardCanvasKeyDownRef = useRef<
    ((event: ReactKeyboardEvent<HTMLCanvasElement>) => void) | null
  >(null);
  const resetKeyboardRef = useRef<((status: string) => void) | null>(null);
  const handleManagedUnhandledKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLCanvasElement>): void => {
      keyboardCanvasKeyDownRef.current?.(event);
    },
    []
  );
  const handleManagedAfterClearExtra = useCallback((): void => {
    resetKeyboardRef.current?.(keyboardBoardClearedStatus);
  }, [keyboardBoardClearedStatus]);
  const {
    canRedo,
    canUndo,
    clearDraftSnapshot,
    clearStrokes,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    hasDrawableContent,
    isPointerDrawing,
    setStrokes,
    strokes,
    clearDrawing,
    exportDrawing,
    handleCanvasKeyDown,
    redoDrawing,
    undoDrawing,
  } = useKangurManagedStoredPointDrawing({
    actions: {
      clearFeedback: () => {
        setFeedback(null);
      },
      exportFilename: exportFileName,
      onAfterClearExtra: handleManagedAfterClearExtra,
      onUnhandledKeyDown: handleManagedUnhandledKeyDown,
    },
    drawing: {
      canvasRef,
      backgroundFill: '#ffffff',
      baseLayerCacheKey,
      beforeStrokes: (ctx) =>
        drawGeometrySymmetryRoundBackground({
          ctx,
          currentRound,
          showMirrorHint,
        }),
      enabled: !(done || resolveGeometrySymmetryResultLocked(feedback)),
      logicalHeight: CANVAS_HEIGHT,
      logicalWidth: CANVAS_WIDTH,
      minPointDistance,
      onPointerStart: () => clearGeometrySymmetryInfoFeedback({ feedback, setFeedback }),
      resolveStyle: () => ({
        lineWidth: strokeWidth,
        strokeStyle: '#0f172a',
      }),
      storageKey: createKangurDrawingDraftStorageKey('geometry-symmetry', currentRound?.id),
      touchLockEnabled: isCoarsePointer,
    },
  });
  const points = useMemo(() => flattenKangurStrokePoints(strokes), [strokes]);

  useEffect(() => {
    return () => {
      if (nextRoundTimeoutRef.current !== null) {
        window.clearTimeout(nextRoundTimeoutRef.current);
      }
    };
  }, []);
  const clearBoardState = useCallback((): void => {
    clearDraftSnapshot();
    clearStrokes();
    setFeedback(null);
  }, [clearDraftSnapshot, clearStrokes]);

  const {
    handleCanvasKeyDown: handleKeyboardCanvasKeyDown,
    keyboardCursor,
    keyboardDrawing,
    keyboardStatus,
    resetKeyboard,
  } = useKangurKeyboardPointDrawing({
    clearedStatus: keyboardClearedStatus,
    disabled: done || resolveGeometrySymmetryResultLocked(feedback),
    finishedStatus: keyboardFinishedStatus,
    height: CANVAS_HEIGHT,
    initialCursor: KEYBOARD_CURSOR_START,
    onBeforeKeyboardAction: () => clearGeometrySymmetryInfoFeedback({ feedback, setFeedback }),
    onEscape: clearBoardState,
    readyStatus: keyboardReadyStatus,
    setStrokes,
    startedStatus: keyboardStartedStatus,
    step: KEYBOARD_DRAW_STEP,
    width: CANVAS_WIDTH,
  });
  keyboardCanvasKeyDownRef.current = handleKeyboardCanvasKeyDown;
  resetKeyboardRef.current = resetKeyboard;

  const moveToNextRound = useGeometrySymmetryRoundAdvance({
    clearDrawing,
    nextRoundTimeoutRef,
    ownerKey,
    roundIndex,
    score,
    sessionStartedAtRef,
    setDone,
    setFeedback,
    setRoundIndex,
    setScore,
    setShowMirrorHint,
    setXpBreakdown,
    setXpEarned,
    totalRounds,
  });

  const handleCheck = useGeometrySymmetryCheckHandler({
    currentRound,
    done,
    fallbackCopy,
    feedback,
    locale,
    minDrawingPoints,
    moveToNextRound,
    points,
    setFeedback,
    translateWithFallback,
    translations,
  });

  const handleRestart = (): void => {
    setRoundIndex(0);
    setScore(0);
    setDone(false);
    setXpEarned(0);
    setXpBreakdown([]);
    setFeedback(null);
    setShowMirrorHint(false);
    clearBoardState();
    resetKeyboard(keyboardRestartedStatus);
    sessionStartedAtRef.current = Date.now();
  };

  return {
    baseLayerCacheKey,
    boardAccent: resolveGeometrySymmetryBoardAccent(feedback),
    canRedo,
    canUndo,
    canvasRef,
    clearDrawing,
    currentRound,
    done,
    exportDrawing,
    exportFileName,
    fallbackCopy,
    feedback,
    handleCanvasKeyDown,
    handleCheck,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleRestart,
    hasDrawableContent,
    isCoarsePointer,
    isPointerDrawing,
    isResultLocked: resolveGeometrySymmetryResultLocked(feedback),
    keyboardCursor,
    keyboardDrawing,
    keyboardStatus,
    points,
    redoDrawing,
    resetKeyboard,
    resolvedRounds,
    roundIndex,
    score,
    setFeedback,
    setShowMirrorHint,
    showMirrorHint,
    strokeWidth,
    totalRounds,
    translateWithFallback,
    translations,
    undoDrawing,
    xpBreakdown,
    xpEarned,
  };
}

function GeometrySymmetryProgressHeader(props: {
  currentRound: SymmetryRound | undefined;
  fallbackCopy: GeometrySymmetryFallbackCopy;
  keyboardStatus: string;
  roundIndex: number;
  totalRounds: number;
  translateWithFallback: ReturnType<typeof resolveGeometrySymmetryTranslateWithFallback>;
}): React.JSX.Element {
  const { currentRound, fallbackCopy, keyboardStatus, roundIndex, totalRounds, translateWithFallback } =
    props;

  return (
    <>
      <KangurDrawingStatusRegions
        keyboardStatus={keyboardStatus}
        keyboardStatusTestId='geometry-symmetry-keyboard-status'
        liveMessage={translateWithFallback(
          'geometrySymmetry.inRound.liveRegion',
          fallbackCopy.liveRegion,
          { current: roundIndex + 1, total: totalRounds, prompt: currentRound?.prompt ?? '' }
        )}
      />

      <div className='w-full flex items-center kangur-panel-gap'>
        <KangurProgressBar
          accent='emerald'
          aria-label={translateWithFallback(
            'geometrySymmetry.progressAriaLabel',
            fallbackCopy.progressAriaLabel
          )}
          aria-valuetext={translateWithFallback(
            'geometrySymmetry.inRound.progressValueText',
            fallbackCopy.progressValueText,
            { current: roundIndex + 1, total: totalRounds }
          )}
          className='flex-1'
          data-testid='geometry-symmetry-progress-bar'
          size='sm'
          value={(roundIndex / totalRounds) * 100}
        />
        <KangurStatusChip
          accent='emerald'
          className='shrink-0'
          data-testid='geometry-symmetry-progress-label'
          size='sm'
        >
          {roundIndex + 1}/{totalRounds}
        </KangurStatusChip>
      </div>
    </>
  );
}

function GeometrySymmetryModeChip(props: {
  currentRound: SymmetryRound | undefined;
  fallbackCopy: GeometrySymmetryFallbackCopy;
  translateWithFallback: GeometrySymmetryTranslateWithFallback;
}): React.JSX.Element {
  const { currentRound, fallbackCopy, translateWithFallback } = props;
  const modeKey =
    currentRound?.type === 'axis'
      ? 'geometrySymmetry.inRound.mode.axis'
      : 'geometrySymmetry.inRound.mode.mirror';
  const fallbackModeLabel =
    currentRound?.type === 'axis' ? fallbackCopy.mode.axis : fallbackCopy.mode.mirror;

  return (
    <KangurStatusChip accent='emerald' size='sm'>
      {translateWithFallback('geometrySymmetry.inRound.modeLabel', fallbackCopy.modeLabel, {
        mode: translateWithFallback(modeKey, fallbackModeLabel),
      })}
    </KangurStatusChip>
  );
}

function GeometrySymmetryMirrorHintControls(
  props: GeometrySymmetryPromptCardProps
): React.JSX.Element | null {
  const {
    currentRound,
    fallbackCopy,
    isResultLocked,
    setShowMirrorHint,
    showMirrorHint,
    translateWithFallback,
  } = props;

  if (currentRound?.type !== 'mirror') {
    return null;
  }

  const toggleLabel = showMirrorHint
    ? translateWithFallback('geometrySymmetry.inRound.mirror.hideHint', fallbackCopy.mirror.hideHint)
    : translateWithFallback('geometrySymmetry.inRound.mirror.showHint', fallbackCopy.mirror.showHint);

  return (
    <>
      <p className='text-[11px] text-center text-emerald-700/80'>
        {translateWithFallback(
          'geometrySymmetry.inRound.mirror.zoneHint',
          fallbackCopy.mirror.zoneHint
        )}
      </p>
      <div className='mt-1 flex flex-wrap items-center justify-center gap-2'>
        <KangurButton
          size='sm'
          type='button'
          variant='surface'
          disabled={isResultLocked}
          onClick={() => setShowMirrorHint((current) => !current)}
        >
          {toggleLabel}
        </KangurButton>
        {showMirrorHint ? (
          <span className='text-[11px] font-semibold text-emerald-700'>
            {translateWithFallback(
              'geometrySymmetry.inRound.mirror.ghostHint',
              fallbackCopy.mirror.ghostHint
            )}
          </span>
        ) : null}
      </div>
    </>
  );
}

function GeometrySymmetryPromptCard(props: GeometrySymmetryPromptCardProps): React.JSX.Element {
  const { currentRound, fallbackCopy, translateWithFallback } = props;

  return (
    <KangurInfoCard
      accent='emerald'
      className='flex w-full flex-col items-center kangur-panel-gap rounded-[24px] text-center'
      data-testid='geometry-symmetry-prompt-card'
      padding='md'
      tone='accent'
    >
      <GeometrySymmetryModeChip
        currentRound={currentRound}
        fallbackCopy={fallbackCopy}
        translateWithFallback={translateWithFallback}
      />
      <KangurDisplayEmoji size='md'>{currentRound?.emoji}</KangurDisplayEmoji>
      <KangurHeadline accent='emerald' as='h3' id='geometry-symmetry-heading' size='sm'>
        {currentRound?.title}
      </KangurHeadline>
      <p className='text-sm text-center [color:var(--kangur-page-muted-text)]'>
        {currentRound?.prompt}
      </p>
      <p className='text-xs text-center text-emerald-700'>{currentRound?.hint}</p>
      <GeometrySymmetryMirrorHintControls {...props} />
    </KangurInfoCard>
  );
}

function GeometrySymmetryPracticeBoardPanel(props: {
  boardAccent: 'amber' | 'emerald' | 'rose';
  canRedo: boolean;
  canUndo: boolean;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  clearDrawing: () => void;
  exportDrawing: () => void;
  fallbackCopy: GeometrySymmetryFallbackCopy;
  feedback: KangurMiniGameInformationalFeedback | null;
  handleCanvasKeyDown: (event: ReactKeyboardEvent<HTMLCanvasElement>) => void;
  handleCheck: () => void;
  handlePointerDown: (event: React.PointerEvent<HTMLCanvasElement>) => void;
  handlePointerMove: (event: React.PointerEvent<HTMLCanvasElement>) => void;
  handlePointerUp: (event: React.PointerEvent<HTMLCanvasElement>) => void;
  hasDrawableContent: boolean;
  isCoarsePointer: boolean;
  isPointerDrawing: boolean;
  isResultLocked: boolean;
  keyboardCursor: ReturnType<typeof useKangurKeyboardPointDrawing>['keyboardCursor'];
  keyboardDrawing: boolean;
  points: ReturnType<typeof flattenKangurStrokePoints>;
  redoDrawing: () => void;
  translateWithFallback: ReturnType<typeof resolveGeometrySymmetryTranslateWithFallback>;
  undoDrawing: () => void;
}): React.JSX.Element {
  const {
    boardAccent,
    canRedo,
    canUndo,
    canvasRef,
    clearDrawing,
    exportDrawing,
    fallbackCopy,
    feedback,
    handleCanvasKeyDown,
    handleCheck,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    hasDrawableContent,
    isCoarsePointer,
    isPointerDrawing,
    isResultLocked,
    keyboardCursor,
    keyboardDrawing,
    points,
    redoDrawing,
    translateWithFallback,
    undoDrawing,
  } = props;

  return (
    <KangurDrawingPracticeBoard
      accent={boardAccent}
      actionRow={
        <KangurDrawingActionRow
          clearDisabled={isResultLocked || (points.length === 0 && feedback === null)}
          clearLabel={translateWithFallback(
            'geometrySymmetry.inRound.clear',
            fallbackCopy.clear
          )}
          feedback={feedback}
          utilityActions={
            <KangurManagedDrawingUtilityActions
              canExport={hasDrawableContent}
              canRedo={canRedo}
              canUndo={canUndo}
              exportLabel={translateWithFallback(
                'geometrySymmetry.inRound.export',
                'Export PNG'
              )}
              exportTestId='geometry-symmetry-export'
              historyLocked={isResultLocked}
              isCoarsePointer={isCoarsePointer}
              layoutPreset='practice-board'
              onExport={exportDrawing}
              onRedo={redoDrawing}
              onUndo={undoDrawing}
              redoLabel={translateWithFallback('geometrySymmetry.inRound.redo', 'Ponów')}
              undoLabel={translateWithFallback('geometrySymmetry.inRound.undo', 'Cofnij')}
            />
          }
          isCoarsePointer={isCoarsePointer}
          onClear={clearDrawing}
          onPrimary={handleCheck}
          primaryDisabled={isResultLocked}
          primaryLabel={translateWithFallback(
            'geometrySymmetry.inRound.check',
            fallbackCopy.check
          )}
        />
      }
      afterCanvas={
        <KangurDrawingKeyboardCursorOverlay
          accentClassName='border-emerald-400/80 bg-emerald-100/70 shadow-[0_0_0_3px_rgba(16,185,129,0.12)]'
          cursor={keyboardCursor}
          height={CANVAS_HEIGHT}
          isCoarsePointer={isCoarsePointer}
          isDrawing={keyboardDrawing}
          width={CANVAS_WIDTH}
        />
      }
      ariaDescribedBy='geometry-symmetry-input-help'
      ariaKeyShortcuts={`Enter Space ArrowUp ArrowDown ArrowLeft ArrowRight Escape ${KANGUR_DRAWING_HISTORY_ARIA_SHORTCUTS}`}
      ariaLabel={translateWithFallback(
        'geometrySymmetry.inRound.canvasAria',
        fallbackCopy.canvasAria
      )}
      boardClassName={cn(
        'relative w-full overflow-hidden rounded-[26px] p-0',
        !feedback && KANGUR_ACCENT_STYLES.emerald.hoverCard,
        isCoarsePointer && 'shadow-[0_18px_38px_-30px_rgba(16,185,129,0.35)]',
        isPointerDrawing && 'ring-2 ring-emerald-300/70 ring-offset-2 ring-offset-white'
      )}
      boardDataTestId='geometry-symmetry-board'
      canvasDataTestId='geometry-symmetry-canvas'
      canvasRef={canvasRef}
      canvasStyle={{ background: 'var(--kangur-soft-card-background)' }}
      feedback={feedback}
      feedbackBeforeActions
      feedbackTestId='geometry-symmetry-feedback'
      height={CANVAS_HEIGHT}
      helpId='geometry-symmetry-input-help'
      helpTestId='geometry-symmetry-input-help'
      helpText={translateWithFallback(
        'geometrySymmetry.inRound.inputHelp',
        fallbackCopy.inputHelp
      )}
      isCoarsePointer={isCoarsePointer}
      isPointerDrawing={isPointerDrawing}
      onKeyDown={handleCanvasKeyDown}
      onPointerCancel={handlePointerUp}
      onPointerDown={handlePointerDown}
      onPointerLeave={handlePointerUp}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      width={CANVAS_WIDTH}
    />
  );
}

function GeometrySymmetryRoundView(props: GeometrySymmetryGameRuntime): React.JSX.Element {
  const {
    boardAccent,
    canRedo,
    canUndo,
    canvasRef,
    clearDrawing,
    currentRound,
    exportDrawing,
    fallbackCopy,
    feedback,
    handleCanvasKeyDown,
    handleCheck,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    hasDrawableContent,
    isCoarsePointer,
    isPointerDrawing,
    isResultLocked,
    keyboardCursor,
    keyboardDrawing,
    keyboardStatus,
    points,
    redoDrawing,
    roundIndex,
    setShowMirrorHint,
    showMirrorHint,
    totalRounds,
    translateWithFallback,
    undoDrawing,
  } = props;

  return (
    <section
      aria-labelledby='geometry-symmetry-heading'
      className={`flex flex-col items-center w-full max-w-sm mx-auto ${KANGUR_PANEL_GAP_CLASSNAME}`}
    >
      <GeometrySymmetryProgressHeader
        currentRound={currentRound}
        fallbackCopy={fallbackCopy}
        keyboardStatus={keyboardStatus}
        roundIndex={roundIndex}
        totalRounds={totalRounds}
        translateWithFallback={translateWithFallback}
      />

      <div className='w-full'>
        <KangurGlassPanel
          className='flex flex-col items-center kangur-panel-gap'
          data-testid='geometry-symmetry-round-shell'
          padding='lg'
          surface='solid'
          variant='soft'
        >
          <GeometrySymmetryPromptCard
            currentRound={currentRound}
            fallbackCopy={fallbackCopy}
            isResultLocked={isResultLocked}
            setShowMirrorHint={setShowMirrorHint}
            showMirrorHint={showMirrorHint}
            translateWithFallback={translateWithFallback}
          />

          <GeometrySymmetryPracticeBoardPanel
            boardAccent={boardAccent}
            canRedo={canRedo}
            canUndo={canUndo}
            canvasRef={canvasRef}
            clearDrawing={clearDrawing}
            exportDrawing={exportDrawing}
            fallbackCopy={fallbackCopy}
            feedback={feedback}
            handleCanvasKeyDown={handleCanvasKeyDown}
            handleCheck={handleCheck}
            handlePointerDown={handlePointerDown}
            handlePointerMove={handlePointerMove}
            handlePointerUp={handlePointerUp}
            hasDrawableContent={hasDrawableContent}
            isCoarsePointer={isCoarsePointer}
            isPointerDrawing={isPointerDrawing}
            isResultLocked={isResultLocked}
            keyboardCursor={keyboardCursor}
            keyboardDrawing={keyboardDrawing}
            points={points}
            redoDrawing={redoDrawing}
            translateWithFallback={translateWithFallback}
            undoDrawing={undoDrawing}
          />
        </KangurGlassPanel>
      </div>
    </section>
  );
}

export default function GeometrySymmetryGame({
  onFinish,
}: GeometrySymmetryFinishProps): React.JSX.Element {
  const ownerKey = useKangurProgressOwnerKey();
  const locale = useLocale();
  const translations = useTranslations('KangurMiniGames');
  const handleFinish = onFinish;
  const isCoarsePointer = useKangurCoarsePointer();
  const runtime = useGeometrySymmetryGameRuntime({
    isCoarsePointer,
    locale,
    ownerKey: ownerKey ?? '',
    translations,
  });

  if (runtime.done) {
    return (
      <GeometrySymmetrySummaryView
        handleFinish={handleFinish}
        handleRestart={runtime.handleRestart}
        score={runtime.score}
        totalRounds={runtime.totalRounds}
        translations={translations}
        xpBreakdown={runtime.xpBreakdown}
        xpEarned={runtime.xpEarned}
      />
    );
  }

  return <GeometrySymmetryRoundView {...runtime} />;
}
