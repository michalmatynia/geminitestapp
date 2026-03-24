'use client';

import { useTranslations } from 'next-intl';

import plMessages from '@/i18n/messages/pl.json';
import GeometryBasicsWorkshopGame from '@/features/kangur/ui/components/GeometryBasicsWorkshopGame';
import type { LessonSlide } from '@/features/kangur/ui/components/LessonSlideSection';
import {
  GeometryAngleAnimation,
  GeometryAngleTypesAnimation,
  GeometryMovingPointAnimation,
  GeometryPointSegmentAnimation,
  GeometryRightAngleAnimation,
  GeometrySideHighlightAnimation,
  GeometryVerticesAnimation,
} from './GeometryLessonAnimations';
import {
  KangurLessonCallout,
  KangurLessonCaption,
  KangurLessonChip,
  KangurLessonLead,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';
import type { LessonTranslate } from '@/features/kangur/ui/components/lesson-copy';
import { KangurUnifiedLesson } from '@/features/kangur/ui/lessons/lesson-components';

type SectionId = 'punkt' | 'bok' | 'kat' | 'podsumowanie' | 'game';

const createStaticTranslator = (messages: Record<string, unknown>): LessonTranslate => (key) => {
  const resolved = key.split('.').reduce<unknown>(
    (current, segment) =>
      typeof current === 'object' && current !== null
        ? (current as Record<string, unknown>)[segment]
        : undefined,
    messages
  );

  return typeof resolved === 'string' ? resolved : key;
};

const buildGeometryBasicsSlides = (
  translations: LessonTranslate
): Record<Exclude<SectionId, 'game'>, LessonSlide[]> => ({
  punkt: [
    {
      title: translations('slides.punkt.segment.title'),
      content: (
        <KangurLessonStack className='text-center'>
          <KangurLessonLead>
            <strong>{translations('terms.point')}</strong> {translations('slides.punkt.segment.pointLead')}{' '}
            <strong>{translations('terms.segment')}</strong>{' '}
            {translations('slides.punkt.segment.segmentLead')}
          </KangurLessonLead>
          <KangurLessonCallout accent='sky'>
            <div className='mx-auto w-full max-w-xs'>
              <GeometryPointSegmentAnimation />
            </div>
            <p className='mt-2 text-sm text-cyan-700'>
              {translations('slides.punkt.segment.segmentLabel')}
            </p>
          </KangurLessonCallout>
          <KangurLessonCaption>{translations('slides.punkt.segment.caption')}</KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
    {
      title: translations('slides.punkt.pointOnSegment.title'),
      content: (
        <KangurLessonStack className='text-center'>
          <KangurLessonLead>{translations('slides.punkt.pointOnSegment.lead')}</KangurLessonLead>
          <KangurLessonCallout accent='sky'>
            <div className='mx-auto w-full max-w-xs'>
              <GeometryMovingPointAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              {translations('slides.punkt.pointOnSegment.caption')}
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
  bok: [
    {
      title: translations('slides.bok.sideAndVertex.title'),
      content: (
        <KangurLessonStack className='text-center'>
          <KangurLessonLead>{translations('slides.bok.sideAndVertex.lead')}</KangurLessonLead>
          <KangurLessonCallout accent='slate' className='border-cyan-200/85'>
            <div className='mx-auto h-28 w-28 max-w-full'>
              <GeometryVerticesAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              {translations('slides.bok.sideAndVertex.caption')}
            </KangurLessonCaption>
          </KangurLessonCallout>
          <KangurLessonCaption>{translations('slides.bok.sideAndVertex.note')}</KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
    {
      title: translations('slides.bok.countSides.title'),
      content: (
        <KangurLessonStack className='text-center'>
          <KangurLessonLead>{translations('slides.bok.countSides.lead')}</KangurLessonLead>
          <KangurLessonCallout accent='slate' className='border-cyan-200/85'>
            <div className='mx-auto h-28 w-28 max-w-full'>
              <GeometrySideHighlightAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              {translations('slides.bok.countSides.caption')}
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
  kat: [
    {
      title: translations('slides.kat.whatIsAngle.title'),
      content: (
        <KangurLessonStack className='text-center'>
          <KangurLessonLead>{translations('slides.kat.whatIsAngle.lead')}</KangurLessonLead>
          <KangurLessonCallout accent='sky'>
            <div className='mx-auto h-28 w-28 max-w-full'>
              <GeometryRightAngleAnimation />
            </div>
            <p className='mt-2 text-sm text-cyan-700'>
              {translations('slides.kat.whatIsAngle.rightAngleCaption')}
            </p>
          </KangurLessonCallout>
          <div className='flex flex-wrap justify-center gap-2 text-xs [color:var(--kangur-page-muted-text)]'>
            <KangurLessonChip accent='sky'>{translations('slides.kat.whatIsAngle.chips.acute')}</KangurLessonChip>
            <KangurLessonChip accent='sky'>{translations('slides.kat.whatIsAngle.chips.right')}</KangurLessonChip>
            <KangurLessonChip accent='sky'>{translations('slides.kat.whatIsAngle.chips.obtuse')}</KangurLessonChip>
          </div>
        </KangurLessonStack>
      ),
    },
    {
      title: translations('slides.kat.angleTypes.title'),
      content: (
        <KangurLessonStack className='text-center'>
          <KangurLessonLead>{translations('slides.kat.angleTypes.lead')}</KangurLessonLead>
          <KangurLessonCallout accent='sky'>
            <div className='mx-auto w-full max-w-xs'>
              <GeometryAngleTypesAnimation />
            </div>
            <KangurLessonCaption className='mt-2'>
              {translations('slides.kat.angleTypes.caption')}
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
  podsumowanie: [
    {
      title: translations('slides.podsumowanie.overview.title'),
      content: (
        <div className='flex flex-col kangur-panel-gap'>
          {[
            {
              icon: '●',
              term: translations('slides.podsumowanie.overview.items.point.term'),
              definition: translations('slides.podsumowanie.overview.items.point.definition'),
            },
            {
              icon: '—',
              term: translations('slides.podsumowanie.overview.items.segment.term'),
              definition: translations('slides.podsumowanie.overview.items.segment.definition'),
            },
            {
              icon: '🔷',
              term: translations('slides.podsumowanie.overview.items.sideAndVertex.term'),
              definition: translations('slides.podsumowanie.overview.items.sideAndVertex.definition'),
            },
            {
              icon: '∟',
              term: translations('slides.podsumowanie.overview.items.angle.term'),
              definition: translations('slides.podsumowanie.overview.items.angle.definition'),
            },
          ].map((item) => (
            <KangurLessonCallout
              key={item.term}
              accent='sky'
              className='flex kangur-panel-gap items-start text-sm [color:var(--kangur-page-text)]'
              padding='sm'
            >
              <span className='w-5 font-bold text-cyan-600'>{item.icon}</span>
              <span>
                <strong>{item.term}</strong>: {item.definition}
              </span>
            </KangurLessonCallout>
          ))}
        </div>
      ),
    },
    {
      title: translations('slides.podsumowanie.pointAndSegment.title'),
      content: (
        <KangurLessonStack className='text-center'>
          <KangurLessonCallout accent='sky' padding='sm'>
            <GeometryPointSegmentAnimation />
            <KangurLessonCaption className='mt-2'>
              {translations('slides.podsumowanie.pointAndSegment.caption')}
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: translations('slides.podsumowanie.pointOnSegment.title'),
      content: (
        <KangurLessonStack className='text-center'>
          <KangurLessonCallout accent='sky' padding='sm'>
            <GeometryMovingPointAnimation />
            <KangurLessonCaption className='mt-2'>
              {translations('slides.podsumowanie.pointOnSegment.caption')}
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: translations('slides.podsumowanie.sidesAndVertices.title'),
      content: (
        <KangurLessonStack className='text-center'>
          <KangurLessonCallout accent='slate' padding='sm' className='border-cyan-200/85'>
            <GeometryVerticesAnimation />
            <KangurLessonCaption className='mt-2'>
              {translations('slides.podsumowanie.sidesAndVertices.caption')}
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: translations('slides.podsumowanie.countSides.title'),
      content: (
        <KangurLessonStack className='text-center'>
          <KangurLessonCallout accent='slate' padding='sm' className='border-cyan-200/85'>
            <GeometrySideHighlightAnimation />
            <KangurLessonCaption className='mt-2'>
              {translations('slides.podsumowanie.countSides.caption')}
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: translations('slides.podsumowanie.angleTypes.title'),
      content: (
        <KangurLessonStack className='text-center'>
          <KangurLessonCallout accent='sky' padding='sm'>
            <GeometryAngleAnimation />
            <KangurLessonCaption className='mt-2'>
              {translations('slides.podsumowanie.angleTypes.caption')}
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
    {
      title: translations('slides.podsumowanie.angleKinds.title'),
      content: (
        <KangurLessonStack className='text-center'>
          <KangurLessonCallout accent='sky' padding='sm'>
            <GeometryAngleTypesAnimation />
            <KangurLessonCaption className='mt-2'>
              {translations('slides.podsumowanie.angleKinds.caption')}
            </KangurLessonCaption>
          </KangurLessonCallout>
        </KangurLessonStack>
      ),
    },
  ],
});

const buildGeometryBasicsSections = (translations: LessonTranslate) => [
  {
    id: 'punkt',
    emoji: '●',
    title: translations('sections.punkt.title'),
    description: translations('sections.punkt.description'),
  },
  {
    id: 'bok',
    emoji: '🔷',
    title: translations('sections.bok.title'),
    description: translations('sections.bok.description'),
  },
  {
    id: 'kat',
    emoji: '∟',
    title: translations('sections.kat.title'),
    description: translations('sections.kat.description'),
  },
  {
    id: 'podsumowanie',
    emoji: '📋',
    title: translations('sections.podsumowanie.title'),
    description: translations('sections.podsumowanie.description'),
  },
  {
    id: 'game',
    emoji: '🎯',
    title: translations('sections.game.title'),
    description: translations('sections.game.description'),
    isGame: true,
  },
] as const;

const translateStaticGeometryBasics = createStaticTranslator(
  plMessages.KangurStaticLessons.geometryBasics as Record<string, unknown>
);

export const SLIDES = buildGeometryBasicsSlides(translateStaticGeometryBasics);
export const HUB_SECTIONS = buildGeometryBasicsSections(translateStaticGeometryBasics);

export default function GeometryBasicsLesson(): React.JSX.Element {
  const translations = useTranslations('KangurStaticLessons.geometryBasics');
  const translate = (key: string): string => translations(key as never);
  const sections = buildGeometryBasicsSections(translate);
  const slides = buildGeometryBasicsSlides(translate);

  return (
    <KangurUnifiedLesson
      progressMode='panel'
      lessonId='geometry_basics'
      lessonEmoji='📐'
      lessonTitle={translate('lessonTitle')}
      sections={sections}
      slides={slides}
      gradientClass='kangur-gradient-accent-sky'
      progressDotClassName='bg-cyan-300'
      dotActiveClass='bg-cyan-500'
      dotDoneClass='bg-cyan-300'
      completionSectionId='podsumowanie'
      autoRecordComplete
      scorePercent={100}
      skipMarkFor={['game']}
      games={[
        {
          sectionId: 'game',
          stage: {
            accent: 'sky',
            title: translate('game.stageTitle'),
            icon: '🎯',
            maxWidthClassName: 'max-w-3xl',
            shellTestId: 'geometry-basics-game-shell',
          },
          render: ({ onFinish }) => <GeometryBasicsWorkshopGame onFinish={onFinish} />,
        },
      ]}
    />
  );
}
