'use client';

import type * as React from 'react';
import { useMemo } from 'react';
import { useTranslations } from 'next-intl';

import { getKangurLessonStageGameRuntimeSpec } from '@/features/kangur/games/lesson-stage-runtime-specs';
import type { LessonSlide } from '@/features/kangur/ui/components/LessonSlideSection';
import {
  KangurLessonCallout,
  KangurLessonCaption,
  KangurLessonChip,
  KangurLessonInset,
  KangurLessonLead,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';
import { KangurStatusChip } from '@/features/kangur/ui/design/primitives';
import { KangurUnifiedLesson } from '@/features/kangur/ui/lessons/lesson-components';

import {
  buildGeometryShapeDefinitions,
  ShapeIcon,
  type ShapeDefinition,
} from './GeometryShapeRecognition.shared';
import type { LessonTranslate } from './lesson-copy';

type SectionId = 'intro' | 'practice' | 'draw' | 'summary';

const GEOMETRY_SHAPE_SPOTTER_RUNTIME = getKangurLessonStageGameRuntimeSpec(
  'geometry_shape_spotter_lesson_stage'
);
const GEOMETRY_SHAPE_DRAWING_RUNTIME = getKangurLessonStageGameRuntimeSpec(
  'geometry_shape_drawing_lesson_stage'
);

const buildSections = (translate: LessonTranslate) =>
  [
    {
      id: 'intro',
      emoji: '🔍',
      title: translate('sections.intro.title'),
      description: translate('sections.intro.description'),
    },
    {
      id: 'practice',
      emoji: '🎯',
      title: translate('practiceSlide.title'),
      description: translate('sections.practice.description'),
      isGame: true,
    },
    {
      id: 'draw',
      emoji: '✍️',
      title: translate('sections.draw.title'),
      description: translate('sections.draw.description'),
      isGame: true,
    },
    {
      id: 'summary',
      emoji: '⭐',
      title: translate('sections.summary.title'),
      description: translate('sections.summary.description'),
    },
  ] as const;

const ShapeGrid = ({ shapes }: { shapes: ShapeDefinition[] }): React.JSX.Element => (
  <div className='grid gap-4 sm:grid-cols-2'>
    {shapes.map((shape) => (
      <KangurLessonCallout
        key={shape.id}
        accent='emerald'
        className='flex flex-col items-center gap-3 text-center'
        padding='md'
      >
        <ShapeIcon shape={shape.id} color={shape.color} />
        <div className='text-base font-semibold'>{shape.label}</div>
        <KangurLessonCaption>{shape.clue}</KangurLessonCaption>
      </KangurLessonCallout>
    ))}
  </div>
);

const ShapeClues = ({
  translate,
}: {
  translate: LessonTranslate;
}): React.JSX.Element => (
  <KangurLessonStack align='start' gap='md'>
    <KangurLessonLead align='left'>{translate('clues.lead')}</KangurLessonLead>
    <div className='flex flex-wrap gap-2'>
      <KangurLessonChip accent='sky'>{translate('clues.chips.corners')}</KangurLessonChip>
      <KangurLessonChip accent='emerald'>{translate('clues.chips.sides')}</KangurLessonChip>
      <KangurLessonChip accent='amber'>{translate('clues.chips.curves')}</KangurLessonChip>
      <KangurLessonChip accent='rose'>
        {translate('clues.chips.longShortSides')}
      </KangurLessonChip>
    </div>
    <KangurLessonInset accent='emerald'>{translate('clues.inset')}</KangurLessonInset>
  </KangurLessonStack>
);

const buildSlides = (
  shapes: ShapeDefinition[],
  translate: LessonTranslate
): Record<Exclude<SectionId, 'practice' | 'draw'>, LessonSlide[]> => ({
  intro: [
    {
      title: translate('intro.title'),
      content: (
        <KangurLessonStack>
          <KangurLessonLead>{translate('intro.lead')}</KangurLessonLead>
          <ShapeGrid shapes={shapes} />
        </KangurLessonStack>
      ),
    },
    {
      title: translate('clues.title'),
      content: <ShapeClues translate={translate} />,
    },
  ],
  summary: [
    {
      title: translate('summary.title'),
      content: (
        <KangurLessonStack>
          <KangurStatusChip accent='emerald' size='sm'>
            {translate('summary.status')}
          </KangurStatusChip>
          <KangurLessonLead>{translate('summary.lead')}</KangurLessonLead>
          <KangurLessonCaption>{translate('summary.caption')}</KangurLessonCaption>
        </KangurLessonStack>
      ),
    },
  ],
});

export default function GeometryShapeRecognitionLesson(): React.JSX.Element {
  const translations = useTranslations('KangurStaticLessons.geometryShapeRecognition');
  const translate: LessonTranslate = (key, values) => translations(key as never, values as never);
  const shapes = useMemo(() => buildGeometryShapeDefinitions(translate), [translations]);
  const sections = useMemo(() => buildSections(translate), [translations]);
  const slides = useMemo(() => buildSlides(shapes, translate), [shapes, translations]);

  return (
    <KangurUnifiedLesson
      progressMode='panel'
      lessonId='geometry_shape_recognition'
      lessonEmoji='🔷'
      lessonTitle={translate('lessonTitle')}
      sections={sections}
      slides={slides}
      gradientClass='kangur-gradient-accent-emerald'
      progressDotClassName='bg-emerald-300'
      dotActiveClass='bg-emerald-400'
      dotDoneClass='bg-emerald-200'
      skipMarkFor={['practice', 'draw']}
      games={[
        {
          sectionId: 'practice',
          stage: {
            accent: 'emerald',
            title: translate('practiceSlide.title'),
            description: translate('sections.practice.description'),
            icon: '🎯',
            maxWidthClassName: 'max-w-3xl',
            shellTestId: 'geometry-shape-recognition-practice-shell',
          },
          runtime: GEOMETRY_SHAPE_SPOTTER_RUNTIME,
        },
        {
          sectionId: 'draw',
          stage: {
            accent: 'emerald',
            title: translate('draw.stageTitle'),
            description: translate('sections.draw.description'),
            icon: '✍️',
            maxWidthClassName: 'max-w-3xl',
            shellTestId: 'geometry-shape-recognition-draw-shell',
          },
          runtime: GEOMETRY_SHAPE_DRAWING_RUNTIME,
        },
      ]}
    />
  );
}
