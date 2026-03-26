'use client';

import { useCallback, useId, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useTranslations } from 'next-intl';

import {
  computeKangurTotalStrokeLength,
  flattenKangurStrokePoints,
} from '@/features/kangur/ui/components/drawing-engine/stroke-metrics';
import { KangurTracingLessonFooter } from '@/features/kangur/ui/components/drawing-engine/KangurTracingLessonFooter';
import { KangurTracingBoard } from '@/features/kangur/ui/components/drawing-engine/KangurTracingBoard';
import {
  evaluateKangurTracingAttempt,
  getKangurTracingCanvasConfig,
} from '@/features/kangur/ui/components/drawing-engine/tracing';
import { useKangurPointCanvasDrawing } from '@/features/kangur/ui/components/drawing-engine/useKangurPointCanvasDrawing';
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
import type { TranslationValues } from 'use-intl';

const CANVAS_WIDTH = 360;
const CANVAS_HEIGHT = 240;
const BASE_MIN_DRAWING_POINTS = 24;
const BASE_MIN_DRAWING_LENGTH = 180;

type Translate = KangurIntlTranslate;

type LetterRound = {
  id: string;
  label: string;
  word: string;
  accent: 'amber' | 'rose' | 'sky';
  guideColor: string;
  glowColor: string;
  paths: string[];
};

const LETTER_ROUNDS: LetterRound[] = [
  {
    id: 'A',
    label: 'A',
    word: 'auto',
    accent: 'amber',
    guideColor: '#fdba74',
    glowColor: '#f59e0b',
    paths: ['M100 200 L180 40 L260 200', 'M130 140 L230 140'],
  },
  {
    id: 'B',
    label: 'B',
    word: 'balon',
    accent: 'rose',
    guideColor: '#fda4af',
    glowColor: '#fb7185',
    paths: [
      'M120 40 L120 200',
      'M120 40 Q250 60 200 120 Q250 160 120 180',
    ],
  },
  {
    id: 'C',
    label: 'C',
    word: 'cytryna',
    accent: 'sky',
    guideColor: '#7dd3fc',
    glowColor: '#38bdf8',
    paths: ['M250 60 Q150 20 90 80 Q40 120 90 180 Q150 220 250 180'],
  },
];

const translateAlphabetBasics = (
  translate: Translate,
  key: string,
  fallback: string,
  values?: TranslationValues
): string => {
  const translated = translate(key, values);
  return translated === key || translated.endsWith(`.${key}`) ? fallback : translated;
};

export function AlphabetBasicsGuideSurface({
  guideColor,
  glowColor,
  letter,
  paths,
}: {
  guideColor: string;
  glowColor: string;
  letter: string;
  paths: string[];
}): React.JSX.Element {
  const baseId = useId().replace(/:/g, '');
  const clipId = `alphabet-basics-guide-${baseId}-clip`;
  const panelGradientId = `alphabet-basics-guide-${baseId}-panel`;
  const frameGradientId = `alphabet-basics-guide-${baseId}-frame`;

  return (
    <svg
      viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
      className='absolute inset-0 h-full w-full'
      aria-hidden='true'
      data-testid='alphabet-basics-guide-animation'
    >
      <defs>
        <clipPath id={clipId}>
          <rect x='0' y='0' width={CANVAS_WIDTH} height={CANVAS_HEIGHT} rx='28' />
        </clipPath>
        <linearGradient id={panelGradientId} x1='0' x2='1' y1='0' y2='1'>
          <stop offset='0%' stopColor='#fef3c7' />
          <stop offset='50%' stopColor='#e0f2fe' />
          <stop offset='100%' stopColor='#fae8ff' />
        </linearGradient>
        <linearGradient id={frameGradientId} x1='0' x2='1' y1='0' y2='0'>
          <stop offset='0%' stopColor='rgba(245,158,11,0.78)' />
          <stop offset='50%' stopColor='rgba(56,189,248,0.82)' />
          <stop offset='100%' stopColor='rgba(244,114,182,0.82)' />
        </linearGradient>
      </defs>
      <g clipPath={`url(#${clipId})`} data-testid='alphabet-basics-guide-atmosphere'>
        <rect width={CANVAS_WIDTH} height={CANVAS_HEIGHT} fill={`url(#${panelGradientId})`} />
        <circle cx='58' cy='60' r='24' fill='#fde68a' opacity='0.6' />
        <circle cx='310' cy='54' r='18' fill='#bae6fd' opacity='0.65' />
        <circle cx='304' cy='190' r='22' fill='#fecaca' opacity='0.55' />
        {paths.map((path) => (
          <path
            key={`guide-${path}`}
            d={path}
            className='letter-guide'
            stroke={guideColor}
          />
        ))}
        {paths.map((path, index) => (
          <path
            key={`glow-${index}`}
            d={path}
            className='letter-glow motion-reduce:animate-none'
            stroke={glowColor}
          />
        ))}
        <text
          x='24'
          y='220'
          fontSize='26'
          fontWeight='700'
          fill='#0f172a'
          opacity='0.2'
        >
          {letter}
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
        data-testid='alphabet-basics-guide-frame'
      />
    </svg>
  );
}

export default function AlphabetBasicsLesson(): React.JSX.Element {
  const translations = useTranslations('KangurStaticLessons.alphabetBasics');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [roundIndex, setRoundIndex] = useState(0);
  const [feedback, setFeedback] = useState<KangurMiniGameFeedbackState>(null);
  const isCoarsePointer = useKangurCoarsePointer();

  const currentRound = (LETTER_ROUNDS[roundIndex] ?? LETTER_ROUNDS[0]) as LetterRound;
  const totalRounds = LETTER_ROUNDS.length;
  const currentWord = translateAlphabetBasics(
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
  const guideStrokeWidth = isCoarsePointer ? 18 : 14;
  const glowStrokeWidth = isCoarsePointer ? 12 : 8;
  const {
    clearStrokes,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    isPointerDrawing,
    strokes,
  } = useKangurPointCanvasDrawing({
    canvasRef,
    enabled: feedback?.kind !== 'success',
    logicalHeight: CANVAS_HEIGHT,
    logicalWidth: CANVAS_WIDTH,
    minPointDistance: tracingCanvasConfig.minPointDistance,
    onPointerStart: () => {
      if (feedback?.kind === 'error') {
        setFeedback(null);
      }
    },
    resolveStyle: () => tracingCanvasConfig.strokeStyle,
    touchLockEnabled: isCoarsePointer,
  });
  const points = useMemo(() => flattenKangurStrokePoints(strokes), [strokes]);
  const strokeLength = useMemo(() => computeKangurTotalStrokeLength(strokes), [strokes]);
  const drawHint = isCoarsePointer
    ? translateAlphabetBasics(
        translations,
        'drawHint.coarse',
        'Rysuj palcem po śladzie'
      )
    : translateAlphabetBasics(
        translations,
        'drawHint.fine',
        'Rysuj palcem lub myszką'
      );
  const traceHint = translateAlphabetBasics(
    translations,
    'footer.traceHint',
    'Rysuj po grubych liniach i nie spiesz się.'
  );
  const touchHint = isPointerDrawing
    ? traceHint
    : drawHint;
  const pointsLabel = translateAlphabetBasics(
    translations,
    'footer.points',
    '{count} punktów',
    { count: points.length }
  );
  const canvasSurfaceStyle = useMemo<CSSProperties>(
    () =>
      ({
        aspectRatio: '3 / 2',
        '--guide-width': `${guideStrokeWidth}px`,
        '--glow-width': `${glowStrokeWidth}px`,
      }) as CSSProperties,
    [guideStrokeWidth, glowStrokeWidth]
  );

  const clearDrawing = useCallback((): void => {
    clearStrokes();
    setFeedback(null);
  }, [clearStrokes]);

  const evaluateDrawing = (): KangurMiniGameFeedbackState => {
    return evaluateKangurTracingAttempt({
      keepGoingText: translateAlphabetBasics(
        translations,
        'feedback.error.keepGoing',
        'Super start! Dorysuj jeszcze kawałek litery.'
      ),
      minDrawingLength: tracingCanvasConfig.minDrawingLength,
      minDrawingPoints: tracingCanvasConfig.minDrawingPoints,
      pointCount: points.length,
      strokeLength,
      successText: translateAlphabetBasics(
        translations,
        'feedback.success',
        'Świetnie! Litera {letter} gotowa.',
        { letter: currentRound.label }
      ),
      tooShortText: translateAlphabetBasics(
        translations,
        'feedback.error.traceMore',
        'Rysuj po śladzie litery i spróbuj jeszcze raz.'
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
      <KangurGlassPanel
        className='w-full max-w-3xl'
        padding='lg'
        surface='playField'
      >
        <div className='flex flex-wrap items-start justify-between gap-4'>
          <div className='min-w-0'>
            <KangurHeadline accent='amber' as='h2' size='sm'>
              {translateAlphabetBasics(translations, 'header.title', 'Alphabet')}
            </KangurHeadline>
            <p className='mt-2 text-sm text-slate-600'>
              {translateAlphabetBasics(
                translations,
                'header.description',
                'Track: Rysuj litery po śladzie. Ćwicz precyzję ruchu na kolorowych śladach. To gra dla 6-latków.'
              )}
            </p>
          </div>
          <div className='flex flex-col items-end gap-2'>
            <KangurStatusChip accent={currentRound.accent} size='sm'>
              {translateAlphabetBasics(
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

      <KangurGlassPanel
        className='w-full max-w-4xl'
        padding='lg'
        surface='mist'
      >
        <div className='space-y-4'>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <div>
              <div className='text-xs font-semibold uppercase tracking-[0.2em] text-slate-500'>
                {translateAlphabetBasics(translations, 'guide.title', 'Ślad litery')}
              </div>
              <p className='mt-1 text-sm text-slate-600'>
                {translateAlphabetBasics(
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
            canvasAriaLabel={translateAlphabetBasics(
              translations,
              'canvasAria',
              'Rysuj litere {letter}',
              { letter: currentRound.label }
            )}
            canvasRef={canvasRef}
            footerHint={traceHint}
            footerPointsLabel={pointsLabel}
            guideSurface={
              <AlphabetBasicsGuideSurface
                guideColor={currentRound.guideColor}
                glowColor={currentRound.glowColor}
                letter={currentRound.label}
                paths={currentRound.paths}
              />
            }
            height={CANVAS_HEIGHT}
            isCoarsePointer={isCoarsePointer}
            isPointerDrawing={isPointerDrawing}
            onPointerCancel={handlePointerUp}
            onPointerDown={handlePointerDown}
            onPointerLeave={handlePointerUp}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            shellDataTestId='alphabet-basics-canvas-shell'
            shellStyle={canvasSurfaceStyle}
            touchHint={touchHint}
            touchHintTestId='alphabet-basics-touch-hint'
            width={CANVAS_WIDTH}
          />
        </div>
      </KangurGlassPanel>

      <KangurTracingLessonFooter
        checkLabel={translateAlphabetBasics(translations, 'actions.check', 'Sprawdź')}
        clearLabel={translateAlphabetBasics(translations, 'actions.clear', 'Wyczyść')}
        feedback={feedback}
        idlePrompt={translateAlphabetBasics(
          translations,
          'footer.idlePrompt',
          'Kliknij Sprawdź, gdy skończysz rysować.'
        )}
        isCoarsePointer={isCoarsePointer}
        isLastRound={roundIndex + 1 >= totalRounds}
        nextLabel={translateAlphabetBasics(translations, 'actions.next', 'Dalej')}
        onCheck={handleCheck}
        onClear={clearDrawing}
        onNext={handleNext}
        restartLabel={translateAlphabetBasics(
          translations,
          'actions.restart',
          'Zacznij od nowa'
        )}
      />

      <style jsx>{`
        .letter-guide {
          fill: none;
          stroke-width: var(--guide-width, 14px);
          stroke-linecap: round;
          stroke-linejoin: round;
          opacity: 0.35;
        }
        .letter-glow {
          fill: none;
          stroke-width: var(--glow-width, 8px);
          stroke-linecap: round;
          stroke-linejoin: round;
          stroke-dasharray: 12 18;
          animation: letterDash 3s linear infinite;
        }
        @keyframes letterDash {
          0% {
            stroke-dashoffset: 0;
            opacity: 0.4;
          }
          50% {
            opacity: 0.9;
          }
          100% {
            stroke-dashoffset: -160;
            opacity: 0.4;
          }
        }
      `}</style>
    </div>
  );
}
