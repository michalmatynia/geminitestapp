'use client';

import { useState } from 'react';

import LessonHub from '@/features/kangur/ui/components/LessonHub';
import LessonSlideSection, {
  type LessonSlide,
} from '@/features/kangur/ui/components/LessonSlideSection';
import {
  KangurLessonCallout,
  KangurLessonCaption,
  KangurLessonChip,
  KangurLessonInset,
  KangurLessonLead,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';
import {
  KangurDisplayEmoji,
  KangurEquationDisplay,
} from '@/features/kangur/ui/design/primitives';
import { useKangurLessonPanelProgress } from '@/features/kangur/ui/hooks/useKangurLessonPanelProgress';
import {
  addXp,
  createLessonCompletionReward,
  loadProgress,
} from '@/features/kangur/ui/services/progress';

type SectionId = 'sounds' | 'syllables' | 'words' | 'summary';

type SlideSectionId = SectionId;

const HUB_SECTIONS = [
  {
    id: 'sounds',
    emoji: '🔊',
    title: 'Dzwieki liter',
    description: 'Poznaj brzmienie liter A, M i L.',
  },
  {
    id: 'syllables',
    emoji: '🧩',
    title: 'Laczenie w sylaby',
    description: 'Polacz litery w proste sylaby MA, LA, PA.',
  },
  {
    id: 'words',
    emoji: '📖',
    title: 'Pierwsze slowa',
    description: 'Czytaj latwe slowa z dwoch sylab.',
  },
  {
    id: 'summary',
    emoji: '🎉',
    title: 'Powtorka',
    description: 'Utrwal litery i sylaby.',
  },
] as const;

const SECTION_LABELS: Record<SectionId, string> = {
  sounds: 'Dzwieki liter',
  syllables: 'Sylaby',
  words: 'Slowa',
  summary: 'Powtorka',
};

const SLIDES: Record<SlideSectionId, LessonSlide[]> = {
  sounds: [
    {
      title: 'Litera i dzwiek',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Kazda litera ma swoj dzwiek. Powtorz glosno za mna.
          </KangurLessonLead>
          <KangurLessonCallout accent='amber' className='max-w-md text-center' padding='sm'>
            <div className='flex flex-wrap items-center justify-center gap-3'>
              {['A', 'M', 'L'].map((letter) => (
                <KangurLessonChip key={letter} accent='amber'>
                  {letter}
                </KangurLessonChip>
              ))}
            </div>
            <KangurLessonCaption className='mt-2'>Powtarzaj: a, m, l.</KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Litera w slowie',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Litery pojawiaja sie w slowach. Posluchaj i powtorz.
          </KangurLessonLead>
          <div className='grid w-full max-w-md grid-cols-1 gap-3 sm:grid-cols-3'>
            <KangurLessonInset accent='amber'>
              <div className='text-2xl font-bold text-amber-700'>A</div>
              <KangurLessonCaption className='mt-1'>A jak auto</KangurLessonCaption>
            </KangurLessonInset>
            <KangurLessonInset accent='rose'>
              <div className='text-2xl font-bold text-rose-700'>M</div>
              <KangurLessonCaption className='mt-1'>M jak mama</KangurLessonCaption>
            </KangurLessonInset>
            <KangurLessonInset accent='sky'>
              <div className='text-2xl font-bold text-sky-700'>L</div>
              <KangurLessonCaption className='mt-1'>L jak las</KangurLessonCaption>
            </KangurLessonInset>
          </div>
        </KangurLessonStack>
      ),
    },
  ],
  syllables: [
    {
      title: 'Laczymy litery',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Dwie litery moga stworzyc sylabe. Sprobuj przeczytac.
          </KangurLessonLead>
          <KangurLessonCallout accent='amber' className='max-w-md text-center' padding='sm'>
            <KangurEquationDisplay accent='amber' size='md'>
              M + A = MA
            </KangurEquationDisplay>
            <KangurLessonCaption className='mt-2'>Powiedz glosno: MA.</KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Powtarzaj rytm',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Powtarzaj sylaby w rytmie: MA - LA - PA.
          </KangurLessonLead>
          <div className='flex flex-wrap items-center justify-center gap-4'>
            {['MA', 'LA', 'PA'].map((syllable) => (
              <KangurLessonChip key={syllable} accent='amber'>
                {syllable}
              </KangurLessonChip>
            ))}
          </div>
          <KangurLessonCaption className='max-w-md'>
            Zmieniaj tempo: powoli, srednio, szybko.
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
  ],
  words: [
    {
      title: 'Pierwsze slowa',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Dwie sylaby tworza slowo. Sprobuj przeczytac:
          </KangurLessonLead>
          <KangurLessonCallout accent='amber' className='max-w-md text-center' padding='sm'>
            <div className='space-y-2 text-lg font-semibold text-amber-700'>
              <div>MA-MA</div>
              <div>LA-TO</div>
              <div>PA-PA</div>
            </div>
            <KangurLessonCaption className='mt-2'>Dodaj gesty, aby zapamietac.</KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Skojarzenia',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Polacz slowo z obrazkiem. Powiedz je na glos.
          </KangurLessonLead>
          <div className='grid w-full max-w-md grid-cols-1 gap-3 sm:grid-cols-3'>
            <KangurLessonInset accent='amber'>
              <KangurDisplayEmoji size='sm'>👩‍👧</KangurDisplayEmoji>
              <KangurLessonCaption className='mt-1'>MA-MA</KangurLessonCaption>
            </KangurLessonInset>
            <KangurLessonInset accent='sky'>
              <KangurDisplayEmoji size='sm'>☀️</KangurDisplayEmoji>
              <KangurLessonCaption className='mt-1'>LA-TO</KangurLessonCaption>
            </KangurLessonInset>
            <KangurLessonInset accent='rose'>
              <KangurDisplayEmoji size='sm'>👋</KangurDisplayEmoji>
              <KangurLessonCaption className='mt-1'>PA-PA</KangurLessonCaption>
            </KangurLessonInset>
          </div>
        </KangurLessonStack>
      ),
    },
  ],
  summary: [
    {
      title: 'Super robota!',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Potrafisz juz laczyc litery w sylaby i czytac proste slowa.
          </KangurLessonLead>
          <KangurLessonCallout accent='amber' className='max-w-md text-left' padding='sm'>
            <ul className='list-disc pl-5 text-sm text-slate-700'>
              <li>Litery maja swoj dzwiek.</li>
              <li>Sylaby powstaja z dwoch liter.</li>
              <li>Slowa skladaja sie z sylab.</li>
            </ul>
          </KangurLessonCallout>
          <KangurLessonCaption className='max-w-md'>
            Wroc do literek i cwicz codziennie po chwili.
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
  ],
};

export default function AlphabetSyllablesLesson(): React.JSX.Element {
  const [activeSection, setActiveSection] = useState<SectionId | null>(null);
  const { markSectionOpened, markSectionViewedCount, recordPanelTime, sectionProgress } =
    useKangurLessonPanelProgress({
      lessonKey: 'alphabet_syllables',
      slideSections: SLIDES,
      sectionLabels: SECTION_LABELS,
    });

  const handleComplete = (): void => {
    const progress = loadProgress();
    const reward = createLessonCompletionReward(progress, 'alphabet_syllables', 100);
    addXp(reward.xp, reward.progressUpdates);
  };

  if (activeSection) {
    return (
      <LessonSlideSection
        slides={SLIDES[activeSection]}
        sectionHeader={HUB_SECTIONS.find((section) => section.id === activeSection) ?? null}
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
      lessonTitle='Sylaby i slowa'
      gradientClass='kangur-gradient-accent-amber'
      progressDotClassName='bg-amber-300'
      sections={HUB_SECTIONS.map((section) => ({
        ...section,
        progress: sectionProgress[section.id as SectionId],
      }))}
      onSelect={(id) => {
        markSectionOpened(id as SectionId);
        setActiveSection(id as SectionId);
      }}
    />
  );
}
