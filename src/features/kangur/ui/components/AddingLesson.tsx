import { useState } from 'react';

import AddingBallGame from '@/features/kangur/ui/components/AddingBallGame';
import AddingSynthesisGame from '@/features/kangur/ui/components/AddingSynthesisGame';
import LessonActivityStage from '@/features/kangur/ui/components/LessonActivityStage';
import LessonHub from '@/features/kangur/ui/components/LessonHub';
import LessonSlideSection, {
  type LessonSlide,
} from '@/features/kangur/ui/components/LessonSlideSection';
import { KangurLessonCallout } from '@/features/kangur/ui/design/lesson-primitives';
import {
  KangurDisplayEmoji,
  KangurEquationDisplay,
  KangurIconBadge,
} from '@/features/kangur/ui/design/primitives';
import { useLessonHubProgress } from '@/features/kangur/ui/hooks/useLessonHubProgress';

type SectionId = 'podstawy' | 'przekroczenie' | 'dwucyfrowe' | 'zapamietaj' | 'synthesis' | 'game';

export const SLIDES: Record<Exclude<SectionId, 'game' | 'synthesis'>, LessonSlide[]> = {
  podstawy: [
    {
      title: 'Co to znaczy dodawac?',
      content: (
        <div className='flex flex-col items-center gap-4'>
          <p className='text-center text-slate-700'>
            Dodawanie to łączenie dwóch grup razem, zeby policzyc, ile ich jest łacznie.
          </p>
          <div className='flex items-center gap-4'>
            <KangurDisplayEmoji size='md'>🍎🍎</KangurDisplayEmoji>
            <KangurEquationDisplay accent='slate' as='span' className='text-slate-400' size='md'>
              +
            </KangurEquationDisplay>
            <KangurDisplayEmoji size='md'>🍎🍎🍎</KangurDisplayEmoji>
            <KangurEquationDisplay accent='slate' as='span' className='text-slate-400' size='md'>
              =
            </KangurEquationDisplay>
            <KangurDisplayEmoji size='md'>🍎🍎🍎🍎🍎</KangurDisplayEmoji>
          </div>
          <KangurEquationDisplay accent='amber' size='sm'>
            2 + 3 = 5
          </KangurEquationDisplay>
        </div>
      ),
    },
    {
      title: 'Dodawanie jednocyfrowe',
      content: (
        <div className='flex flex-col items-center gap-4'>
          <p className='text-center text-slate-700'>
            Mozesz liczyc na palcach lub w myslach. Zacznij od wiekszej liczby!
          </p>
          <KangurLessonCallout accent='amber' className='text-center'>
            <KangurEquationDisplay accent='amber' data-testid='adding-lesson-single-digit-equation'>
              4 + 3 = ?
            </KangurEquationDisplay>
            <p className='mt-2 text-slate-500'>
              Zacznij od <b>4</b>, dolicz 3 w góre: 5, 6, <b>7</b> ✓
            </p>
          </KangurLessonCallout>
          <div className='flex gap-1 flex-wrap justify-center'>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <KangurIconBadge key={n} accent='indigo' size='sm'>
                {n}
              </KangurIconBadge>
            ))}
          </div>
        </div>
      ),
    },
  ],
  przekroczenie: [
    {
      title: 'Dodawanie z przekroczeniem 10',
      content: (
        <div className='flex flex-col items-center gap-4'>
          <p className='text-center text-slate-700'>
            Gdy suma przekracza 10, mozesz uzupełnic do 10 i dodac reszte.
          </p>
          <KangurLessonCallout accent='sky' className='text-center'>
            <KangurEquationDisplay accent='sky'>7 + 5 = ?</KangurEquationDisplay>
            <p className='mt-2 text-slate-500'>
              7 + <b>3</b> = 10, zostaje jeszcze <b>2</b>, więc 10 + 2 = <b>12</b> ✓
            </p>
          </KangurLessonCallout>
        </div>
      ),
    },
  ],
  dwucyfrowe: [
    {
      title: 'Dodawanie dwucyfrowe',
      content: (
        <div className='flex flex-col items-center gap-4'>
          <p className='text-center text-slate-700'>Dodawaj osobno dziesiatki i jednosci!</p>
          <KangurLessonCallout accent='emerald' className='max-w-xs text-center'>
            <KangurEquationDisplay accent='emerald'>24 + 13 = ?</KangurEquationDisplay>
            <div className='mt-2 text-left text-slate-600'>
              <p>
                🔹 Dziesiatki: <b>20 + 10 = 30</b>
              </p>
              <p>
                🔹 Jednosci: <b>4 + 3 = 7</b>
              </p>
              <KangurEquationDisplay accent='emerald' className='mt-1' size='md'>
                30 + 7 = 37 ✓
              </KangurEquationDisplay>
            </div>
          </KangurLessonCallout>
        </div>
      ),
    },
  ],
  zapamietaj: [
    {
      title: 'Zapamietaj!',
      content: (
        <div className='flex flex-col items-center gap-4'>
          <KangurLessonCallout accent='amber' className='max-w-xs'>
            <ul className='space-y-2 text-sm text-slate-700'>
              <li>
                ✅ Kolejnosc nie ma znaczenia: <b>3+5 = 5+3</b>
              </li>
              <li>
                ✅ Dodawanie 0 nic nie zmienia: <b>7+0 = 7</b>
              </li>
              <li>✅ Zacznij od wiekszej liczby, zeby liczyc szybciej!</li>
              <li>✅ Grupuj do 10 przy przekroczeniu</li>
            </ul>
          </KangurLessonCallout>
        </div>
      ),
    },
  ],
};

export const HUB_SECTIONS = [
  {
    id: 'podstawy',
    emoji: '➕',
    title: 'Podstawy dodawania',
    description: 'Co to dodawanie? Jednocyfrowe',
  },
  {
    id: 'przekroczenie',
    emoji: '🔟',
    title: 'Dodawanie przez 10',
    description: 'Uzupełnianie do dziesięci',
  },
  {
    id: 'dwucyfrowe',
    emoji: '💡',
    title: 'Dodawanie dwucyfrowe',
    description: 'Dziesiatki i jednosci osobno',
  },
  { id: 'zapamietaj', emoji: '🧠', title: 'Zapamietaj!', description: 'Zasady dodawania' },
  {
    id: 'synthesis',
    emoji: '🎼',
    title: 'Synteza dodawania',
    description: 'Rytmiczne tory odpowiedzi i szybkie sumy',
    isGame: true,
  },
  {
    id: 'game',
    emoji: '⚽',
    title: 'Gra z piłkami',
    description: 'Cwicz dodawanie przesuwajac piłki',
    isGame: true,
  },
];

export default function AddingLesson(): React.JSX.Element {
  const [activeSection, setActiveSection] = useState<SectionId | null>(null);
  const { markSectionOpened, markSectionViewedCount, sectionProgress } =
    useLessonHubProgress(SLIDES);

  if (activeSection === 'synthesis') {
    return (
      <LessonActivityStage
        accent='amber'
        headerTestId='adding-lesson-synthesis-header'
        icon='🎼'
        onBack={() => setActiveSection(null)}
        sectionHeader={HUB_SECTIONS.find((section) => section.id === activeSection) ?? null}
        shellTestId='adding-lesson-synthesis-shell'
        title='Synteza dodawania'
      >
        <AddingSynthesisGame onFinish={() => setActiveSection(null)} />
      </LessonActivityStage>
    );
  }

  if (activeSection === 'game') {
    return (
      <LessonActivityStage
        accent='amber'
        headerTestId='adding-lesson-game-header'
        icon='🎮'
        maxWidthClassName='max-w-sm'
        onBack={() => setActiveSection(null)}
        sectionHeader={HUB_SECTIONS.find((section) => section.id === activeSection) ?? null}
        shellTestId='adding-lesson-game-shell'
        title='Gra z piłkami!'
      >
        <AddingBallGame finishLabel='Wróć do tematów' onFinish={() => setActiveSection(null)} />
      </LessonActivityStage>
    );
  }

  if (activeSection) {
    return (
      <LessonSlideSection
        slides={SLIDES[activeSection]}
        sectionHeader={HUB_SECTIONS.find((section) => section.id === activeSection) ?? null}
        onBack={() => setActiveSection(null)}
        onProgressChange={(viewedCount) => markSectionViewedCount(activeSection, viewedCount)}
        dotActiveClass='bg-orange-400'
        dotDoneClass='bg-orange-200'
        gradientClass='from-orange-400 to-yellow-400'
      />
    );
  }

  return (
    <LessonHub
      lessonEmoji='➕'
      lessonTitle='Dodawanie'
      gradientClass='from-orange-400 to-yellow-400'
      progressDotClassName='bg-orange-200'
      sections={HUB_SECTIONS.map((section) =>
        section.isGame
          ? section
          : {
            ...section,
            progress: sectionProgress[section.id as keyof typeof SLIDES],
          }
      )}
      onSelect={(id) => {
        if (id !== 'synthesis' && id !== 'game') {
          markSectionOpened(id as keyof typeof SLIDES);
        }
        setActiveSection(id as SectionId);
      }}
    />
  );
}
