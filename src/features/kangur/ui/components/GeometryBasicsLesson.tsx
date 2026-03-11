import { useState } from 'react';

import LessonHub from '@/features/kangur/ui/components/LessonHub';
import LessonSlideSection, {
  type LessonSlide,
} from '@/features/kangur/ui/components/LessonSlideSection';
import {
  KangurLessonCallout,
  KangurLessonChip,
} from '@/features/kangur/ui/design/lesson-primitives';
import { useLessonHubProgress } from '@/features/kangur/ui/hooks/useLessonHubProgress';
import {
  addXp,
  createLessonCompletionReward,
  loadProgress,
} from '@/features/kangur/ui/services/progress';

type SectionId = 'punkt' | 'bok' | 'kat' | 'podsumowanie';

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  punkt: [
    {
      title: 'Punkt i odcinek',
      content: (
        <div className='flex flex-col gap-4 text-center'>
          <p className='[color:var(--kangur-page-text)]'>
            <strong>Punkt</strong> to jedno miejsce na kartce. <strong>Odcinek</strong> łączy dwa
            punkty.
          </p>
          <KangurLessonCallout accent='sky'>
            <div className='mx-auto flex max-w-xs items-center justify-between'>
              <span className='text-xl'>● A</span>
              <span className='h-1 flex-1 rounded bg-cyan-500 mx-2' />
              <span className='text-xl'>B ●</span>
            </div>
            <p className='mt-2 text-sm text-cyan-700'>Odcinek AB</p>
          </KangurLessonCallout>
          <p className='text-sm [color:var(--kangur-page-muted-text)]'>
            Odcinek ma poczatek i koniec — to dwa punkty.
          </p>
        </div>
      ),
    },
  ],
  bok: [
    {
      title: 'Bok i wierzchołek',
      content: (
        <div className='flex flex-col gap-4 text-center'>
          <p className='[color:var(--kangur-page-text)]'>
            W figurach wielokatnych mamy <strong>boki</strong> i <strong>wierzchołki</strong>{' '}
            (rogi).
          </p>
          <KangurLessonCallout accent='slate' className='border-cyan-200/85'>
            <div className='mx-auto h-28 w-28 rotate-45 rounded-sm border-[6px] border-cyan-500' />
            <p className='mt-2 text-sm [color:var(--kangur-page-muted-text)]'>
              Kwadrat ma 4 boki i 4 wierzchołki.
            </p>
          </KangurLessonCallout>
          <p className='text-sm [color:var(--kangur-page-muted-text)]'>
            Boki to odcinki. Wierzchołki to punkty, w których boki sie spotykaja.
          </p>
        </div>
      ),
    },
  ],
  kat: [
    {
      title: 'Co to jest kat?',
      content: (
        <div className='flex flex-col gap-4 text-center'>
          <p className='[color:var(--kangur-page-text)]'>
            <strong>Kat</strong> powstaje tam, gdzie spotykaja sie dwa odcinki.
          </p>
          <KangurLessonCallout accent='sky'>
            <div className='relative mx-auto h-28 w-28'>
              <div className='absolute left-1/2 top-1/2 h-1 w-20 -translate-y-1/2 rounded bg-cyan-600' />
              <div className='absolute left-1/2 top-1/2 h-20 w-1 -translate-x-1/2 rounded bg-cyan-600' />
              <div className='absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-cyan-700'>
                ∟
              </div>
            </div>
            <p className='mt-2 text-sm text-cyan-700'>To kat prosty (90°).</p>
          </KangurLessonCallout>
          <div className='flex flex-wrap justify-center gap-2 text-xs [color:var(--kangur-page-muted-text)]'>
            <KangurLessonChip accent='sky'>Ostry &lt; 90°</KangurLessonChip>
            <KangurLessonChip accent='sky'>Prosty = 90°</KangurLessonChip>
            <KangurLessonChip accent='sky'>Rozwarty &gt; 90°</KangurLessonChip>
          </div>
        </div>
      ),
    },
  ],
  podsumowanie: [
    {
      title: 'Podsumowanie',
      content: (
        <div className='flex flex-col gap-3'>
          {[
            ['●', 'Punkt', 'pojedyncze miejsce'],
            ['—', 'Odcinek', 'łączy dwa punkty'],
            ['🔷', 'Bok i wierzchołek', 'czesci figury'],
            ['∟', 'Kat', 'miejsce spotkania dwóch odcinków'],
          ].map(([icon, term, def]) => (
            <KangurLessonCallout
              key={term}
              accent='sky'
              className='flex gap-3 items-start text-sm [color:var(--kangur-page-text)]'
              padding='sm'
            >
              <span className='font-bold text-cyan-600 w-5'>{icon}</span>
              <span>
                <strong>{term}</strong>: {def}
              </span>
            </KangurLessonCallout>
          ))}
        </div>
      ),
    },
  ],
};

export const HUB_SECTIONS = [
  {
    id: 'punkt',
    emoji: '●',
    title: 'Punkt i odcinek',
    description: 'Podstawowe elementy geometrii',
  },
  { id: 'bok', emoji: '🔷', title: 'Bok i wierzchołek', description: 'Czesci figur wielokatnych' },
  { id: 'kat', emoji: '∟', title: 'Kat', description: 'Ostry, prosty i rozwarty' },
  { id: 'podsumowanie', emoji: '📋', title: 'Podsumowanie', description: 'Wszystko razem' },
];

export default function GeometryBasicsLesson(): React.JSX.Element {
  const [activeSection, setActiveSection] = useState<SectionId | null>(null);
  const { markSectionOpened, markSectionViewedCount, sectionProgress } =
    useLessonHubProgress(SLIDES);

  const handleComplete = (): void => {
    const progress = loadProgress();
    const reward = createLessonCompletionReward(progress, 'geometry_basics', 100);
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
        dotActiveClass='bg-cyan-500'
        dotDoneClass='bg-cyan-300'
        gradientClass='from-cyan-500 to-sky-500'
      />
    );
  }

  return (
    <LessonHub
      lessonEmoji='📐'
      lessonTitle='Podstawy geometrii'
      gradientClass='from-cyan-500 to-sky-500'
      progressDotClassName='bg-cyan-300'
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
