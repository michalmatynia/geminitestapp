'use client';

import React, { useMemo, useState } from 'react';

import LessonHub from '@/features/kangur/ui/components/LessonHub';
import LessonSlideSection, {
  type LessonSlide,
} from '@/features/kangur/ui/components/LessonSlideSection';
import {
  buildLessonHubSectionsWithProgress,
  buildLessonSectionLabels,
  createLessonHubSelectHandler,
  resolveLessonSectionHeader,
} from '@/features/kangur/ui/components/lesson-utils';
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
import { useKangurLessonPanelProgress } from '@/features/kangur/ui/hooks/useKangurLessonPanelProgress';

type SectionId = 'intro' | 'practice' | 'summary';
type ShapeId = 'circle' | 'square' | 'triangle' | 'rectangle' | 'oval' | 'diamond';

type ShapeDefinition = {
  id: ShapeId;
  label: string;
  clue: string;
  color: string;
};

const SHAPES: ShapeDefinition[] = [
  {
    id: 'circle',
    label: 'Koło',
    clue: 'Okrągłe, bez rogów.',
    color: '#38bdf8',
  },
  {
    id: 'square',
    label: 'Kwadrat',
    clue: '4 równe boki.',
    color: '#4ade80',
  },
  {
    id: 'triangle',
    label: 'Trójkąt',
    clue: '3 boki i 3 rogi.',
    color: '#fbbf24',
  },
  {
    id: 'rectangle',
    label: 'Prostokąt',
    clue: '2 długie i 2 krótkie boki.',
    color: '#fb7185',
  },
  {
    id: 'oval',
    label: 'Owal',
    clue: 'Bez rogów, ale wydłużony.',
    color: '#a78bfa',
  },
  {
    id: 'diamond',
    label: 'Romb',
    clue: 'Wygląda jak przechylony kwadrat.',
    color: '#f97316',
  },
];

const HUB_SECTIONS = [
  {
    id: 'intro',
    emoji: '🔍',
    title: 'Poznaj kształty',
    description: 'Zobacz najczęstsze kształty.',
  },
  {
    id: 'practice',
    emoji: '🎯',
    title: 'Ćwiczenia',
    description: 'Nazwij kształt, który widzisz.',
  },
  {
    id: 'summary',
    emoji: '⭐',
    title: 'Podsumowanie',
    description: 'Najważniejsze informacje.',
  },
] as const;

const SECTION_LABELS: Partial<Record<SectionId, string>> = buildLessonSectionLabels(HUB_SECTIONS);

const SHAPE_ROUNDS = [
  { id: 'circle', shape: 'circle', correct: 'Koło', options: ['Koło', 'Kwadrat', 'Trójkąt'] },
  { id: 'triangle', shape: 'triangle', correct: 'Trójkąt', options: ['Trójkąt', 'Prostokąt', 'Koło'] },
  { id: 'square', shape: 'square', correct: 'Kwadrat', options: ['Kwadrat', 'Romb', 'Prostokąt'] },
  { id: 'rectangle', shape: 'rectangle', correct: 'Prostokąt', options: ['Prostokąt', 'Kwadrat', 'Owal'] },
  { id: 'oval', shape: 'oval', correct: 'Owal', options: ['Owal', 'Koło', 'Romb'] },
  { id: 'diamond', shape: 'diamond', correct: 'Romb', options: ['Romb', 'Kwadrat', 'Trójkąt'] },
] as const;

const ShapeIcon = ({
  shape,
  color,
  className,
}: {
  shape: ShapeId;
  color: string;
  className?: string;
}): React.JSX.Element => {
  const stroke = '#0f172a';

  return (
    <svg
      aria-hidden='true'
      className={className ?? 'h-20 w-20'}
      viewBox='0 0 120 120'
    >
      {shape === 'circle' ? (
        <circle cx='60' cy='60' r='34' fill={color} stroke={stroke} strokeWidth='4' />
      ) : null}
      {shape === 'square' ? (
        <rect x='28' y='28' width='64' height='64' rx='10' fill={color} stroke={stroke} strokeWidth='4' />
      ) : null}
      {shape === 'triangle' ? (
        <polygon points='60,20 100,96 20,96' fill={color} stroke={stroke} strokeWidth='4' />
      ) : null}
      {shape === 'rectangle' ? (
        <rect x='22' y='36' width='76' height='48' rx='10' fill={color} stroke={stroke} strokeWidth='4' />
      ) : null}
      {shape === 'oval' ? (
        <ellipse cx='60' cy='60' rx='40' ry='26' fill={color} stroke={stroke} strokeWidth='4' />
      ) : null}
      {shape === 'diamond' ? (
        <polygon
          points='60,14 104,60 60,106 16,60'
          fill={color}
          stroke={stroke}
          strokeWidth='4'
          strokeLinejoin='round'
        />
      ) : null}
    </svg>
  );
};

const ShapeGrid = (): React.JSX.Element => (
  <div className='grid gap-4 sm:grid-cols-2'>
    {SHAPES.map((shape) => (
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

const ShapeClues = (): React.JSX.Element => (
  <KangurLessonStack align='start' gap='md'>
    <KangurLessonLead align='left'>
      Użyj tych wskazówek, aby rozpoznać kształt:
    </KangurLessonLead>
    <div className='flex flex-wrap gap-2'>
      <KangurLessonChip accent='sky'>Rogi</KangurLessonChip>
      <KangurLessonChip accent='emerald'>Boki</KangurLessonChip>
      <KangurLessonChip accent='amber'>Zaokrąglenia</KangurLessonChip>
      <KangurLessonChip accent='rose'>Długie i krótkie boki</KangurLessonChip>
    </div>
    <KangurLessonInset accent='emerald'>
      Najpierw policz rogi, potem porównaj długości boków.
    </KangurLessonInset>
  </KangurLessonStack>
);

const ShapeRecognitionGame = (): React.JSX.Element => {
  const [roundIndex, setRoundIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);

  if (SHAPE_ROUNDS.length === 0) {
    return (
      <KangurGlassPanel className='w-full' padding='lg' surface='playField'>
        <div className='text-sm text-slate-500'>Brak rund.</div>
      </KangurGlassPanel>
    );
  }

  const isFinished = roundIndex >= SHAPE_ROUNDS.length;
  const safeIndex = Math.min(roundIndex, SHAPE_ROUNDS.length - 1);
  const round = SHAPE_ROUNDS[safeIndex];
  const shape = SHAPES.find((item) => item.id === round.shape) ?? SHAPES[0]!;
  const isCorrect = selected === round.correct;

  const handleSelect = (option: string): void => {
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
          Koniec
        </KangurStatusChip>
        <div className='mt-4 text-xl font-semibold'>Wynik: {score}/{SHAPE_ROUNDS.length}</div>
        <div className='mt-2 text-sm text-slate-500'>Świetnie rozpoznajesz kształty!</div>
        <KangurButton className='mt-5' variant='primary' onClick={handleRestart}>
          Zagraj ponownie
        </KangurButton>
      </KangurGlassPanel>
    );
  }

  return (
    <KangurGlassPanel className='w-full' padding='lg' surface='playField'>
      <div className='flex items-center justify-between'>
        <KangurStatusChip accent='emerald' size='sm'>
          Runda {roundIndex + 1}/{SHAPE_ROUNDS.length}
        </KangurStatusChip>
        <div className='text-xs text-slate-500'>Wynik {score}</div>
      </div>
      <div className='mt-5 flex flex-col items-center gap-4'>
        <ShapeIcon shape={shape.id} color={shape.color} className='h-28 w-28' />
        <div className='text-lg font-semibold'>Jaki to kształt?</div>
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
            >
              {option}
            </KangurButton>
          );
        })}
      </div>
      {selected ? (
        <div className='mt-5 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <KangurStatusChip accent={isCorrect ? 'emerald' : 'rose'} size='sm'>
            {isCorrect ? 'Brawo!' : `Prawie! To ${round.correct}.`}
          </KangurStatusChip>
          <KangurButton variant='primary' onClick={handleNext}>
            {roundIndex + 1 >= SHAPE_ROUNDS.length ? 'Zakończ' : 'Dalej'}
          </KangurButton>
        </div>
      ) : null}
    </KangurGlassPanel>
  );
};

const SLIDES: Record<SectionId, LessonSlide[]> = {
  intro: [
    {
      title: 'Poznaj kształty',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>Szukaj rogów, boków i zaokrągleń.</KangurLessonLead>
          <ShapeGrid />
        </KangurLessonStack>
      ),
    },
    {
      title: 'Wskazówki',
      content: <ShapeClues />,
    },
  ],
  practice: [
    {
      title: 'Wyzwanie kształtów',
      content: <ShapeRecognitionGame />,
      panelClassName: 'w-full',
    },
  ],
  summary: [
    {
      title: 'Świetna robota!',
      content: (
        <KangurLessonStack>
          <KangurStatusChip accent='emerald' size='sm'>
            Gotowe na więcej
          </KangurStatusChip>
          <KangurLessonLead>Teraz potrafisz nazwać kształty wokół siebie.</KangurLessonLead>
          <KangurLessonCaption>
            Poszukaj kół, kwadratów, trójkątów, prostokątów, owali i rombów w domu.
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
  ],
};

export default function GeometryShapeRecognitionLesson(): React.JSX.Element {
  const [activeSection, setActiveSection] = useState<SectionId | null>(null);
  const { sectionProgress, markSectionOpened, markSectionViewedCount, recordPanelTime } =
    useKangurLessonPanelProgress<SectionId>({
      lessonKey: 'geometry_shape_recognition',
      slideSections: SLIDES,
      sectionLabels: SECTION_LABELS,
    });

  const sectionList = useMemo(
    () => buildLessonHubSectionsWithProgress(HUB_SECTIONS as any, sectionProgress),
    [sectionProgress]
  );

  const handleSelect = useMemo(
    () =>
      createLessonHubSelectHandler<SectionId>({
        markSectionOpened,
        onSelectSection: (sectionId) => setActiveSection(sectionId),
      }),
    [markSectionOpened]
  );

  if (activeSection) {
    return (
      <LessonSlideSection
        slides={SLIDES[activeSection]}
        sectionHeader={resolveLessonSectionHeader(HUB_SECTIONS as any, activeSection)}
        onBack={() => setActiveSection(null)}
        onProgressChange={(viewedCount: number) => markSectionViewedCount(activeSection, viewedCount)}
        onPanelTimeUpdate={(panelIndex: number, panelTitle: string, seconds: number) =>
          recordPanelTime(activeSection, panelIndex, seconds, panelTitle)
        }
        dotActiveClass='bg-emerald-400'
        dotDoneClass='bg-emerald-200'
        gradientClass='kangur-gradient-accent-emerald'
      />
    );
  }

  return (
    <LessonHub
      lessonEmoji='🔷'
      lessonTitle='Geometria'
      gradientClass='kangur-gradient-accent-emerald'
      progressDotClassName='bg-emerald-300'
      sections={sectionList as any}
      onSelect={handleSelect}
    />
  );
}
