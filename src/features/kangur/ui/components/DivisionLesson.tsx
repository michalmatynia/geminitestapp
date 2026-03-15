import { useState } from 'react';

import DivisionGroupsGame from '@/features/kangur/ui/components/DivisionGroupsGame';
import LessonActivityStage from '@/features/kangur/ui/components/LessonActivityStage';
import LessonHub from '@/features/kangur/ui/components/LessonHub';
import LessonSlideSection, {
  type LessonSlide,
} from '@/features/kangur/ui/components/LessonSlideSection';
import {
  DivisionEqualGroupsAnimation,
  DivisionInverseAnimation,
  DivisionRemainderAnimation,
} from '@/features/kangur/ui/components/LessonAnimations';
import {
  KangurLessonCallout,
  KangurLessonCaption,
  KangurLessonLead,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';
import {
  KangurDisplayEmoji,
  KangurEquationDisplay,
} from '@/features/kangur/ui/design/primitives';
import { useLessonHubProgress } from '@/features/kangur/ui/hooks/useLessonHubProgress';

type SectionId = 'intro' | 'odwrotnosc' | 'reszta' | 'zapamietaj' | 'game';

export const SLIDES: Record<Exclude<SectionId, 'game'>, LessonSlide[]> = {
  intro: [
    {
      title: 'Co to znaczy dzielić?',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Dzielenie to równy podział na grupy. Pytamy: ile w każdej grupie?
          </KangurLessonLead>
          <KangurLessonStack gap='sm'>
            <KangurDisplayEmoji size='sm'>🍪🍪🍪🍪🍪🍪</KangurDisplayEmoji>
            <KangurLessonCaption>
              6 ciastek podzielone na 2 osoby
            </KangurLessonCaption>
            <KangurEquationDisplay accent='sky' size='md'>
              6 ÷ 2 = 3
            </KangurEquationDisplay>
            <div className='flex gap-4'>
              <KangurDisplayEmoji size='xs'>🧒🍪🍪🍪</KangurDisplayEmoji>
              <KangurDisplayEmoji size='xs'>🧒🍪🍪🍪</KangurDisplayEmoji>
            </div>
          </KangurLessonStack>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Dzielenie w ruchu (SVG)',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Dzielimy równo: każda grupa dostaje tyle samo elementów.
          </KangurLessonLead>
          <KangurLessonCallout accent='sky' className='text-center'>
            <div className='mx-auto w-full max-w-sm'>
              <DivisionEqualGroupsAnimation />
            </div>
            <KangurEquationDisplay accent='sky' className='mt-2' size='sm'>
              12 ÷ 3 = 4
            </KangurEquationDisplay>
            <KangurLessonCaption className='mt-1'>3 grupy po 4.</KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
  odwrotnosc: [
    {
      title: 'Dzielenie i mnożenie',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Każde mnożenie ma swoje dzielenie!
          </KangurLessonLead>
          <KangurLessonCallout accent='sky' className='max-w-xs'>
            <div className='flex flex-col gap-2 text-center'>
              <p className='[color:var(--kangur-page-text)]'>
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
          <KangurLessonCaption>
            Znając tabliczkę mnożenia, znasz też tabliczkę dzielenia!
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Odwrotność w animacji',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>Dzielenie i mnożenie to odwrotne działania.</KangurLessonLead>
          <KangurLessonCallout accent='sky' className='text-center'>
            <div className='mx-auto w-full max-w-sm'>
              <DivisionInverseAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              Jeśli 4 × 3 = 12, to 12 ÷ 3 = 4.
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
  reszta: [
    {
      title: 'Reszta z dzielenia',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>
            Nie zawsze dzielenie wychodzi równo — wtedy zostaje reszta.
          </KangurLessonLead>
          <KangurLessonCallout accent='teal' className='max-w-xs text-center'>
            <KangurEquationDisplay accent='teal' data-testid='division-lesson-remainder-equation'>
              7 ÷ 2 = ?
            </KangurEquationDisplay>
            <KangurLessonCaption className='mt-2'>
              2×3=6 (za mało), 2×4=8 (za dużo)
            </KangurLessonCaption>
            <KangurEquationDisplay accent='teal' className='mt-1' size='md'>
              7 ÷ 2 = <b>3</b> reszta <b>1</b>
            </KangurEquationDisplay>
          </KangurLessonCallout>
          <KangurDisplayEmoji size='xs'>🍫🍫🍫🍫🍫🍫🍫</KangurDisplayEmoji>
          <KangurLessonCaption>
            7 czekolad → 3 dla każdego, 1 zostaje
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Reszta w ruchu',
      content: (
        <KangurLessonStack>
          <KangurLessonLead>Gdy nie da się podzielić równo, coś zostaje.</KangurLessonLead>
          <KangurLessonCallout accent='teal' className='text-center'>
            <div className='mx-auto w-full max-w-sm'>
              <DivisionRemainderAnimation />
            </div>
            <KangurEquationDisplay accent='teal' className='mt-2' size='sm'>
              7 ÷ 2 = 3 r 1
            </KangurEquationDisplay>
            <KangurLessonCaption className='mt-1'>
              3 pełne pary i 1 zostaje.
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
  zapamietaj: [
    {
      title: 'Zapamiętaj!',
      content: (
        <KangurLessonStack>
          <KangurLessonCallout accent='amber' className='max-w-xs'>
            <ul className='space-y-2 text-sm [color:var(--kangur-page-text)]'>
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
              <li>✅ Sprawdź: wynik × dzielnik + reszta = liczba</li>
            </ul>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Równe grupy',
      content: (
        <KangurLessonStack>
          <KangurLessonCallout
            accent='sky'
            className='w-full max-w-md text-center'
            padding='sm'
          >
            <div className='mx-auto w-full max-w-[320px]'>
              <DivisionEqualGroupsAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              Dziel równo na grupy – każda grupa ma tyle samo.
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Odwrotność',
      content: (
        <KangurLessonStack>
          <KangurLessonCallout
            accent='indigo'
            className='w-full max-w-md text-center'
            padding='sm'
          >
            <div className='mx-auto w-full max-w-[320px]'>
              <DivisionInverseAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              Dzielenie i mnożenie to działania odwrotne.
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Reszta',
      content: (
        <KangurLessonStack>
          <KangurLessonCallout
            accent='teal'
            className='w-full max-w-md text-center'
            padding='sm'
          >
            <div className='mx-auto w-full max-w-[320px]'>
              <DivisionRemainderAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              Reszta pokazuje, co zostaje poza pełnymi grupami.
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
};

export const HUB_SECTIONS = [
  { id: 'intro', emoji: '÷', title: 'Co to dzielenie?', description: 'Podział na równe grupy' },
  {
    id: 'odwrotnosc',
    emoji: '🔄',
    title: 'Dzielenie i mnożenie',
    description: 'Odwrotne działania',
  },
  { id: 'reszta', emoji: '🍫', title: 'Reszta z dzielenia', description: 'Gdy nie wychodzi równo' },
  { id: 'zapamietaj', emoji: '🧠', title: 'Zapamiętaj!', description: 'Ważne zasady dzielenia' },
  {
    id: 'game',
    emoji: '🎮',
    title: 'Gra z dzieleniem',
    description: 'Podziel elementy na równe grupy',
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
        maxWidthClassName='max-w-none'
        onBack={() => setActiveSection(null)}
        sectionHeader={HUB_SECTIONS.find((section) => section.id === activeSection) ?? null}
        shellTestId='division-lesson-game-shell'
        title='Gra z dzieleniem!'
      >
        <DivisionGroupsGame
          finishLabelVariant='topics'
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
        dotActiveClass='bg-blue-500'
        dotDoneClass='bg-blue-300'
        gradientClass='kangur-gradient-accent-teal'
      />
    );
  }

  return (
    <LessonHub
      lessonEmoji='➗'
      lessonTitle='Dzielenie'
      gradientClass='kangur-gradient-accent-teal'
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
