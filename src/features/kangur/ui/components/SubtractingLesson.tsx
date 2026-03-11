import { useState } from 'react';

import LessonActivityStage from '@/features/kangur/ui/components/LessonActivityStage';
import LessonHub from '@/features/kangur/ui/components/LessonHub';
import LessonSlideSection, {
  type LessonSlide,
} from '@/features/kangur/ui/components/LessonSlideSection';
import SubtractingGame from '@/features/kangur/ui/components/SubtractingGame';
import { KangurLessonCallout } from '@/features/kangur/ui/design/lesson-primitives';
import {
  KangurDisplayEmoji,
  KangurEquationDisplay,
  KangurIconBadge,
} from '@/features/kangur/ui/design/primitives';
import { useLessonHubProgress } from '@/features/kangur/ui/hooks/useLessonHubProgress';

type SectionId = 'podstawy' | 'przekroczenie' | 'dwucyfrowe' | 'zapamietaj' | 'game';

export const SLIDES: Record<Exclude<SectionId, 'game'>, LessonSlide[]> = {
  podstawy: [
    {
      title: 'Co to znaczy odejmowac?',
      content: (
        <div className='flex flex-col items-center gap-4'>
          <p className='text-center [color:var(--kangur-page-text)]'>
            Odejmowanie to zabieranie czesci z grupy. Pytamy: ile zostało?
          </p>
          <div className='flex items-center gap-4'>
            <KangurDisplayEmoji size='md'>🍎🍎🍎🍎🍎</KangurDisplayEmoji>
            <KangurEquationDisplay
              accent='slate'
              as='span'
              className='[color:var(--kangur-page-muted-text)]'
              size='md'
            >
              −
            </KangurEquationDisplay>
            <KangurDisplayEmoji size='md'>🍎🍎</KangurDisplayEmoji>
            <KangurEquationDisplay
              accent='slate'
              as='span'
              className='[color:var(--kangur-page-muted-text)]'
              size='md'
            >
              =
            </KangurEquationDisplay>
            <KangurDisplayEmoji size='md'>🍎🍎🍎</KangurDisplayEmoji>
          </div>
          <KangurEquationDisplay accent='rose' size='sm'>
            5 − 2 = 3
          </KangurEquationDisplay>
        </div>
      ),
    },
    {
      title: 'Odejmowanie jednocyfrowe',
      content: (
        <div className='flex flex-col items-center gap-4'>
          <p className='text-center [color:var(--kangur-page-text)]'>
            Cofaj sie na osi liczbowej lub licz, ile brakuje do wyniku.
          </p>
          <KangurLessonCallout accent='rose' className='text-center'>
            <KangurEquationDisplay
              accent='rose'
              data-testid='subtracting-lesson-single-digit-equation'
            >
              9 − 4 = ?
            </KangurEquationDisplay>
            <p className='mt-2 [color:var(--kangur-page-muted-text)]'>
              Zacznij od <b>9</b>, cofnij sie 4: 8, 7, 6, <b>5</b> ✓
            </p>
          </KangurLessonCallout>
          <div className='flex gap-1 flex-wrap justify-center'>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <KangurIconBadge key={n} accent='rose' size='sm'>
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
      title: 'Odejmowanie z przekroczeniem 10',
      content: (
        <div className='flex flex-col items-center gap-4'>
          <p className='text-center [color:var(--kangur-page-text)]'>
            Rozdziel odjemnik na dwie czesci: najpierw zejdz do 10, potem odejmij reszte.
          </p>
          <KangurLessonCallout accent='rose' className='text-center'>
            <KangurEquationDisplay accent='rose'>13 − 5 = ?</KangurEquationDisplay>
            <p className='mt-2 [color:var(--kangur-page-muted-text)]'>
              13 − <b>3</b> = 10, 10 − <b>2</b> = <b>8</b> ✓
            </p>
          </KangurLessonCallout>
          <KangurLessonCallout
            accent='slate'
            className='max-w-xs text-sm [color:var(--kangur-page-muted-text)]'
            padding='sm'
          >
            <p>🔹 Rozłóz 5 = 3 + 2</p>
            <p>🔹 Odejmij 3: 13 − 3 = 10</p>
            <p>
              🔹 Odejmij 2: 10 − 2 = <b>8</b>
            </p>
          </KangurLessonCallout>
        </div>
      ),
    },
  ],
  dwucyfrowe: [
    {
      title: 'Odejmowanie dwucyfrowe',
      content: (
        <div className='flex flex-col items-center gap-4'>
          <p className='text-center [color:var(--kangur-page-text)]'>
            Odejmuj osobno dziesiatki i jednosci!
          </p>
          <KangurLessonCallout accent='amber' className='max-w-xs text-center'>
            <KangurEquationDisplay accent='amber'>47 − 23 = ?</KangurEquationDisplay>
            <div className='mt-2 text-left [color:var(--kangur-page-muted-text)]'>
              <p>
                🔹 Dziesiatki: <b>40 − 20 = 20</b>
              </p>
              <p>
                🔹 Jednosci: <b>7 − 3 = 4</b>
              </p>
              <KangurEquationDisplay accent='amber' className='mt-1' size='md'>
                20 + 4 = 24 ✓
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
            <ul className='space-y-2 text-sm [color:var(--kangur-page-text)]'>
              <li>
                ✅ Odejmowanie NIE jest przemienne: <b>7−3 ≠ 3−7</b>
              </li>
              <li>
                ✅ Odejmowanie 0 nic nie zmienia: <b>8−0 = 8</b>
              </li>
              <li>✅ Cofaj sie na osi lub rozkładaj na składniki</li>
              <li>
                ✅ Sprawdz wynik dodawaniem: <b>5+3=8 → 8−3=5</b>
              </li>
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
    emoji: '➖',
    title: 'Podstawy odejmowania',
    description: 'Co to odejmowanie? Jednocyfrowe',
  },
  {
    id: 'przekroczenie',
    emoji: '🔟',
    title: 'Odejmowanie przez 10',
    description: 'Rozklad przez dziesiec',
  },
  {
    id: 'dwucyfrowe',
    emoji: '💡',
    title: 'Odejmowanie dwucyfrowe',
    description: 'Dziesiatki i jednosci osobno',
  },
  { id: 'zapamietaj', emoji: '🧠', title: 'Zapamietaj!', description: 'Zasady odejmowania' },
  {
    id: 'game',
    emoji: '🎮',
    title: 'Gra z odejmowaniem',
    description: 'Cwicz w interaktywnej grze',
    isGame: true,
  },
];

export default function SubtractingLesson(): React.JSX.Element {
  const [activeSection, setActiveSection] = useState<SectionId | null>(null);
  const { markSectionOpened, markSectionViewedCount, sectionProgress } =
    useLessonHubProgress(SLIDES);

  if (activeSection === 'game') {
    return (
      <LessonActivityStage
        accent='rose'
        headerTestId='subtracting-lesson-game-header'
        icon='🎮'
        maxWidthClassName='max-w-sm'
        onBack={() => setActiveSection(null)}
        sectionHeader={HUB_SECTIONS.find((section) => section.id === activeSection) ?? null}
        shellTestId='subtracting-lesson-game-shell'
        title='Gra z odejmowaniem!'
      >
        <SubtractingGame
          finishLabel='Wróć do tematów'
          onFinish={() => setActiveSection(null)}
        />
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
        dotActiveClass='bg-red-400'
        dotDoneClass='bg-red-200'
        gradientClass='from-red-400 to-pink-400'
      />
    );
  }

  return (
    <LessonHub
      lessonEmoji='➖'
      lessonTitle='Odejmowanie'
      gradientClass='from-red-400 to-pink-400'
      progressDotClassName='bg-red-200'
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
