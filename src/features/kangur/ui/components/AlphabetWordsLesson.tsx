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

type SectionId = 'warmup' | 'words' | 'game' | 'summary';

type SlideSectionId = SectionId;

type GameRound = {
  id: string;
  emoji: string;
  word: string;
  correct: string;
  options: string[];
};

const HUB_SECTIONS = [
  {
    id: 'warmup',
    emoji: '🎯',
    title: 'Start',
    description: 'Rozgrzewka z literami na początku słów.',
  },
  {
    id: 'words',
    emoji: '📖',
    title: 'Pierwsze słowa',
    description: 'Czytaj i rozpoznawaj początkowe litery.',
  },
  {
    id: 'game',
    emoji: '🎲',
    title: 'Gra',
    description: 'Wybierz literę, od której zaczyna się słowo.',
  },
  {
    id: 'summary',
    emoji: '⭐',
    title: 'Podsumowanie',
    description: 'Utrwal najważniejsze kroki.',
  },
] as const;

const SECTION_LABELS: Partial<Record<SectionId, string>> = buildLessonSectionLabels(HUB_SECTIONS);

const GAME_ROUNDS: GameRound[] = [
  {
    id: 'kot',
    emoji: '🐱',
    word: 'KOT',
    correct: 'K',
    options: ['K', 'M', 'S'],
  },
  {
    id: 'mama',
    emoji: '👩',
    word: 'MAMA',
    correct: 'M',
    options: ['A', 'M', 'L'],
  },
  {
    id: 'las',
    emoji: '🌲',
    word: 'LAS',
    correct: 'L',
    options: ['L', 'P', 'T'],
  },
  {
    id: 'ryba',
    emoji: '🐟',
    word: 'RYBA',
    correct: 'R',
    options: ['R', 'B', 'K'],
  },
];

const AlphabetFirstLetterGame = (): React.JSX.Element => {
  const [roundIndex, setRoundIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);

  if (GAME_ROUNDS.length === 0) {
    return (
      <KangurGlassPanel className='w-full max-w-lg' padding='lg' surface='playField'>
        <div className='text-sm text-slate-500'>Brak rund do zagrania.</div>
      </KangurGlassPanel>
    );
  }

  const safeIndex = Math.min(roundIndex, GAME_ROUNDS.length - 1);
  const round = GAME_ROUNDS[safeIndex]!;
  const isLast = roundIndex >= GAME_ROUNDS.length - 1;
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
          Runda {roundIndex + 1}/{GAME_ROUNDS.length}
        </KangurStatusChip>
        <KangurStatusChip accent='sky' size='sm'>
          Punkty {score}/{GAME_ROUNDS.length}
        </KangurStatusChip>
      </div>
        <div className='mt-4 flex flex-col items-center gap-4 text-center'>
        <div className='text-5xl' aria-hidden='true'>
          {round.emoji}
        </div>
        <div className='text-lg font-semibold text-slate-800'>
          Jaka litera na początku słowa {round.word}?
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
  warmup: [
    {
      title: 'Start z literą',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Sprawdź, od jakiej litery zaczyna się słowo.
          </KangurLessonLead>
          <KangurLessonCallout accent='amber' className='max-w-md text-center' padding='sm'>
            <div className='flex flex-wrap items-center justify-center gap-3'>
              {['K', 'M', 'L'].map((letter) => (
                <KangurLessonChip key={letter} accent='amber'>
                  {letter}
                </KangurLessonChip>
              ))}
            </div>
            <KangurLessonCaption className='mt-2'>To nasze litery startowe.</KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
  words: [
    {
      title: 'Pierwsza litera',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Zobacz słowo i powiedz pierwszą literę.
          </KangurLessonLead>
          <div className='grid w-full max-w-md grid-cols-1 gap-3 sm:grid-cols-3'>
            <KangurLessonInset accent='amber'>
              <div className='text-2xl font-bold text-amber-700'>KOT</div>
              <KangurLessonCaption className='mt-1'>Startuje od K.</KangurLessonCaption>
            </KangurLessonInset>
            <KangurLessonInset accent='rose'>
              <div className='text-2xl font-bold text-rose-700'>MAMA</div>
              <KangurLessonCaption className='mt-1'>Startuje od M.</KangurLessonCaption>
            </KangurLessonInset>
            <KangurLessonInset accent='sky'>
              <div className='text-2xl font-bold text-sky-700'>LAS</div>
              <KangurLessonCaption className='mt-1'>Startuje od L.</KangurLessonCaption>
            </KangurLessonInset>
          </div>
        </KangurLessonStack>
      ),
    },
  ],
  game: [
    {
      title: 'Gra w litery',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Wybierz literę, od której zaczyna się słowo.
          </KangurLessonLead>
          <AlphabetFirstLetterGame />
        </KangurLessonStack>
      ),
    },
  ],
  summary: [
    {
      title: 'Brawo',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Umiesz znaleźć pierwszą literę w słowie.
          </KangurLessonLead>
          <KangurLessonCallout accent='amber' className='max-w-md text-left' padding='sm'>
            <ul className='list-disc pl-5 text-sm text-slate-700'>
              <li>Patrzysz na początek słowa.</li>
              <li>Szukanie pierwszej litery jest łatwe po ćwiczeniach.</li>
              <li>Graj regularnie po kilka minut.</li>
            </ul>
          </KangurLessonCallout>
          <KangurLessonCaption className='max-w-md'>
            Możesz wrócić do gry i pobić swój wynik.
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
  ],
};

export default function AlphabetWordsLesson(): React.JSX.Element {
  const [activeSection, setActiveSection] = useState<SectionId | null>(null);
  const { markSectionOpened, markSectionViewedCount, recordPanelTime, sectionProgress } =
    useKangurLessonPanelProgress({
      lessonKey: 'alphabet_words',
      slideSections: SLIDES,
      sectionLabels: SECTION_LABELS,
    });

  const handleComplete = (): void => {
    const progress = loadProgress();
    const reward = createLessonCompletionReward(progress, 'alphabet_words', 120);
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
      lessonEmoji='📖'
      lessonTitle='Pierwsze słowa'
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
