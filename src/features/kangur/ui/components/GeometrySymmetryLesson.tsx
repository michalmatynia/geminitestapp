'use client';

import { useState } from 'react';

import LessonActivityStage from '@/features/kangur/ui/components/LessonActivityStage';
import LessonHub from '@/features/kangur/ui/components/LessonHub';
import LessonSlideSection, {
  type LessonSlide,
} from '@/features/kangur/ui/components/LessonSlideSection';
import GeometrySymmetryGame from '@/features/kangur/ui/components/GeometrySymmetryGame';
import { KangurLessonCallout } from '@/features/kangur/ui/design/lesson-primitives';
import {
  GeometrySymmetryAxesAnimation,
  GeometrySymmetryCheckAnimation,
  GeometrySymmetryFoldAnimation,
  GeometrySymmetryMirrorAnimation,
  GeometrySymmetryRotationAnimation,
} from '@/features/kangur/ui/components/GeometryLessonAnimations';
import { useKangurLessonPanelProgress } from '@/features/kangur/ui/hooks/useKangurLessonPanelProgress';
import {
  addXp,
  createLessonCompletionReward,
  loadProgress,
} from '@/features/kangur/ui/services/progress';

type SectionId = 'intro' | 'os' | 'figury' | 'podsumowanie' | 'game';
type SlideSectionId = Exclude<SectionId, 'game'>;

export const SLIDES: Record<SlideSectionId, LessonSlide[]> = {
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
      title: 'Podsumowanie: oś symetrii',
      content: (
        <div className='flex flex-col gap-3 text-center'>
          <KangurLessonCallout accent='emerald' padding='sm'>
            <div className='mx-auto h-28 w-40'>
              <GeometrySymmetryFoldAnimation />
            </div>
            <p className='mt-2 text-sm [color:var(--kangur-page-muted-text)]'>
              Złóż figurę wzdłuż osi.
            </p>
          </KangurLessonCallout>
        </div>
      ),
    },
    {
      title: 'Podsumowanie: wiele osi',
      content: (
        <div className='flex flex-col gap-3 text-center'>
          <KangurLessonCallout accent='emerald' padding='sm'>
            <div className='mx-auto h-28 w-40'>
              <GeometrySymmetryAxesAnimation />
            </div>
            <p className='mt-2 text-sm [color:var(--kangur-page-muted-text)]'>
              Symetria to zgodność po obu stronach osi.
            </p>
          </KangurLessonCallout>
        </div>
      ),
    },
    {
      title: 'Podsumowanie: odbicie lustrzane',
      content: (
        <div className='flex flex-col gap-3 text-center'>
          <KangurLessonCallout accent='emerald' padding='sm'>
            <div className='mx-auto h-28 w-40'>
              <GeometrySymmetryMirrorAnimation />
            </div>
            <p className='mt-2 text-sm [color:var(--kangur-page-muted-text)]'>
              Odbicie lustrzane po osi.
            </p>
          </KangurLessonCallout>
        </div>
      ),
    },
    {
      title: 'Podsumowanie: symetria obrotowa',
      content: (
        <div className='flex flex-col gap-3 text-center'>
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
  { id: 'podsumowanie', emoji: '📋', title: 'Podsumowanie', description: 'Wszystko razem' },
  {
    id: 'game',
    emoji: '🎯',
    title: 'Lustra symetrii',
    description: 'Narysuj oś i dorysuj odbicie',
    isGame: true,
  },
];

const SECTION_LABELS: Partial<Record<SectionId, string>> = Object.fromEntries(
  HUB_SECTIONS.map((section) => [section.id, section.title])
);

export default function GeometrySymmetryLesson(): React.JSX.Element {
  const [activeSection, setActiveSection] = useState<SectionId | null>(null);
  const { markSectionOpened, markSectionViewedCount, recordPanelTime, sectionProgress } =
    useKangurLessonPanelProgress({
      lessonKey: 'geometry_symmetry',
      slideSections: SLIDES,
      sectionLabels: SECTION_LABELS,
    });

  const handleComplete = (): void => {
    const progress = loadProgress();
    const reward = createLessonCompletionReward(progress, 'geometry_symmetry', 100);
    addXp(reward.xp, reward.progressUpdates);
  };

  if (activeSection === 'game') {
    const gameSection = HUB_SECTIONS.find((section) => section.id === activeSection) ?? null;
    return (
      <LessonActivityStage
        accent='emerald'
        icon='🪞'
        maxWidthClassName='max-w-2xl'
        onBack={() => setActiveSection(null)}
        sectionHeader={gameSection}
        shellTestId='geometry-symmetry-game-shell'
        title='Lustra symetrii'
      >
        <GeometrySymmetryGame onFinish={() => setActiveSection(null)} />
      </LessonActivityStage>
    );
  }

  if (activeSection) {
    return (
      <LessonSlideSection
        slides={SLIDES[activeSection as SlideSectionId]}
        sectionHeader={HUB_SECTIONS.find((section) => section.id === activeSection) ?? null}
        onBack={() => setActiveSection(null)}
        onComplete={activeSection === 'podsumowanie' ? handleComplete : undefined}
        onProgressChange={(viewedCount) =>
          markSectionViewedCount(activeSection as SlideSectionId, viewedCount)
        }
        onPanelTimeUpdate={(panelIndex, panelTitle, seconds) =>
          recordPanelTime(activeSection as SlideSectionId, panelIndex, seconds, panelTitle)
        }
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
      sections={HUB_SECTIONS.map((section) =>
        section.isGame
          ? section
          : {
            ...section,
            progress: sectionProgress[section.id as SlideSectionId],
          }
      )}
      onSelect={(id) => {
        if (id !== 'game') {
          markSectionOpened(id as SlideSectionId);
        }
        setActiveSection(id as SectionId);
      }}
    />
  );
}
