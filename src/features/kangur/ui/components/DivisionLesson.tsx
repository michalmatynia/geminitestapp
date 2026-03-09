import { useState } from 'react';

import DivisionGame from '@/features/kangur/ui/components/DivisionGame';
import LessonActivityStage from '@/features/kangur/ui/components/LessonActivityStage';
import LessonHub from '@/features/kangur/ui/components/LessonHub';
import LessonSlideSection, {
  type LessonSlide,
} from '@/features/kangur/ui/components/LessonSlideSection';
import { KangurLessonCallout } from '@/features/kangur/ui/design/lesson-primitives';
import {
  KangurDisplayEmoji,
  KangurEquationDisplay,
} from '@/features/kangur/ui/design/primitives';
import { useLessonHubProgress } from '@/features/kangur/ui/hooks/useLessonHubProgress';

type SectionId = 'intro' | 'odwrotnosc' | 'reszta' | 'zapamietaj' | 'game';

export const SLIDES: Record<Exclude<SectionId, 'game'>, LessonSlide[]> = {
  intro: [
    {
      title: 'Co to znaczy dzielic?',
      content: (
        <div className='flex flex-col items-center gap-4'>
          <p className='text-center text-slate-700'>
            Dzielenie to równy podział na grupy. Pytamy: ile w każdej grupie?
          </p>
          <div className='flex flex-col items-center gap-2'>
            <KangurDisplayEmoji size='sm'>🍪🍪🍪🍪🍪🍪</KangurDisplayEmoji>
            <p className='text-sm text-slate-500'>6 ciastek podzielone na 2 osoby</p>
            <KangurEquationDisplay accent='sky' size='md'>
              6 ÷ 2 = 3
            </KangurEquationDisplay>
            <div className='flex gap-4'>
              <KangurDisplayEmoji size='xs'>🧒🍪🍪🍪</KangurDisplayEmoji>
              <KangurDisplayEmoji size='xs'>🧒🍪🍪🍪</KangurDisplayEmoji>
            </div>
          </div>
        </div>
      ),
    },
  ],
  odwrotnosc: [
    {
      title: 'Dzielenie i mnozenie',
      content: (
        <div className='flex flex-col items-center gap-4'>
          <p className='text-center text-slate-700'>Każde mnozenie ma swoje dzielenie!</p>
          <KangurLessonCallout accent='sky' className='max-w-xs'>
            <div className='flex flex-col gap-2 text-center'>
              <p className='text-slate-700'>
                4 × 3 = <b>12</b>
              </p>
              <div className='flex flex-wrap justify-center gap-3'>
                <KangurEquationDisplay accent='sky' size='sm'>
                  12 ÷ 4 = 3
                </KangurEquationDisplay>
                <KangurEquationDisplay accent='sky' size='sm'>
                  12 ÷ 3 = 4
                </KangurEquationDisplay>
              </div>
            </div>
          </KangurLessonCallout>
          <p className='text-center text-sm text-slate-500'>
            Znajac tabliczkę mnozenia, znasz tez tabliczkę dzielenia!
          </p>
        </div>
      ),
    },
  ],
  reszta: [
    {
      title: 'Reszta z dzielenia',
      content: (
        <div className='flex flex-col items-center gap-4'>
          <p className='text-center text-slate-700'>
            Nie zawsze dzielenie wychodzi równo — wtedy zostaje reszta.
          </p>
          <KangurLessonCallout accent='teal' className='max-w-xs text-center'>
            <KangurEquationDisplay accent='teal' data-testid='division-lesson-remainder-equation'>
              7 ÷ 2 = ?
            </KangurEquationDisplay>
            <p className='mt-2 text-slate-500'>2×3=6 (za mało), 2×4=8 (za duzo)</p>
            <KangurEquationDisplay accent='teal' className='mt-1' size='md'>
              7 ÷ 2 = <b>3</b> reszta <b>1</b>
            </KangurEquationDisplay>
          </KangurLessonCallout>
          <KangurDisplayEmoji size='xs'>🍫🍫🍫🍫🍫🍫🍫</KangurDisplayEmoji>
          <p className='text-sm text-slate-500'>7 czekolad → 3 dla każdego, 1 zostaje</p>
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
                ✅ Podziel przez 1 = ta sama liczba: <b>9÷1=9</b>
              </li>
              <li>
                ✅ Podziel przez siebie = 1: <b>5÷5=1</b>
              </li>
              <li>
                ✅ 0 podzielone przez cokolwiek = 0: <b>0÷4=0</b>
              </li>
              <li>✅ Reszta jest zawsze mniejsza od dzielnika</li>
              <li>✅ Sprawdz: wynik × dzielnik + reszta = liczba</li>
            </ul>
          </KangurLessonCallout>
        </div>
      ),
    },
  ],
};

export const HUB_SECTIONS = [
  { id: 'intro', emoji: '÷', title: 'Co to dzielenie?', description: 'Podział na równe grupy' },
  {
    id: 'odwrotnosc',
    emoji: '🔄',
    title: 'Dzielenie i mnozenie',
    description: 'Odwrotne działania',
  },
  { id: 'reszta', emoji: '🍫', title: 'Reszta z dzielenia', description: 'Gdy nie wychodzi równo' },
  { id: 'zapamietaj', emoji: '🧠', title: 'Zapamietaj!', description: 'Ważne zasady dzielenia' },
  {
    id: 'game',
    emoji: '🎮',
    title: 'Gra z dzieleniem',
    description: 'Cwicz dzielenie w grze',
    isGame: true,
  },
];

export default function DivisionLesson(): React.JSX.Element {
  const [activeSection, setActiveSection] = useState<SectionId | null>(null);
  const { markSectionOpened, markSectionViewedCount, sectionProgress } =
    useLessonHubProgress(SLIDES);

  if (activeSection === 'game') {
    return (
      <LessonActivityStage
        accent='sky'
        headerTestId='division-lesson-game-header'
        icon='🎮'
        maxWidthClassName='max-w-sm'
        onBack={() => setActiveSection(null)}
        sectionHeader={HUB_SECTIONS.find((section) => section.id === activeSection) ?? null}
        shellTestId='division-lesson-game-shell'
        title='Gra z dzieleniem!'
      >
        <DivisionGame finishLabel='Wróć do tematów' onFinish={() => setActiveSection(null)} />
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
        dotActiveClass='bg-blue-500'
        dotDoneClass='bg-blue-300'
        gradientClass='from-blue-500 to-teal-400'
      />
    );
  }

  return (
    <LessonHub
      lessonEmoji='➗'
      lessonTitle='Dzielenie'
      gradientClass='from-blue-500 to-teal-400'
      progressDotClassName='bg-blue-300'
      sections={HUB_SECTIONS.map((section) =>
        section.isGame
          ? section
          : {
            ...section,
            progress: sectionProgress[section.id as keyof typeof SLIDES],
          }
      )}
      onSelect={(id) => {
        if (id !== 'game') {
          markSectionOpened(id as keyof typeof SLIDES);
        }
        setActiveSection(id as SectionId);
      }}
    />
  );
}
