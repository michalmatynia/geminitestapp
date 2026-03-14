import { useState } from 'react';

import LessonHub from '@/features/kangur/ui/components/LessonHub';
import LessonSlideSection, {
  type LessonSlide,
} from '@/features/kangur/ui/components/LessonSlideSection';
import { KangurLessonCallout } from '@/features/kangur/ui/design/lesson-primitives';
import {
  GeometrySymmetryAxesAnimation,
  GeometrySymmetryCheckAnimation,
  GeometrySymmetryFoldAnimation,
  GeometrySymmetryMirrorAnimation,
  GeometrySymmetryRotationAnimation,
} from '@/features/kangur/ui/components/GeometryLessonAnimations';
import { useLessonHubProgress } from '@/features/kangur/ui/hooks/useLessonHubProgress';
import {
  addXp,
  createLessonCompletionReward,
  loadProgress,
} from '@/features/kangur/ui/services/progress';

type SectionId = 'intro' | 'os' | 'figury' | 'animacje' | 'podsumowanie';

const SYMMETRY_ANIMATION_SLIDES: LessonSlide[] = [
  {
    title: 'Oś symetrii w ruchu',
    content: (
      <div className='flex flex-col gap-4 text-center'>
        <p className='[color:var(--kangur-page-text)]'>
          Oś symetrii dzieli figurę na dwie pasujące połówki.
        </p>
        <KangurLessonCallout accent='slate' className='border-emerald-200/85'>
          <div className='mx-auto h-28 w-40'>
            <GeometrySymmetryFoldAnimation />
          </div>
          <p className='mt-2 text-sm [color:var(--kangur-page-muted-text)]'>
            Jedna strona odbija się w drugiej.
          </p>
        </KangurLessonCallout>
      </div>
    ),
  },
  {
    title: 'Wiele osi symetrii',
    content: (
      <div className='flex flex-col gap-4 text-center'>
        <p className='[color:var(--kangur-page-text)]'>
          Niektóre figury mają więcej niż jedną oś.
        </p>
        <KangurLessonCallout accent='emerald'>
          <div className='mx-auto h-28 w-40'>
            <GeometrySymmetryAxesAnimation />
          </div>
          <p className='mt-2 text-sm [color:var(--kangur-page-muted-text)]'>
            Koło ma osi nieskończenie wiele.
          </p>
        </KangurLessonCallout>
      </div>
    ),
  },
  {
    title: 'Odbicie lustrzane',
    content: (
      <div className='flex flex-col gap-4 text-center'>
        <p className='[color:var(--kangur-page-text)]'>
          Gdy złożysz figurę na osi, obie strony pokrywają się.
        </p>
        <KangurLessonCallout accent='emerald'>
          <div className='mx-auto h-28 w-40'>
            <GeometrySymmetryMirrorAnimation />
          </div>
          <p className='mt-2 text-sm [color:var(--kangur-page-muted-text)]'>
            To właśnie odbicie lustrzane.
          </p>
        </KangurLessonCallout>
      </div>
    ),
  },
  {
    title: 'Symetria obrotowa',
    content: (
      <div className='flex flex-col gap-4 text-center'>
        <p className='[color:var(--kangur-page-text)]'>
          Niektóre figury wyglądają tak samo po obrocie.
        </p>
        <KangurLessonCallout accent='emerald'>
          <div className='mx-auto h-28 w-28'>
            <GeometrySymmetryRotationAnimation />
          </div>
          <p className='mt-2 text-sm [color:var(--kangur-page-muted-text)]'>
            Kwadrat ma symetrię obrotową.
          </p>
        </KangurLessonCallout>
      </div>
    ),
  },
];

export const SLIDES: Record<SectionId, LessonSlide[]> = {
  intro: [
    {
      title: 'Co to jest symetria?',
      content: (
        <div className='flex flex-col gap-4 text-center'>
          <p className='[color:var(--kangur-page-text)]'>
            Figura jest <strong>symetryczna</strong>, gdy po złożeniu na pół obie strony pasuja do
            siebie.
          </p>
          <KangurLessonCallout accent='emerald' className='text-5xl text-center'>
            🦋
            <p className='mt-2 text-sm text-emerald-700'>Motyl jest prawie symetryczny.</p>
          </KangurLessonCallout>
          <p className='text-sm [color:var(--kangur-page-muted-text)]'>
            Symetria to reguła: lewa strona = prawa strona (lub góra = dół).
          </p>
        </div>
      ),
    },
    {
      title: 'Symetria lustrzana',
      content: (
        <div className='flex flex-col gap-4 text-center'>
          <p className='[color:var(--kangur-page-text)]'>
            Oś działa jak lustro: prawa strona odbija lewą.
          </p>
          <KangurLessonCallout accent='emerald'>
            <div className='mx-auto h-28 w-40'>
              <GeometrySymmetryMirrorAnimation />
            </div>
            <p className='mt-2 text-sm [color:var(--kangur-page-muted-text)]'>
              Po złożeniu obie części są takie same.
            </p>
          </KangurLessonCallout>
        </div>
      ),
    },
  ],
  os: [
    {
      title: 'Oś symetrii',
      content: (
        <div className='flex flex-col gap-4 text-center'>
          <p className='[color:var(--kangur-page-text)]'>
            <strong>Oś symetrii</strong> to linia, po której dzielimy figurę na dwie pasujące
            części.
          </p>
          <KangurLessonCallout accent='slate' className='border-emerald-200/85'>
            <div className='mx-auto h-28 w-40'>
              <GeometrySymmetryFoldAnimation />
            </div>
            <p className='mt-2 text-sm [color:var(--kangur-page-muted-text)]'>
              Pionowa kreska to oś symetrii.
            </p>
          </KangurLessonCallout>
          <p className='text-sm [color:var(--kangur-page-muted-text)]'>
            Figura może mieć więcej niż jedną oś symetrii!
          </p>
        </div>
      ),
    },
    {
      title: 'Oś w praktyce',
      content: (
        <div className='flex flex-col gap-4 text-center'>
          <p className='[color:var(--kangur-page-text)]'>
            Linia osi pokazuje, gdzie figura się „zgina”.
          </p>
          <KangurLessonCallout accent='slate' className='border-emerald-200/85'>
            <div className='mx-auto h-28 w-40'>
              <GeometrySymmetryFoldAnimation />
            </div>
            <p className='mt-2 text-sm [color:var(--kangur-page-muted-text)]'>
              Oś dzieli figurę na dwie równe części.
            </p>
          </KangurLessonCallout>
        </div>
      ),
    },
  ],
  figury: [
    {
      title: 'Które figury są symetryczne?',
      content: (
        <div className='flex flex-col gap-3'>
          <div className='grid grid-cols-1 gap-2 text-sm min-[360px]:grid-cols-2'>
            {[
              ['✅', 'Kwadrat', 'emerald'],
              ['✅', 'Prostokąt', 'emerald'],
              ['✅', 'Koło', 'emerald'],
              ['✅', 'Trójkąt równoramienny', 'emerald'],
              ['❌', 'Dowolny zygzak', 'rose'],
              ['❌', 'Nieregularny wielokąt', 'rose'],
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
          <p className='text-center text-xs [color:var(--kangur-page-muted-text)]'>
            Koło ma nieskończoną liczbę osi symetrii!
          </p>
        </div>
      ),
    },
    {
      title: 'Symetryczne czy nie?',
      content: (
        <div className='flex flex-col gap-3 text-center'>
          <KangurLessonCallout accent='emerald'>
            <div className='mx-auto h-28 w-48'>
              <GeometrySymmetryCheckAnimation />
            </div>
            <p className='mt-2 text-sm [color:var(--kangur-page-muted-text)]'>
              Symetryczne figury mają pasujące połówki.
            </p>
          </KangurLessonCallout>
        </div>
      ),
    },
    {
      title: 'Symetria obrotowa',
      content: (
        <div className='flex flex-col gap-3 text-center'>
          <KangurLessonCallout accent='emerald'>
            <div className='mx-auto h-28 w-28'>
              <GeometrySymmetryRotationAnimation />
            </div>
            <p className='mt-2 text-sm [color:var(--kangur-page-muted-text)]'>
              Obrót nie zmienia wyglądu figury.
            </p>
          </KangurLessonCallout>
        </div>
      ),
    },
  ],
  animacje: SYMMETRY_ANIMATION_SLIDES,
  podsumowanie: [
    {
      title: 'Podsumowanie',
      content: (
        <div className='space-y-3'>
          {[
            'Symetria oznacza, że dwie strony są takie same.',
            'Oś symetrii to linia dzieląca figurę na dwie pasujące części.',
            'Wiele figur ma więcej niż jedną oś symetrii.',
            'Koło ma nieskończoną liczbę osi symetrii.',
          ].map((text) => (
            <KangurLessonCallout
              key={text}
              accent='emerald'
              className='text-sm [color:var(--kangur-page-text)]'
              padding='sm'
            >
              ✅ {text}
            </KangurLessonCallout>
          ))}
        </div>
      ),
    },
    {
      title: 'Podsumowanie w ruchu',
      content: (
        <div className='grid gap-3 text-center sm:grid-cols-2'>
          <KangurLessonCallout accent='emerald' padding='sm'>
            <div className='mx-auto h-28 w-40'>
              <GeometrySymmetryFoldAnimation />
            </div>
            <p className='mt-2 text-sm [color:var(--kangur-page-muted-text)]'>
              Złóż figurę wzdłuż osi.
            </p>
          </KangurLessonCallout>
          <KangurLessonCallout accent='emerald' padding='sm'>
            <div className='mx-auto h-28 w-40'>
              <GeometrySymmetryAxesAnimation />
            </div>
            <p className='mt-2 text-sm [color:var(--kangur-page-muted-text)]'>
              Symetria to zgodność po obu stronach osi.
            </p>
          </KangurLessonCallout>
          <KangurLessonCallout accent='emerald' padding='sm'>
            <div className='mx-auto h-28 w-40'>
              <GeometrySymmetryMirrorAnimation />
            </div>
            <p className='mt-2 text-sm [color:var(--kangur-page-muted-text)]'>
              Odbicie lustrzane po osi.
            </p>
          </KangurLessonCallout>
          <KangurLessonCallout accent='emerald' padding='sm'>
            <div className='mx-auto h-28 w-28'>
              <GeometrySymmetryRotationAnimation />
            </div>
            <p className='mt-2 text-sm [color:var(--kangur-page-muted-text)]'>
              Symetria obrotowa.
            </p>
          </KangurLessonCallout>
        </div>
      ),
    },
  ],
};

export const HUB_SECTIONS = [
  { id: 'intro', emoji: '🦋', title: 'Co to symetria?', description: 'Definicja i przykłady' },
  { id: 'os', emoji: '|', title: 'Oś symetrii', description: 'Linia podziału figury' },
  {
    id: 'figury',
    emoji: '🔵',
    title: 'Figury symetryczne',
    description: 'Które figury maja symetrię?',
  },
  {
    id: 'animacje',
    emoji: '🎞️',
    title: 'Animacje',
    description: 'Symetria w ruchu',
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
        gradientClass='kangur-gradient-accent-emerald'
      />
    );
  }

  return (
    <LessonHub
      lessonEmoji='🪞'
      lessonTitle='Symetria'
      gradientClass='kangur-gradient-accent-emerald'
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
