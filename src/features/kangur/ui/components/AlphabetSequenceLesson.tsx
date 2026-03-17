'use client';

import { useMemo, useState } from 'react';

import LessonHub from '@/features/kangur/ui/components/LessonHub';
import LessonSlideSection, {
  type LessonSlide,
} from '@/features/kangur/ui/components/LessonSlideSection';
import {
  buildLessonSectionLabels,
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
import {
  addXp,
  createLessonCompletionReward,
  loadProgress,
} from '@/features/kangur/ui/services/progress';

type SectionId = 'intro' | 'practice' | 'game' | 'summary';

type SlideSectionId = SectionId;

type SequenceRound = {
  id: string;
  sequence: string;
  correct: string;
  options: string[];
};

const HUB_SECTIONS = [
  {
    id: 'intro',
    emoji: '🧠',
    title: 'Kolejność',
    description: 'Poznaj kolejność liter w alfabecie.',
  },
  {
    id: 'practice',
    emoji: '🧩',
    title: 'Ćwiczymy',
    description: 'Czytaj litery po kolei.',
  },
  {
    id: 'game',
    emoji: '🎲',
    title: 'Gra',
    description: 'Wybierz brakującą literę.',
  },
  {
    id: 'summary',
    emoji: '⭐',
    title: 'Podsumowanie',
    description: 'Utrwal kolejność liter.',
  },
] as const;

const SECTION_LABELS: Partial<Record<SectionId, string>> = buildLessonSectionLabels(HUB_SECTIONS);

const SEQUENCE_ROUNDS: SequenceRound[] = [
  {
    id: 'abc',
    sequence: 'A B _ D',
    correct: 'C',
    options: ['B', 'C', 'E'],
  },
  {
    id: 'efg',
    sequence: 'E _ G',
    correct: 'F',
    options: ['F', 'H', 'D'],
  },
  {
    id: 'jkl',
    sequence: 'J K _',
    correct: 'L',
    options: ['L', 'M', 'I'],
  },
  {
    id: 'mno',
    sequence: 'M _ O',
    correct: 'N',
    options: ['N', 'P', 'L'],
  },
];

const AlphabetSequenceGame = (): React.JSX.Element => {
  const [roundIndex, setRoundIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);

  if (SEQUENCE_ROUNDS.length === 0) {
    return (
      <KangurGlassPanel className='w-full max-w-lg' padding='lg' surface='playField'>
        <div className='text-sm text-slate-500'>Brak rund do zagrania.</div>
      </KangurGlassPanel>
    );
  }

  const safeIndex = Math.min(roundIndex, SEQUENCE_ROUNDS.length - 1);
  const round = SEQUENCE_ROUNDS[safeIndex]!;
  const isLast = roundIndex >= SEQUENCE_ROUNDS.length - 1;
  const isCorrect = selected ? selected === round.correct : null;

  const handleSelect = (option: string): void => {
    if (selected) {
      return;
    }
    setSelected(option);
    if (option === round.correct) {
      setScore((value) => value + 1);
    }
  };

  const handleNext = (): void => {
    if (!selected) {
      return;
    }
    if (isLast) {
      setRoundIndex(0);
      setSelected(null);
      setScore(0);
      return;
    }
    setRoundIndex((value) => value + 1);
    setSelected(null);
  };

  return (
    <KangurGlassPanel className='w-full max-w-lg' padding='lg' surface='playField'>
      <div className='flex items-center justify-between gap-2'>
        <KangurStatusChip accent='amber' size='sm'>
          Runda {roundIndex + 1}/{SEQUENCE_ROUNDS.length}
        </KangurStatusChip>
        <KangurStatusChip accent='sky' size='sm'>
          Punkty {score}/{SEQUENCE_ROUNDS.length}
        </KangurStatusChip>
      </div>
      <div className='mt-4 flex flex-col items-center gap-4 text-center'>
        <div className='text-2xl font-bold text-slate-800'>{round.sequence}</div>
        <div className='text-sm text-slate-600'>
          Wybierz literę, która pasuje do przerwy.
        </div>
        <div className='flex flex-wrap items-center justify-center gap-3'>
          {round.options.map((option) => {
            const isOptionSelected = option === selected;
            const isOptionCorrect = selected && option === round.correct;
            const variant = isOptionSelected || isOptionCorrect ? 'primary' : 'surface';
            return (
              <KangurButton
                key={option}
                size='sm'
                type='button'
                variant={variant}
                onClick={() => handleSelect(option)}
              >
                {option}
              </KangurButton>
            );
          })}
        </div>
        {selected ? (
          <div className='text-sm font-semibold'>
            {isCorrect
              ? 'Brawo! To dobra litera.'
              : `Prawidłowa litera to ${round.correct}.`}
          </div>
        ) : (
          <div className='text-sm text-slate-500'>Kliknij literkę.</div>
        )}
        <KangurButton
          size='sm'
          type='button'
          variant='surface'
          onClick={handleNext}
          disabled={!selected}
        >
          {isLast ? 'Zagraj jeszcze raz' : 'Dalej'}
        </KangurButton>
      </div>
    </KangurGlassPanel>
  );
};

const SLIDES: Record<SlideSectionId, LessonSlide[]> = {
  intro: [
    {
      title: 'Alfabet po kolei',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Litery w alfabecie mają swoją kolejność. Czytaj po kolei.
          </KangurLessonLead>
          <KangurLessonCallout accent='amber' className='max-w-md text-center' padding='sm'>
            <div className='flex flex-wrap items-center justify-center gap-3'>
              {['A', 'B', 'C', 'D', 'E'].map((letter) => (
                <KangurLessonChip key={letter} accent='amber'>
                  {letter}
                </KangurLessonChip>
              ))}
            </div>
            <KangurLessonCaption className='mt-2'>Powtarzaj: A, B, C, D, E.</KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
  practice: [
    {
      title: 'Kontynuuj',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Powiedz, jaka litera jest następna.
          </KangurLessonLead>
          <div className='grid w-full max-w-md grid-cols-1 gap-3 sm:grid-cols-2'>
            <KangurLessonInset accent='amber'>
              <div className='text-xl font-bold text-amber-700'>A B C _</div>
              <KangurLessonCaption className='mt-1'>Następna to D.</KangurLessonCaption>
            </KangurLessonInset>
            <KangurLessonInset accent='sky'>
              <div className='text-xl font-bold text-sky-700'>E F _</div>
              <KangurLessonCaption className='mt-1'>Następna to G.</KangurLessonCaption>
            </KangurLessonInset>
          </div>
        </KangurLessonStack>
      ),
    },
  ],
  game: [
    {
      title: 'Brakująca litera',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Wybieraj literę, która pasuje do sekwencji.
          </KangurLessonLead>
          <AlphabetSequenceGame />
        </KangurLessonStack>
      ),
    },
  ],
  summary: [
    {
      title: 'Świetnie',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Potrafisz znaleźć brakującą literę w kolejności.
          </KangurLessonLead>
          <KangurLessonCallout accent='amber' className='max-w-md text-left' padding='sm'>
            <ul className='list-disc pl-5 text-sm text-slate-700'>
              <li>Litery mają ustaloną kolejność.</li>
              <li>Rozpoznajesz brakującą literę.</li>
              <li>Powtarzaj alfabet codziennie.</li>
            </ul>
          </KangurLessonCallout>
          <KangurLessonCaption className='max-w-md'>
            Wróć do gry, aby ćwiczyć dalej.
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
  ],
};

export default function AlphabetSequenceLesson(): React.JSX.Element {
  const [activeSection, setActiveSection] = useState<SectionId | null>(null);
  const { markSectionOpened, markSectionViewedCount, recordPanelTime, sectionProgress } =
    useKangurLessonPanelProgress({
      lessonKey: 'alphabet_sequence',
      slideSections: SLIDES,
      sectionLabels: SECTION_LABELS,
    });

  const handleComplete = (): void => {
    const progress = loadProgress();
    const reward = createLessonCompletionReward(progress, 'alphabet_sequence', 110);
    addXp(reward.xp, reward.progressUpdates);
  };

  const sectionList = useMemo(
    () =>
      HUB_SECTIONS.map((section) => ({
        ...section,
        progress: sectionProgress[section.id as SectionId],
      })),
    [sectionProgress]
  );

  if (activeSection) {
    return (
      <LessonSlideSection
        slides={SLIDES[activeSection]}
        sectionHeader={resolveLessonSectionHeader(HUB_SECTIONS, activeSection)}
        onBack={() => setActiveSection(null)}
        onComplete={activeSection === 'summary' ? handleComplete : undefined}
        onProgressChange={(viewedCount) => markSectionViewedCount(activeSection, viewedCount)}
        onPanelTimeUpdate={(panelIndex, panelTitle, seconds) =>
          recordPanelTime(activeSection, panelIndex, seconds, panelTitle)
        }
        dotActiveClass='bg-amber-500'
        dotDoneClass='bg-amber-300'
        gradientClass='kangur-gradient-accent-amber'
      />
    );
  }

  return (
    <LessonHub
      lessonEmoji='🧠'
      lessonTitle='Kolejność liter'
      gradientClass='kangur-gradient-accent-amber'
      progressDotClassName='bg-amber-300'
      sections={sectionList}
      onSelect={(id) => {
        markSectionOpened(id as SectionId);
        setActiveSection(id as SectionId);
      }}
    />
  );
}
