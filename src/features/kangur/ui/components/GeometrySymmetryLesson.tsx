import { useState } from 'react';

import LessonHub from '@/features/kangur/ui/components/LessonHub';
import LessonSlideSection, {
  type LessonSlide,
} from '@/features/kangur/ui/components/LessonSlideSection';
import { KangurLessonCallout } from '@/features/kangur/ui/design/lesson-primitives';
import { useLessonHubProgress } from '@/features/kangur/ui/hooks/useLessonHubProgress';
import {
  addXp,
  createLessonCompletionReward,
  loadProgress,
} from '@/features/kangur/ui/services/progress';

type SectionId = 'intro' | 'os' | 'figury' | 'podsumowanie';

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  intro: [
    {
      title: 'Co to jest symetria?',
      content: (
        <div className='flex flex-col gap-4 text-center'>
          <p className='text-slate-700'>
            Figura jest <strong>symetryczna</strong>, gdy po złożeniu na pół obie strony pasuja do
            siebie.
          </p>
          <KangurLessonCallout accent='emerald' className='text-5xl text-center'>
            🦋
            <p className='mt-2 text-sm text-emerald-700'>Motyl jest prawie symetryczny.</p>
          </KangurLessonCallout>
          <p className='text-sm text-slate-500'>
            Symetria to reguła: lewa strona = prawa strona (lub góra = dół).
          </p>
        </div>
      ),
    },
  ],
  os: [
    {
      title: 'Os symetrii',
      content: (
        <div className='flex flex-col gap-4 text-center'>
          <p className='text-slate-700'>
            <strong>Os symetrii</strong> to linia, po której dzielimy figurę na dwie pasujace
            czesci.
          </p>
          <KangurLessonCallout accent='slate' className='border-emerald-200/85'>
            <div className='mx-auto flex h-28 w-40 items-center justify-center gap-4'>
              <div className='h-20 w-16 rounded-l-full bg-emerald-300' />
              <div className='h-24 w-0.5 bg-emerald-600' />
              <div className='h-20 w-16 rounded-r-full bg-emerald-300' />
            </div>
            <p className='mt-2 text-sm text-slate-600'>Pionowa kreska to os symetrii.</p>
          </KangurLessonCallout>
          <p className='text-sm text-slate-500'>Figura może miec więcej niż jedna os symetrii!</p>
        </div>
      ),
    },
  ],
  figury: [
    {
      title: 'Które figury sa symetryczne?',
      content: (
        <div className='flex flex-col gap-3'>
          <div className='grid grid-cols-2 gap-2 text-sm'>
            {[
              ['✅', 'Kwadrat', 'emerald'],
              ['✅', 'Prostokąt', 'emerald'],
              ['✅', 'Koło', 'emerald'],
              ['✅', 'Trójkąt równoramienny', 'emerald'],
              ['❌', 'Dowolny zygzak', 'rose'],
              ['❌', 'Nieregularny wielokat', 'rose'],
            ].map(([icon, name, accent]) => (
              <KangurLessonCallout
                key={name}
                accent={accent as 'emerald' | 'rose'}
                className='text-center'
                padding='sm'
              >
                {icon} {name}
              </KangurLessonCallout>
            ))}
          </div>
          <p className='text-center text-xs text-slate-500'>
            Koło ma nieskonczona liczbe osi symetrii!
          </p>
        </div>
      ),
    },
  ],
  podsumowanie: [
    {
      title: 'Podsumowanie',
      content: (
        <div className='space-y-3'>
          {[
            'Symetria oznacza, że dwie strony sa takie same.',
            'Os symetrii to linia dzielaca figurę na dwie pasujace czesci.',
            'Wiele figur ma więcej niż jedna os symetrii.',
            'Koło ma nieskonczona liczbe osi symetrii.',
          ].map((text) => (
            <KangurLessonCallout
              key={text}
              accent='emerald'
              className='text-sm text-slate-700'
              padding='sm'
            >
              ✅ {text}
            </KangurLessonCallout>
          ))}
        </div>
      ),
    },
  ],
};

export const HUB_SECTIONS = [
  { id: 'intro', emoji: '🦋', title: 'Co to symetria?', description: 'Definicja i przykłady' },
  { id: 'os', emoji: '|', title: 'Os symetrii', description: 'Linia podziału figury' },
  {
    id: 'figury',
    emoji: '🔵',
    title: 'Figury symetryczne',
    description: 'Które figury maja symetrię?',
  },
  { id: 'podsumowanie', emoji: '📋', title: 'Podsumowanie', description: 'Wszystko razem' },
];

export default function GeometrySymmetryLesson(): React.JSX.Element {
  const [activeSection, setActiveSection] = useState<SectionId | null>(null);
  const { markSectionOpened, markSectionViewedCount, sectionProgress } =
    useLessonHubProgress(SLIDES);

  const handleComplete = (): void => {
    const progress = loadProgress();
    const reward = createLessonCompletionReward(progress, 'geometry_symmetry', 100);
    addXp(reward.xp, reward.progressUpdates);
  };

  if (activeSection) {
    return (
      <LessonSlideSection
        slides={SLIDES[activeSection]}
        sectionHeader={HUB_SECTIONS.find((section) => section.id === activeSection) ?? null}
        onBack={() => setActiveSection(null)}
        onComplete={activeSection === 'podsumowanie' ? handleComplete : undefined}
        onProgressChange={(viewedCount) => markSectionViewedCount(activeSection, viewedCount)}
        dotActiveClass='bg-emerald-500'
        dotDoneClass='bg-emerald-300'
        gradientClass='from-emerald-500 to-lime-500'
      />
    );
  }

  return (
    <LessonHub
      lessonEmoji='🪞'
      lessonTitle='Symetria'
      gradientClass='from-emerald-500 to-lime-500'
      progressDotClassName='bg-emerald-300'
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
