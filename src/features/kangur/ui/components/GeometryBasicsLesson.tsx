import { useState } from 'react';

import GeometryBasicsWorkshopGame from '@/features/kangur/ui/components/GeometryBasicsWorkshopGame';
import LessonActivityStage from '@/features/kangur/ui/components/LessonActivityStage';
import LessonHub from '@/features/kangur/ui/components/LessonHub';
import LessonSlideSection, {
  type LessonSlide,
} from '@/features/kangur/ui/components/LessonSlideSection';
import {
  GeometryAngleAnimation,
  GeometryAngleTypesAnimation,
  GeometryMovingPointAnimation,
  GeometryPointSegmentAnimation,
  GeometryRightAngleAnimation,
  GeometrySideHighlightAnimation,
  GeometryVerticesAnimation,
} from '@/features/kangur/ui/components/GeometryLessonAnimations';
import {
  KangurLessonCallout,
  KangurLessonCaption,
  KangurLessonChip,
  KangurLessonLead,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';
import { useKangurLessonPanelProgress } from '@/features/kangur/ui/hooks/useKangurLessonPanelProgress';
import {
  addXp,
  createLessonCompletionReward,
  loadProgress,
} from '@/features/kangur/ui/services/progress';

type SectionId = 'punkt' | 'bok' | 'kat' | 'podsumowanie' | 'game';

export const SLIDES: Record<Exclude<SectionId, 'game'>, LessonSlide[]> = {
  punkt: [
    {
      title: 'Punkt i odcinek',
      content: (
        <KangurLessonStack className='text-center'>
          <KangurLessonLead>
            <strong>Punkt</strong> to jedno miejsce na kartce. <strong>Odcinek</strong> łączy dwa
            punkty.
          </KangurLessonLead>
          <KangurLessonCallout accent='sky'>
            <div className='mx-auto w-full max-w-xs'>
              <GeometryPointSegmentAnimation />
            </div>
            <p className='mt-2 text-sm text-cyan-700'>Odcinek AB</p>
          </KangurLessonCallout>
          <KangurLessonCaption>
            Odcinek ma początek i koniec — to dwa punkty.
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Punkt na odcinku',
      content: (
        <KangurLessonStack className='text-center'>
          <KangurLessonLead>Punkt może leżeć gdziekolwiek na odcinku.</KangurLessonLead>
          <KangurLessonCallout accent='sky'>
            <div className='mx-auto w-full max-w-xs'>
              <GeometryMovingPointAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              To wciąż ten sam odcinek, tylko punkt się przesuwa.
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
  bok: [
    {
      title: 'Bok i wierzchołek',
      content: (
        <KangurLessonStack className='text-center'>
          <KangurLessonLead>
            W figurach wielokątnych mamy <strong>boki</strong> i <strong>wierzchołki</strong>{' '}
            (rogi).
          </KangurLessonLead>
          <KangurLessonCallout accent='slate' className='border-cyan-200/85'>
            <div className='mx-auto h-28 w-28'>
              <GeometryVerticesAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              Kwadrat ma 4 boki i 4 wierzchołki.
            </KangurLessonCaption>
          </KangurLessonCallout>
          <KangurLessonCaption>
            Boki to odcinki. Wierzchołki to punkty, w których boki się spotykają.
          </KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Policz boki',
      content: (
        <KangurLessonStack className='text-center'>
          <KangurLessonLead>Obwiedź figurę i policz każdy bok.</KangurLessonLead>
          <KangurLessonCallout accent='slate' className='border-cyan-200/85'>
            <div className='mx-auto h-28 w-28'>
              <GeometrySideHighlightAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              Każde podświetlenie to jeden bok.
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
  kat: [
    {
      title: 'Co to jest kąt?',
      content: (
        <KangurLessonStack className='text-center'>
          <KangurLessonLead>
            <strong>Kąt</strong> powstaje tam, gdzie spotykają się dwa odcinki.
          </KangurLessonLead>
          <KangurLessonCallout accent='sky'>
            <div className='mx-auto h-28 w-28'>
              <GeometryRightAngleAnimation />
            </div>
            <p className='mt-2 text-sm text-cyan-700'>To kąt prosty (90°).</p>
          </KangurLessonCallout>
          <div className='flex flex-wrap justify-center gap-2 text-xs [color:var(--kangur-page-muted-text)]'>
            <KangurLessonChip accent='sky'>Ostry &lt; 90°</KangurLessonChip>
            <KangurLessonChip accent='sky'>Prosty = 90°</KangurLessonChip>
            <KangurLessonChip accent='sky'>Rozwarty &gt; 90°</KangurLessonChip>
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Rodzaje kątów',
      content: (
        <KangurLessonStack className='text-center'>
          <KangurLessonLead>Mały, prosty i rozwarty kąt wyglądają inaczej.</KangurLessonLead>
          <KangurLessonCallout accent='sky'>
            <div className='mx-auto w-full max-w-xs'>
              <GeometryAngleTypesAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              Porównuj szerokość ramion kąta.
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
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
            ['🔷', 'Bok i wierzchołek', 'części figury'],
            ['∟', 'Kąt', 'miejsce spotkania dwóch odcinków'],
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
    {
      title: 'Punkt i odcinek',
      content: (
        <KangurLessonStack className='text-center'>
          <KangurLessonCallout accent='sky' padding='sm'>
            <GeometryPointSegmentAnimation />
            <KangurLessonCaption className='mt-2'>Punkt i odcinek.</KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Punkt na odcinku',
      content: (
        <KangurLessonStack className='text-center'>
          <KangurLessonCallout accent='sky' padding='sm'>
            <GeometryMovingPointAnimation />
            <KangurLessonCaption className='mt-2'>Punkt na odcinku.</KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Boki i wierzchołki',
      content: (
        <KangurLessonStack className='text-center'>
          <KangurLessonCallout accent='slate' padding='sm' className='border-cyan-200/85'>
            <GeometryVerticesAnimation />
            <KangurLessonCaption className='mt-2'>Boki i wierzchołki.</KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Policz boki',
      content: (
        <KangurLessonStack className='text-center'>
          <KangurLessonCallout accent='slate' padding='sm' className='border-cyan-200/85'>
            <GeometrySideHighlightAnimation />
            <KangurLessonCaption className='mt-2'>Policz boki.</KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Rodzaje kątów',
      content: (
        <KangurLessonStack className='text-center'>
          <KangurLessonCallout accent='sky' padding='sm'>
            <GeometryAngleAnimation />
            <KangurLessonCaption className='mt-2'>Rodzaje kątów.</KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: 'Ostry, prosty, rozwarty',
      content: (
        <KangurLessonStack className='text-center'>
          <KangurLessonCallout accent='sky' padding='sm'>
            <GeometryAngleTypesAnimation />
            <KangurLessonCaption className='mt-2'>Ostry, prosty, rozwarty.</KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
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
  { id: 'bok', emoji: '🔷', title: 'Bok i wierzchołek', description: 'Części figur wielokątnych' },
  { id: 'kat', emoji: '∟', title: 'Kąt', description: 'Ostry, prosty i rozwarty' },
  { id: 'podsumowanie', emoji: '📋', title: 'Podsumowanie', description: 'Wszystko razem' },
  {
    id: 'game',
    emoji: '🎯',
    title: 'Gra: Geo-misja',
    description: 'Punkt, odcinek, bok i kąt w praktyce',
    isGame: true,
  },
];

const SECTION_LABELS: Partial<Record<SectionId, string>> = Object.fromEntries(
  HUB_SECTIONS.map((section) => [section.id, section.title])
);

export default function GeometryBasicsLesson(): React.JSX.Element {
  const [activeSection, setActiveSection] = useState<SectionId | null>(null);
  const { markSectionOpened, markSectionViewedCount, recordPanelTime, sectionProgress } =
    useKangurLessonPanelProgress({
      lessonKey: 'geometry_basics',
      slideSections: SLIDES,
      sectionLabels: SECTION_LABELS,
    });

  const handleComplete = (): void => {
    const progress = loadProgress();
    const reward = createLessonCompletionReward(progress, 'geometry_basics', 100);
    addXp(reward.xp, reward.progressUpdates);
  };

  if (activeSection === 'game') {
    return (
      <LessonActivityStage
        accent='sky'
        icon='🎯'
        maxWidthClassName='max-w-3xl'
        onBack={() => setActiveSection(null)}
        sectionHeader={HUB_SECTIONS.find((section) => section.id === activeSection) ?? null}
        shellTestId='geometry-basics-game-shell'
        title='Geo-misja'
      >
        <GeometryBasicsWorkshopGame onFinish={() => setActiveSection(null)} />
      </LessonActivityStage>
    );
  }

  if (activeSection) {
    return (
      <LessonSlideSection
        slides={SLIDES[activeSection]}
        sectionHeader={HUB_SECTIONS.find((section) => section.id === activeSection) ?? null}
        onBack={() => setActiveSection(null)}
        onComplete={activeSection === 'podsumowanie' ? handleComplete : undefined}
        onProgressChange={(viewedCount) =>
          markSectionViewedCount(activeSection, viewedCount)
        }
        onPanelTimeUpdate={(panelIndex, panelTitle, seconds) =>
          recordPanelTime(activeSection, panelIndex, seconds, panelTitle)
        }
        dotActiveClass='bg-cyan-500'
        dotDoneClass='bg-cyan-300'
        gradientClass='kangur-gradient-accent-sky'
      />
    );
  }

  return (
    <LessonHub
      lessonEmoji='📐'
      lessonTitle='Podstawy geometrii'
      gradientClass='kangur-gradient-accent-sky'
      progressDotClassName='bg-cyan-300'
      sections={HUB_SECTIONS.map((section) =>
        section.isGame
          ? section
          : {
              ...section,
              progress: sectionProgress[section.id as Exclude<SectionId, 'game'>],
            }
      )}
      onSelect={(id) => {
        if (id !== 'game') {
          markSectionOpened(id as Exclude<SectionId, 'game'>);
        }
        setActiveSection(id as SectionId);
      }}
    />
  );
}
