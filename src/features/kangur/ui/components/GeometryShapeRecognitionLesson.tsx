'use client';

import type * as React from 'react';
import { useId, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

import GeometryDrawingGame from '@/features/kangur/ui/components/GeometryDrawingGame';
import type { LessonSlide } from '@/features/kangur/ui/components/LessonSlideSection';
import {
  KangurLessonCallout,
  KangurLessonCaption,
  KangurLessonChip,
  KangurLessonInset,
  KangurLessonLead,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';
import {
  KangurButton,
  KangurGlassPanel,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import { KangurUnifiedLesson } from '@/features/kangur/ui/lessons/lesson-components';
import type { LessonTranslate } from './lesson-copy';

type SectionId = 'intro' | 'practice' | 'draw' | 'summary';
type ShapeId = 'circle' | 'square' | 'triangle' | 'rectangle' | 'oval' | 'diamond';

type ShapeDefinition = {
  id: ShapeId;
  label: string;
  clue: string;
  color: string;
};

type ShapeRound = {
  id: ShapeId;
  shape: ShapeId;
  correct: ShapeId;
  options: readonly ShapeId[];
};

const SHAPE_META: Array<{ id: ShapeId; color: string }> = [
  {
    id: 'circle',
    color: '#38bdf8',
  },
  {
    id: 'square',
    color: '#4ade80',
  },
  {
    id: 'triangle',
    color: '#fbbf24',
  },
  {
    id: 'rectangle',
    color: '#fb7185',
  },
  {
    id: 'oval',
    color: '#a78bfa',
  },
  {
    id: 'diamond',
    color: '#f97316',
  },
];

const SHAPE_ROUNDS: ShapeRound[] = [
  { id: 'circle', shape: 'circle', correct: 'circle', options: ['circle', 'square', 'triangle'] },
  {
    id: 'triangle',
    shape: 'triangle',
    correct: 'triangle',
    options: ['triangle', 'rectangle', 'circle'],
  },
  {
    id: 'square',
    shape: 'square',
    correct: 'square',
    options: ['square', 'diamond', 'rectangle'],
  },
  {
    id: 'rectangle',
    shape: 'rectangle',
    correct: 'rectangle',
    options: ['rectangle', 'square', 'oval'],
  },
  { id: 'oval', shape: 'oval', correct: 'oval', options: ['oval', 'circle', 'diamond'] },
  {
    id: 'diamond',
    shape: 'diamond',
    correct: 'diamond',
    options: ['diamond', 'square', 'triangle'],
  },
];

const buildShapes = (translate: LessonTranslate): ShapeDefinition[] =>
  SHAPE_META.map((shape) => ({
    ...shape,
    label: translate(`shapes.${shape.id}.label`),
    clue: translate(`shapes.${shape.id}.clue`),
  }));

const buildSections = (translate: LessonTranslate) =>
  [
    {
      id: 'intro',
      emoji: '🔍',
      title: translate('sections.intro.title'),
      description: translate('sections.intro.description'),
    },
    {
      id: 'practice',
      emoji: '🎯',
      title: translate('sections.practice.title'),
      description: translate('sections.practice.description'),
    },
    {
      id: 'draw',
      emoji: '✍️',
      title: translate('sections.draw.title'),
      description: translate('sections.draw.description'),
      isGame: true,
    },
    {
      id: 'summary',
      emoji: '⭐',
      title: translate('sections.summary.title'),
      description: translate('sections.summary.description'),
    },
  ] as const;

export const ShapeIcon = ({
  shape,
  color,
  className,
}: {
  shape: ShapeId;
  color: string;
  className?: string;
}): React.JSX.Element => {
  const baseId = useId().replace(/:/g, '');
  const stroke = '#0f172a';
  const testIdPrefix = `geometry-shape-icon-${shape}`;
  const clipId = `${testIdPrefix}-${baseId}-clip`;
  const panelGradientId = `${testIdPrefix}-${baseId}-panel`;
  const frameGradientId = `${testIdPrefix}-${baseId}-frame`;
  const shapeGradientId = `${testIdPrefix}-${baseId}-shape`;

  return (
    <svg
      aria-hidden='true'
      className={className ?? 'h-20 w-20'}
      data-testid={`${testIdPrefix}-animation`}
      viewBox='0 0 120 120'
    >
      <defs>
        <clipPath id={clipId}>
          <rect x='8' y='8' width='104' height='104' rx='28' />
        </clipPath>
        <linearGradient
          id={panelGradientId}
          x1='16'
          x2='108'
          y1='12'
          y2='108'
          gradientUnits='userSpaceOnUse'
        >
          <stop offset='0%' stopColor='#f8fafc' />
          <stop offset='55%' stopColor='#eff6ff' />
          <stop offset='100%' stopColor='#ecfeff' />
        </linearGradient>
        <linearGradient
          id={frameGradientId}
          x1='16'
          x2='104'
          y1='16'
          y2='16'
          gradientUnits='userSpaceOnUse'
        >
          <stop offset='0%' stopColor='rgba(56,189,248,0.78)' />
          <stop offset='50%' stopColor='rgba(52,211,153,0.82)' />
          <stop offset='100%' stopColor='rgba(250,204,21,0.84)' />
        </linearGradient>
        <linearGradient
          id={shapeGradientId}
          x1='28'
          x2='96'
          y1='24'
          y2='96'
          gradientUnits='userSpaceOnUse'
        >
          <stop offset='0%' stopColor='rgba(255,255,255,0.95)' />
          <stop offset='18%' stopColor={color} stopOpacity='0.96' />
          <stop offset='100%' stopColor={color} stopOpacity='0.76' />
        </linearGradient>
      </defs>
      <g clipPath={`url(#${clipId})`} data-testid={`${testIdPrefix}-atmosphere`}>
        <rect x='8' y='8' width='104' height='104' rx='28' fill={`url(#${panelGradientId})`} />
        <ellipse cx='36' cy='28' rx='24' ry='12' fill='rgba(255,255,255,0.55)' />
        <ellipse cx='84' cy='92' rx='32' ry='16' fill='rgba(148,163,184,0.12)' />
      </g>
      <ellipse cx='60' cy='88' rx='28' ry='10' fill='rgba(15,23,42,0.08)' />
      {shape === 'circle' ? (
        <circle cx='60' cy='60' r='34' fill={`url(#${shapeGradientId})`} stroke={stroke} strokeWidth='4' />
      ) : null}
      {shape === 'square' ? (
        <rect
          x='28'
          y='28'
          width='64'
          height='64'
          rx='10'
          fill={`url(#${shapeGradientId})`}
          stroke={stroke}
          strokeWidth='4'
        />
      ) : null}
      {shape === 'triangle' ? (
        <polygon
          points='60,20 100,96 20,96'
          fill={`url(#${shapeGradientId})`}
          stroke={stroke}
          strokeWidth='4'
        />
      ) : null}
      {shape === 'rectangle' ? (
        <rect
          x='22'
          y='36'
          width='76'
          height='48'
          rx='10'
          fill={`url(#${shapeGradientId})`}
          stroke={stroke}
          strokeWidth='4'
        />
      ) : null}
      {shape === 'oval' ? (
        <ellipse
          cx='60'
          cy='60'
          rx='40'
          ry='26'
          fill={`url(#${shapeGradientId})`}
          stroke={stroke}
          strokeWidth='4'
        />
      ) : null}
      {shape === 'diamond' ? (
        <polygon
          points='60,14 104,60 60,106 16,60'
          fill={`url(#${shapeGradientId})`}
          stroke={stroke}
          strokeWidth='4'
          strokeLinejoin='round'
        />
      ) : null}
      <rect
        x='14'
        y='14'
        width='92'
        height='92'
        rx='24'
        fill='none'
        stroke={`url(#${frameGradientId})`}
        strokeWidth='1.75'
        data-testid={`${testIdPrefix}-frame`}
      />
    </svg>
  );
};

const ShapeGrid = ({ shapes }: { shapes: ShapeDefinition[] }): React.JSX.Element => (
  <div className='grid gap-4 sm:grid-cols-2'>
    {shapes.map((shape) => (
      <KangurLessonCallout
        key={shape.id}
        accent='emerald'
        className='flex flex-col items-center gap-3 text-center'
        padding='md'
      >
        <ShapeIcon shape={shape.id} color={shape.color} />
        <div className='text-base font-semibold'>{shape.label}</div>
        <KangurLessonCaption>{shape.clue}</KangurLessonCaption>
      </KangurLessonCallout>
    ))}
  </div>
);

const ShapeClues = ({
  translate,
}: {
  translate: LessonTranslate;
}): React.JSX.Element => (
  <KangurLessonStack align='start' gap='md'>
    <KangurLessonLead align='left'>
      {translate('clues.lead')}
    </KangurLessonLead>
    <div className='flex flex-wrap gap-2'>
      <KangurLessonChip accent='sky'>{translate('clues.chips.corners')}</KangurLessonChip>
      <KangurLessonChip accent='emerald'>{translate('clues.chips.sides')}</KangurLessonChip>
      <KangurLessonChip accent='amber'>{translate('clues.chips.curves')}</KangurLessonChip>
      <KangurLessonChip accent='rose'>{translate('clues.chips.longShortSides')}</KangurLessonChip>
    </div>
    <KangurLessonInset accent='emerald'>
      {translate('clues.inset')}
    </KangurLessonInset>
  </KangurLessonStack>
);

const ShapeRecognitionGame = ({
  shapes,
  translate,
}: {
  shapes: ShapeDefinition[];
  translate: LessonTranslate;
}): React.JSX.Element => {
  const isCoarsePointer = useKangurCoarsePointer();
  const [roundIndex, setRoundIndex] = useState(0);
  const [selected, setSelected] = useState<ShapeId | null>(null);
  const [score, setScore] = useState(0);
  const shapeLabels = useMemo(
    () =>
      Object.fromEntries(
        shapes.map((shape) => [shape.id, shape.label]),
      ) as Record<ShapeId, string>,
    [shapes],
  );

  if (SHAPE_ROUNDS.length === 0) {
    return (
      <KangurGlassPanel className='w-full' padding='lg' surface='playField'>
        <div className='text-sm text-slate-500'>{translate('practice.emptyRounds')}</div>
      </KangurGlassPanel>
    );
  }

  const isFinished = roundIndex >= SHAPE_ROUNDS.length;
  const safeIndex = Math.min(roundIndex, SHAPE_ROUNDS.length - 1);
  const round = SHAPE_ROUNDS[safeIndex]!;
  const shape = shapes.find((item) => item.id === round.shape) ?? shapes[0]!;
  const isCorrect = selected === round.correct;
  const correctLabel = shapeLabels[round.correct] ?? round.correct;

  const handleSelect = (option: ShapeId): void => {
    if (selected) return;
    setSelected(option);
    if (option === round.correct) {
      setScore((prev) => prev + 1);
    }
  };

  const handleNext = (): void => {
    setSelected(null);
    setRoundIndex((prev) => prev + 1);
  };

  const handleRestart = (): void => {
    setSelected(null);
    setRoundIndex(0);
    setScore(0);
  };

  if (isFinished) {
    return (
      <KangurGlassPanel className='w-full text-center' padding='lg' surface='playField'>
        <KangurStatusChip accent='emerald' size='sm'>
          {translate('practice.finished.status')}
        </KangurStatusChip>
        <div className='mt-4 text-xl font-semibold'>
          {translate('practice.finished.title', {
            score,
            total: SHAPE_ROUNDS.length,
          })}
        </div>
        <div className='mt-2 text-sm text-slate-500'>
          {translate('practice.finished.subtitle')}
        </div>
        <KangurButton
          className={isCoarsePointer ? 'mt-5 touch-manipulation select-none min-h-11 active:scale-[0.98]' : 'mt-5'}
          variant='primary'
          onClick={handleRestart}
        >
          {translate('practice.finished.restart')}
        </KangurButton>
      </KangurGlassPanel>
    );
  }

  return (
    <KangurGlassPanel className='w-full' padding='lg' surface='playField'>
      <div className='flex items-center justify-between'>
        <KangurStatusChip accent='emerald' size='sm'>
          {translate('practice.progress.round', {
            current: roundIndex + 1,
            total: SHAPE_ROUNDS.length,
          })}
        </KangurStatusChip>
        <div className='text-xs text-slate-500'>
          {translate('practice.progress.score', { score })}
        </div>
      </div>
      <div className='mt-5 flex flex-col items-center gap-4'>
        <ShapeIcon shape={shape.id} color={shape.color} className='h-28 w-28' />
        <div className='text-lg font-semibold'>{translate('practice.question')}</div>
      </div>
      <div className='mt-5 grid gap-3 sm:grid-cols-2'>
        {round.options.map((option) => {
          const isSelected = selected === option;
          const variant = isSelected
            ? option === round.correct
              ? 'success'
              : 'warning'
            : 'surface';
          return (
            <KangurButton
              key={option}
              fullWidth
              variant={variant}
              onClick={() => handleSelect(option)}
              className={isCoarsePointer ? 'touch-manipulation select-none min-h-[4rem] active:scale-[0.98]' : undefined}
            >
              {shapeLabels[option] ?? option}
            </KangurButton>
          );
        })}
      </div>
      {selected ? (
        <div className='mt-5 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <KangurStatusChip accent={isCorrect ? 'emerald' : 'rose'} size='sm'>
            {isCorrect
              ? translate('practice.feedback.correct')
              : translate('practice.feedback.incorrect', {
                  shape: correctLabel,
                })}
          </KangurStatusChip>
          <KangurButton
            variant='primary'
            onClick={handleNext}
            className={isCoarsePointer ? 'touch-manipulation select-none min-h-11 active:scale-[0.98]' : undefined}
          >
            {roundIndex + 1 >= SHAPE_ROUNDS.length
              ? translate('practice.actions.finish')
              : translate('practice.actions.next')}
          </KangurButton>
        </div>
      ) : null}
    </KangurGlassPanel>
  );
};

const buildSlides = (
  shapes: ShapeDefinition[],
  translate: LessonTranslate,
): Record<Exclude<SectionId, 'draw'>, LessonSlide[]> => ({
  intro: [
    {
      title: translate('intro.title'),
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{translate('intro.lead')}</KangurLessonLead>
          <ShapeGrid shapes={shapes} />
        </KangurLessonStack>
      ),
    },
    {
      title: translate('clues.title'),
      content: <ShapeClues translate={translate} />,
    },
  ],
  practice: [
    {
      title: translate('practiceSlide.title'),
      content: <ShapeRecognitionGame shapes={shapes} translate={translate} />,
      panelClassName: 'w-full',
    },
  ],
  summary: [
    {
      title: translate('summary.title'),
      content: (
        <KangurLessonStack>
          <KangurStatusChip accent='emerald' size='sm'>
            {translate('summary.status')}
          </KangurStatusChip>
          <KangurLessonLead>{translate('summary.lead')}</KangurLessonLead>
          <KangurLessonCaption>{translate('summary.caption')}</KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
  ],
});

export default function GeometryShapeRecognitionLesson(): React.JSX.Element {
  const translations = useTranslations('KangurStaticLessons.geometryShapeRecognition');
  const translate: LessonTranslate = (key, values) => translations(key as never, values as never);
  const shapes = useMemo(() => buildShapes(translate), [translations]);
  const sections = useMemo(() => buildSections(translate), [translations]);
  const slides = useMemo(() => buildSlides(shapes, translate), [shapes, translations]);

  return (
    <KangurUnifiedLesson
      progressMode='panel'
      lessonId='geometry_shape_recognition'
      lessonEmoji='🔷'
      lessonTitle={translate('lessonTitle')}
      sections={sections}
      slides={slides}
      gradientClass='kangur-gradient-accent-emerald'
      progressDotClassName='bg-emerald-300'
      dotActiveClass='bg-emerald-400'
      dotDoneClass='bg-emerald-200'
      skipMarkFor={['draw']}
      games={[
        {
          sectionId: 'draw',
          stage: {
            accent: 'emerald',
            title: translate('draw.stageTitle'),
            icon: '✍️',
            maxWidthClassName: 'max-w-3xl',
            shellTestId: 'geometry-shape-recognition-draw-shell',
          },
          render: ({ onFinish }) => (
            <GeometryDrawingGame
              activityKey='training:geometry_shape_recognition:draw'
              difficultyLabelOverride={translate('draw.difficultyLabel')}
              finishLabel={translate('draw.finishLabel')}
              lessonKey='geometry_shape_recognition'
              onFinish={onFinish}
              shapeIds={['circle', 'oval', 'triangle', 'diamond', 'square', 'rectangle']}
              showDifficultySelector={false}
            />
          ),
        },
      ]}
    />
  );
}
