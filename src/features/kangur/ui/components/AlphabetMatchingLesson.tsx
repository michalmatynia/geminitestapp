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

type SectionId = 'pairs' | 'practice' | 'game' | 'summary';

type SlideSectionId = SectionId;

type MatchRound = {
  id: string;
  upper: string;
  correct: string;
  options: string[];
};

const HUB_SECTIONS = [
  {
    id: 'pairs',
    emoji: '🔤',
    title: 'Duże i małe',
    description: 'Poznaj pary liter.',
  },
  {
    id: 'practice',
    emoji: '🧩',
    title: 'Ćwiczymy',
    description: 'Szukanie tej samej litery.',
  },
  {
    id: 'game',
    emoji: '🎲',
    title: 'Gra',
    description: 'Dopasuj małą literę do dużej.',
  },
  {
    id: 'summary',
    emoji: '⭐',
    title: 'Podsumowanie',
    description: 'Utrwal pary liter.',
  },
] as const;

const SECTION_LABELS: Partial<Record<SectionId, string>> = buildLessonSectionLabels(HUB_SECTIONS);

const MATCH_ROUNDS: MatchRound[] = [
  {
    id: 'a',
    upper: 'A',
    correct: 'a',
    options: ['a', 'm', 'l'],
  },
  {
    id: 'm',
    upper: 'M',
    correct: 'm',
    options: ['m', 'k', 't'],
  },
  {
    id: 'l',
    upper: 'L',
    correct: 'l',
    options: ['l', 'p', 'a'],
  },
  {
    id: 'k',
    upper: 'K',
    correct: 'k',
    options: ['k', 'n', 's'],
  },
];

const AlphabetMatchGame = (): React.JSX.Element => {
  const [roundIndex, setRoundIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);

  if (MATCH_ROUNDS.length === 0) {
    return (
      <KangurGlassPanel className='w-full max-w-lg' padding='lg' surface='playField'>
        <div className='text-sm text-slate-500'>Brak rund do zagrania.</div>
      </KangurGlassPanel>
    );
  }

  const safeIndex = Math.min(roundIndex, MATCH_ROUNDS.length - 1);
  const round = MATCH_ROUNDS[safeIndex]!;
  const isLast = roundIndex >= MATCH_ROUNDS.length - 1;
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
          Runda {roundIndex + 1}/{MATCH_ROUNDS.length}
        </KangurStatusChip>
        <KangurStatusChip accent='sky' size='sm'>
          Punkty {score}/{MATCH_ROUNDS.length}
        </KangurStatusChip>
      </div>
      <div className='mt-4 flex flex-col items-center gap-4 text-center'>
        <div className='text-6xl font-black text-slate-800'>{round.upper}</div>
        <div className='text-sm text-slate-600'>
          Wybierz małą literę pasującą do tej dużej.
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
              ? 'Brawo! To pasująca litera.'
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
  pairs: [
    {
      title: 'Pary liter',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Duże i małe litery wyglądają inaczej, ale znaczą to samo.
          </KangurLessonLead>
          <KangurLessonCallout accent='amber' className='max-w-md text-center' padding='sm'>
            <div className='flex flex-wrap items-center justify-center gap-3'>
              {['A a', 'M m', 'L l', 'K k'].map((pair) => (
                <KangurLessonChip key={pair} accent='amber'>
                  {pair}
                </KangurLessonChip>
              ))}
            </div>
            <KangurLessonCaption className='mt-2'>Powtarzaj pary na głos.</KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
  practice: [
    {
      title: 'Znajdź parę',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Sprawdź, która mała litera pasuje do dużej.
          </KangurLessonLead>
          <div className='grid w-full max-w-md grid-cols-1 gap-3 sm:grid-cols-2'>
            <KangurLessonInset accent='amber'>
              <div className='text-xl font-bold text-amber-700'>Duże: A</div>
              <KangurLessonCaption className='mt-1'>Szukamy: a</KangurLessonCaption>
            </KangurLessonInset>
            <KangurLessonInset accent='sky'>
              <div className='text-xl font-bold text-sky-700'>Duże: M</div>
              <KangurLessonCaption className='mt-1'>Szukamy: m</KangurLessonCaption>
            </KangurLessonInset>
          </div>
        </KangurLessonStack>
      ),
    },
  ],
  game: [
    {
      title: 'Dopasuj litery',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Wybieraj małe litery pasujące do dużych.
          </KangurLessonLead>
          <AlphabetMatchGame />
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
            Umiesz łączyć duże i małe litery.
          </KangurLessonLead>
          <KangurLessonCallout accent='amber' className='max-w-md text-left' padding='sm'>
            <ul className='list-disc pl-5 text-sm text-slate-700'>
              <li>Litery występują w parach.</li>
              <li>Patrzysz na kształt litery.</li>
              <li>Ćwiczysz szybko i spokojnie.</li>
            </ul>
          </KangurLessonCallout>
          <KangurLessonCaption className='max-w-md'>
            Wróć do gry, aby utrwalić pary.
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
  ],
};

export default function AlphabetMatchingLesson(): React.JSX.Element {
  const [activeSection, setActiveSection] = useState<SectionId | null>(null);
  const { markSectionOpened, markSectionViewedCount, recordPanelTime, sectionProgress } =
    useKangurLessonPanelProgress({
      lessonKey: 'alphabet_matching',
      slideSections: SLIDES,
      sectionLabels: SECTION_LABELS,
    });

  const handleComplete = (): void => {
    const progress = loadProgress();
    const reward = createLessonCompletionReward(progress, 'alphabet_matching', 110);
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
      lessonEmoji='🔤'
      lessonTitle='Dopasuj litery'
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
