'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';

import { getKangurBuiltInGameInstanceId } from '@/features/kangur/games';
import type { LessonProps } from '@/features/kangur/lessons/lesson-ui-registry';
import { useOptionalKangurLessonTemplate } from '@/features/kangur/ui/context/KangurLessonsRuntimeContext';
import { KangurUnifiedLesson } from '@/features/kangur/ui/lessons/lesson-components';

import {
  ART_SHAPES_ROTATION_PUZZLE_SECTION_ID,
  buildArtShapesBasicSections,
  buildArtShapesBasicSlides,
  type ArtShapesBasicLessonTranslate,
} from './ArtShapesBasicLesson.data';
import {
  createArtShapesBasicLessonTranslate,
  resolveArtShapesBasicLessonContent,
} from './art-shapes-basic-lesson-content';

export default function ArtShapesBasicLesson({ lessonTemplate }: LessonProps): JSX.Element {
  const translations = useTranslations('KangurStaticLessons.artShapesBasic');
  const fallbackTranslate: ArtShapesBasicLessonTranslate = (key, values) =>
    translations(key as never, values as never);
  const runtimeTemplate = useOptionalKangurLessonTemplate('art_shapes_basic');
  const resolvedTemplate = lessonTemplate ?? runtimeTemplate;
  const resolvedContent = useMemo(
    () => resolveArtShapesBasicLessonContent(resolvedTemplate, fallbackTranslate),
    [fallbackTranslate, resolvedTemplate]
  );
  const translate = useMemo(
    () => createArtShapesBasicLessonTranslate(resolvedContent),
    [resolvedContent]
  );
  const sections = useMemo(() => buildArtShapesBasicSections(translate), [translate]);
  const slides = useMemo(() => buildArtShapesBasicSlides(translate), [translate]);
  const lessonTitle = resolvedTemplate?.title?.trim() || translations('lessonTitle');

  return (
    <KangurUnifiedLesson
      progressMode='panel'
      lessonId='art_shapes_basic'
      lessonEmoji='🧩'
      lessonTitle={lessonTitle}
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
          launchableInstance: {
            gameId: 'art_shape_rotation_puzzle',
            instanceId: getKangurBuiltInGameInstanceId('art_shape_rotation_puzzle'),
          },
        },
      ]}
    />
  );
}
