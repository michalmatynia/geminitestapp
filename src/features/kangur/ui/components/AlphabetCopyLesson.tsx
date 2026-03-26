'use client';

import { useId, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useTranslations } from 'next-intl';

import {
  computeKangurTotalStrokeLength,
  flattenKangurStrokePoints,
} from '@/features/kangur/ui/components/drawing-engine/stroke-metrics';
import { KANGUR_DRAWING_HISTORY_ARIA_SHORTCUTS } from '@/features/kangur/ui/components/drawing-engine/keyboard-shortcuts';
import { KangurTracingLessonFooter } from '@/features/kangur/ui/components/drawing-engine/KangurTracingLessonFooter';
import { KangurTracingBoard } from '@/features/kangur/ui/components/drawing-engine/KangurTracingBoard';
import {
  evaluateKangurTracingAttempt,
  getKangurTracingCanvasConfig,
} from '@/features/kangur/ui/components/drawing-engine/tracing';
import { useKangurDrawingDraftStorage } from '@/features/kangur/ui/components/drawing-engine/useKangurDrawingDraftStorage';
import { useKangurFeedbackManagedDrawingActions } from '@/features/kangur/ui/components/drawing-engine/useKangurFeedbackManagedDrawingActions';
import { useKangurPointCanvasDrawing } from '@/features/kangur/ui/components/drawing-engine/useKangurPointCanvasDrawing';
import { KangurManagedDrawingUtilityActions } from '@/features/kangur/ui/components/drawing-engine/KangurManagedDrawingUtilityActions';
import {
  KangurGlassPanel,
  KangurHeadline,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import { KANGUR_STACK_ROOMY_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import type {
  KangurIntlTranslate,
  KangurMiniGameFeedbackState,
} from '@/features/kangur/ui/types';
import type { Point2d } from '@/shared/contracts/geometry';
import type { TranslationValues } from 'use-intl';

const CANVAS_WIDTH = 360;
const CANVAS_HEIGHT = 260;
const COPY_ZONE_TOP = 120;
const COPY_ZONE_BOTTOM = 230;
const GUIDE_LINE_START_X = 28;
const GUIDE_LINE_END_X = CANVAS_WIDTH - 28;
const MIDLINE_Y = 170;
const BASELINE_Y = 210;
const BASE_MIN_DRAWING_POINTS = 20;
const BASE_MIN_DRAWING_LENGTH = 160;

type Translate = KangurIntlTranslate;

type LetterRound = {
  id: string;
  label: string;
  word: string;
  accent: 'amber' | 'rose' | 'sky';
  guideColor: string;
  inkColor: string;
};

const LETTER_ROUNDS: LetterRound[] = [
  {
    id: 'L',
    label: 'L',
    word: 'lew',
    accent: 'amber',
    guideColor: '#fde68a',
    inkColor: '#f59e0b',
  },
  {
    id: 'O',
    label: 'O',
    word: 'oko',
    accent: 'rose',
    guideColor: '#fecdd3',
    inkColor: '#fb7185',
  },
  {
    id: 'M',
    label: 'M',
    word: 'mis',
    accent: 'sky',
    guideColor: '#bae6fd',
    inkColor: '#38bdf8',
  },
];

const translateAlphabetCopy = (
  translate: Translate,
  key: string,
  fallback: string,
  values?: TranslationValues
): string => {
  const translated = translate(key, values);
  return translated === key || translated.endsWith(`.${key}`) ? fallback : translated;
};

const isPointInCopyZone = (point: Point2d): boolean => point.y >= COPY_ZONE_TOP;

export function AlphabetCopyGuideSurface({
  guideColor,
  inkColor,
  letter,
  word,
  writeHereLabel,
}: {
  guideColor: string;
  inkColor: string;
  letter: string;
  word: string;
  writeHereLabel: string;
}): React.JSX.Element {
  const baseId = useId().replace(/:/g, '');
  const clipId = `alphabet-copy-guide-${baseId}-clip`;
  const panelGradientId = `alphabet-copy-guide-${baseId}-panel`;
  const frameGradientId = `alphabet-copy-guide-${baseId}-frame`;

  return (
    <svg
      viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
      className='absolute inset-0 h-full w-full'
      aria-hidden='true'
      data-testid='alphabet-copy-guide-animation'
    >
      <defs>
        <clipPath id={clipId}>
          <rect x='0' y='0' width={CANVAS_WIDTH} height={CANVAS_HEIGHT} rx='28' />
        </clipPath>
        <linearGradient id={panelGradientId} x1='0' x2='1' y1='0' y2='1'>
          <stop offset='0%' stopColor='#fef3c7' />
          <stop offset='55%' stopColor='#e0f2fe' />
          <stop offset='100%' stopColor='#fae8ff' />
        </linearGradient>
        <linearGradient id={frameGradientId} x1='0' x2='1' y1='0' y2='0'>
          <stop offset='0%' stopColor='rgba(245,158,11,0.78)' />
          <stop offset='50%' stopColor='rgba(56,189,248,0.82)' />
          <stop offset='100%' stopColor='rgba(244,114,182,0.82)' />
        </linearGradient>
      </defs>
      <g clipPath={`url(#${clipId})`} data-testid='alphabet-copy-guide-atmosphere'>
        <rect width={CANVAS_WIDTH} height={CANVAS_HEIGHT} fill={`url(#${panelGradientId})`} />
        <rect
          y={COPY_ZONE_TOP}
          width={CANVAS_WIDTH}
          height={COPY_ZONE_BOTTOM - COPY_ZONE_TOP}
          fill='#ffffff'
          opacity='0.72'
        />
        <line
          x1={GUIDE_LINE_START_X}
          x2={GUIDE_LINE_END_X}
          y1={COPY_ZONE_TOP}
          y2={COPY_ZONE_TOP}
          className='copy-divider'
        />
        <line
          x1={GUIDE_LINE_START_X}
          x2={GUIDE_LINE_END_X}
          y1={MIDLINE_Y}
          y2={MIDLINE_Y}
          className='copy-midline'
          stroke={guideColor}
        />
        <line
          x1={GUIDE_LINE_START_X}
          x2={GUIDE_LINE_END_X}
          y1={BASELINE_Y}
          y2={BASELINE_Y}
          className='copy-baseline'
          stroke={inkColor}
        />
        <text
          x={CANVAS_WIDTH / 2}
          y={88}
          textAnchor='middle'
          className='target-letter'
          fill={inkColor}
          fontSize='96'
          fontWeight='800'
        >
          {letter}
        </text>
        <text
          x={CANVAS_WIDTH / 2}
          y={110}
          textAnchor='middle'
          className='target-word'
          fill='#0f172a'
          fontSize='16'
          fontWeight='600'
          opacity='0.6'
        >
          {word}
        </text>
        <text
          x={CANVAS_WIDTH / 2}
          y={COPY_ZONE_TOP + 20}
          textAnchor='middle'
          fill='#0f172a'
          fontSize='12'
          fontWeight='600'
          opacity='0.35'
        >
          {writeHereLabel}
        </text>
      </g>
      <rect
        x='10'
        y='10'
        width={CANVAS_WIDTH - 20}
        height={CANVAS_HEIGHT - 20}
        rx='24'
        fill='none'
        stroke={`url(#${frameGradientId})`}
        strokeWidth='1.75'
        data-testid='alphabet-copy-guide-frame'
      />
    </svg>
  );
}

export default function AlphabetCopyLesson(): React.JSX.Element {
  const translations = useTranslations('KangurStaticLessons.alphabetCopy');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [roundIndex, setRoundIndex] = useState(0);
  const [feedback, setFeedback] = useState<KangurMiniGameFeedbackState>(null);
  const isCoarsePointer = useKangurCoarsePointer();

  const currentRound = (LETTER_ROUNDS[roundIndex] ?? LETTER_ROUNDS[0]) as LetterRound;
  const totalRounds = LETTER_ROUNDS.length;
  const currentWord = translateAlphabetCopy(
    translations,
    `rounds.${currentRound.id}.word`,
    currentRound.word
  );
  const tracingCanvasConfig = useMemo(
    () =>
      getKangurTracingCanvasConfig(isCoarsePointer, {
        fineMinDrawingLength: BASE_MIN_DRAWING_LENGTH,
        fineMinDrawingPoints: BASE_MIN_DRAWING_POINTS,
      }),
    [isCoarsePointer]
  );
  const {
    clearDraftSnapshot,
    draftSnapshot,
    setDraftSnapshot,
  } = useKangurDrawingDraftStorage(`alphabet-copy:${currentRound.id}`);
  const {
    canRedo,
    canUndo,
    clearStrokes,
    exportDataUrl,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    hasDrawableContent,
    isPointerDrawing,
    redoLastStroke,
    strokes,
    undoLastStroke,
  } = useKangurPointCanvasDrawing({
    canvasRef,
    enabled: feedback?.kind !== 'success',
    initialSerializedSnapshot: draftSnapshot,
    logicalHeight: CANVAS_HEIGHT,
    logicalWidth: CANVAS_WIDTH,
    minPointDistance: tracingCanvasConfig.minPointDistance,
    onSerializedSnapshotChange: setDraftSnapshot,
    onPointerStart: () => {
      if (feedback?.kind === 'error') {
        setFeedback(null);
      }
    },
    onStartRejected: () => {
      setFeedback({
        kind: 'error',
        text: translateAlphabetCopy(
          translations,
          'feedback.error.keepToLowerLines',
          'Rysuj pod litera, na dolnych liniach.'
        ),
      });
    },
    resolveStyle: () => tracingCanvasConfig.strokeStyle,
    shouldAddPoint: ({ point }) => isPointInCopyZone(point),
    shouldStartStroke: ({ point }) => isPointInCopyZone(point),
    touchLockEnabled: isCoarsePointer,
  });
  const points = useMemo(() => flattenKangurStrokePoints(strokes), [strokes]);
  const strokeLength = useMemo(() => computeKangurTotalStrokeLength(strokes), [strokes]);
  const drawHint = isCoarsePointer
    ? translateAlphabetCopy(
        translations,
        'drawHint.coarse',
        'Przepisuj litere palcem na dolnych liniach'
      )
    : translateAlphabetCopy(
        translations,
        'drawHint.fine',
        'Przepisuj litere na dolnych liniach'
      );
  const traceHint = translateAlphabetCopy(
    translations,
    'footer.traceHint',
    'Trzymaj sie linii i nie spiesz sie.'
  );
  const touchHint = isPointerDrawing
    ? traceHint
    : drawHint;
  const pointsLabel = translateAlphabetCopy(
    translations,
    'footer.points',
    '{count} punktow',
    { count: points.length }
  );

  const canvasSurfaceStyle = useMemo<CSSProperties>(
    () =>
      ({
        aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}`,
        '--copy-zone-top': `${COPY_ZONE_TOP}px`,
        '--copy-zone-bottom': `${COPY_ZONE_BOTTOM}px`,
        '--baseline-y': `${BASELINE_Y}px`,
        '--midline-y': `${MIDLINE_Y}px`,
        '--guide-color': currentRound.inkColor,
      }) as CSSProperties,
    [currentRound.inkColor]
  );

  const {
    clearDrawing,
    exportDrawing,
    handleCanvasKeyDown,
    redoDrawing,
    undoDrawing,
  } = useKangurFeedbackManagedDrawingActions<HTMLCanvasElement>({
    canExport: hasDrawableContent,
    canRedo,
    canUndo,
    clearDraftSnapshot,
    clearFeedback: () => {
      setFeedback(null);
    },
    clearStrokes,
    exportDataUrl,
    exportFilename: `alphabet-copy-${currentRound.id}.png`,
    redoLastStroke,
    undoLastStroke,
  });

  const evaluateDrawing = (): KangurMiniGameFeedbackState => {
    return evaluateKangurTracingAttempt({
      keepGoingText: translateAlphabetCopy(
        translations,
        'feedback.error.keepGoing',
        'Super start! Dorysuj jeszcze kawalek litery.'
      ),
      minDrawingLength: tracingCanvasConfig.minDrawingLength,
      minDrawingPoints: tracingCanvasConfig.minDrawingPoints,
      pointCount: points.length,
      strokeLength,
      successText: translateAlphabetCopy(
        translations,
        'feedback.success',
        'Brawo! Litera {letter} gotowa.',
        { letter: currentRound.label }
      ),
      tooShortText: translateAlphabetCopy(
        translations,
        'feedback.error.copyMore',
        'Przepisz litere na dole i sprobuj jeszcze raz.'
      ),
    });
  };

  const handleCheck = (): void => {
    setFeedback(evaluateDrawing());
  };

  const handleNext = (): void => {
    const nextIndex = roundIndex + 1;
    setRoundIndex(nextIndex >= totalRounds ? 0 : nextIndex);
    clearDrawing();
  };

  return (
    <div className={`${KANGUR_STACK_ROOMY_CLASSNAME} w-full items-center`}>
      <KangurGlassPanel className='w-full max-w-3xl' padding='lg' surface='playField'>
        <div className='flex flex-wrap items-start justify-between gap-4'>
          <div className='min-w-0'>
            <KangurHeadline accent='amber' as='h2' size='sm'>
              {translateAlphabetCopy(translations, 'header.title', 'Alphabet')}
            </KangurHeadline>
            <p className='mt-2 text-sm text-slate-600'>
              {translateAlphabetCopy(
                translations,
                'header.description',
                'Track: Przepisz litery. Cwicz plynnosc pisania pod wzorem. To gra dla 6-latkow.'
              )}
            </p>
          </div>
          <div className='flex flex-col items-end gap-2'>
            <KangurStatusChip accent={currentRound.accent} size='sm'>
              {translateAlphabetCopy(
                translations,
                'header.roundBadge',
                'Litera {letter}',
                { letter: currentRound.label }
              )}
            </KangurStatusChip>
            <span className='text-xs text-slate-500'>
              {roundIndex + 1}/{totalRounds}
            </span>
          </div>
        </div>
      </KangurGlassPanel>

      <KangurGlassPanel className='w-full max-w-4xl' padding='lg' surface='mist'>
        <div className='space-y-4'>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <div>
              <div className='text-xs font-semibold uppercase tracking-[0.2em] text-slate-500'>
                {translateAlphabetCopy(translations, 'guide.title', 'Wzor litery')}
              </div>
              <p className='mt-1 text-sm text-slate-600'>
                {translateAlphabetCopy(
                  translations,
                  'guide.description',
                  'Litera {letter} jak {word}.',
                  { letter: currentRound.label, word: currentWord }
                )}
              </p>
            </div>
            <KangurStatusChip accent='indigo' size='sm'>
              {drawHint}
            </KangurStatusChip>
          </div>

          <KangurTracingBoard
            ariaKeyShortcuts={KANGUR_DRAWING_HISTORY_ARIA_SHORTCUTS}
            boardOverlay={<div className='copy-guide pointer-events-none' aria-hidden='true' />}
            canvasAriaLabel={translateAlphabetCopy(
              translations,
              'canvasAria',
              'Przepisz litere {letter} pod wzorem',
              { letter: currentRound.label }
            )}
            canvasRef={canvasRef}
            footerHint={traceHint}
            footerPointsLabel={pointsLabel}
            guideSurface={
              <AlphabetCopyGuideSurface
                guideColor={currentRound.guideColor}
                inkColor={currentRound.inkColor}
                letter={currentRound.label}
                word={currentWord}
                writeHereLabel={translateAlphabetCopy(translations, 'guide.writeHere', 'Napisz tutaj')}
              />
            }
            height={CANVAS_HEIGHT}
            isCoarsePointer={isCoarsePointer}
            isPointerDrawing={isPointerDrawing}
            onKeyDown={handleCanvasKeyDown}
            onPointerCancel={handlePointerUp}
            onPointerDown={handlePointerDown}
            onPointerLeave={handlePointerUp}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            shellDataTestId='alphabet-copy-canvas-shell'
            shellStyle={canvasSurfaceStyle}
            touchHint={touchHint}
            touchHintTestId='alphabet-copy-touch-hint'
            width={CANVAS_WIDTH}
          />
        </div>
      </KangurGlassPanel>

      <KangurTracingLessonFooter
        checkLabel={translateAlphabetCopy(translations, 'actions.check', 'Sprawdz')}
        clearLabel={translateAlphabetCopy(translations, 'actions.clear', 'Wyczysc')}
        feedback={feedback}
        utilityActions={
          <KangurManagedDrawingUtilityActions
            canExport={hasDrawableContent}
            canRedo={canRedo}
            canUndo={canUndo}
            exportLabel={translateAlphabetCopy(translations, 'actions.export', 'Eksportuj PNG')}
            exportTestId='alphabet-copy-export'
            isCoarsePointer={isCoarsePointer}
            layoutPreset='footer'
            onExport={exportDrawing}
            onRedo={redoDrawing}
            onUndo={undoDrawing}
            redoLabel={translateAlphabetCopy(translations, 'actions.redo', 'Ponow')}
            undoLabel={translateAlphabetCopy(translations, 'actions.undo', 'Cofnij')}
          />
        }
        idlePrompt={translateAlphabetCopy(
          translations,
          'footer.idlePrompt',
          'Kliknij Sprawdz, gdy skonczysz przepisywac.'
        )}
        isCoarsePointer={isCoarsePointer}
        isLastRound={roundIndex + 1 >= totalRounds}
        nextLabel={translateAlphabetCopy(translations, 'actions.next', 'Dalej')}
        onCheck={handleCheck}
        onClear={clearDrawing}
        onNext={handleNext}
        restartLabel={translateAlphabetCopy(
          translations,
          'actions.restart',
          'Zacznij od nowa'
        )}
      />

      <style jsx>{`
        .target-letter {
          transform-box: fill-box;
          transform-origin: center;
          animation: letterFloat 3.2s ease-in-out infinite;
        }
        .copy-divider {
          stroke: #94a3b8;
          stroke-width: 2px;
          stroke-dasharray: 6 10;
          opacity: 0.35;
        }
        .copy-midline {
          stroke-width: 3px;
          stroke-dasharray: 8 12;
          opacity: 0.4;
        }
        .copy-baseline {
          stroke-width: 6px;
          stroke-linecap: round;
          stroke-dasharray: 14 16;
          animation: baselineGlow 2.8s ease-in-out infinite;
        }
        .copy-guide {
          position: absolute;
          left: 20px;
          top: calc(var(--baseline-y, 210px) - 18px);
          width: 18px;
          height: 18px;
          border-radius: 9999px;
          background: var(--guide-color, #38bdf8);
          box-shadow:
            0 0 0 6px rgba(255, 255, 255, 0.85),
            0 10px 20px -12px rgba(15, 23, 42, 0.45);
          opacity: 0.85;
          animation: guideSlide 3.6s ease-in-out infinite;
        }
        .copy-guide::after {
          content: '';
          position: absolute;
          right: -7px;
          top: 50%;
          width: 10px;
          height: 3px;
          border-radius: 9999px;
          background: rgba(15, 23, 42, 0.7);
          transform: translateY(-50%);
        }
        @keyframes letterFloat {
          0% {
            transform: translateY(0px) scale(1);
          }
          50% {
            transform: translateY(-4px) scale(1.01);
          }
          100% {
            transform: translateY(0px) scale(1);
          }
        }
        @keyframes baselineGlow {
          0% {
            stroke-dashoffset: 0;
            opacity: 0.5;
          }
          50% {
            opacity: 0.95;
          }
          100% {
            stroke-dashoffset: -120;
            opacity: 0.5;
          }
        }
        @keyframes guideSlide {
          0% {
            transform: translateX(0);
          }
          50% {
            transform: translateX(220px);
          }
          100% {
            transform: translateX(0);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .target-letter,
          .copy-baseline,
          .copy-guide {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
