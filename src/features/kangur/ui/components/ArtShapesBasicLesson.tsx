'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';

import { getKangurLessonStageGameRuntimeSpec } from '@/features/kangur/games/lesson-stage-runtime-specs';
import { KangurUnifiedLesson } from '@/features/kangur/ui/lessons/lesson-components';

import {
  ART_SHAPES_ROTATION_PUZZLE_SECTION_ID,
  buildArtShapesBasicSections,
  buildArtShapesBasicSlides,
  type ArtShapesBasicLessonTranslate,
} from './ArtShapesBasicLesson.data';

const ART_SHAPES_ROTATION_RUNTIME = getKangurLessonStageGameRuntimeSpec(
  'art_shape_rotation_puzzle_lesson_stage'
);

export default function ArtShapesBasicLesson(): JSX.Element {
  const translations = useTranslations('KangurStaticLessons.artShapesBasic');
  const translate: ArtShapesBasicLessonTranslate = (key, values) =>
    translations(key as never, values as never);
  const sections = useMemo(() => buildArtShapesBasicSections(translate), [translations]);
  const slides = useMemo(() => buildArtShapesBasicSlides(translate), [translations]);

  return (
    <KangurUnifiedLesson
      progressMode='panel'
      lessonId='art_shapes_basic'
      lessonEmoji='🧩'
      lessonTitle={translate('lessonTitle')}
      sections={sections}
      slides={slides}
      gradientClass='kangur-gradient-accent-amber'
      progressDotClassName='bg-amber-300'
      dotActiveClass='bg-amber-500'
      dotDoneClass='bg-amber-300'
      completionSectionId='summary'
      autoRecordComplete
      scorePercent={100}
      skipMarkFor={[ART_SHAPES_ROTATION_PUZZLE_SECTION_ID]}
      games={[
        {
          sectionId: ART_SHAPES_ROTATION_PUZZLE_SECTION_ID,
          stage: {
            accent: 'amber',
            title: translate('game.stageTitle'),
            icon: '🌀',
            maxWidthClassName: 'max-w-4xl',
            shellTestId: 'art-shapes-rotation-gap-game-shell',
          },
          runtime: ART_SHAPES_ROTATION_RUNTIME,
        },
      ]}
    />
  );
}
