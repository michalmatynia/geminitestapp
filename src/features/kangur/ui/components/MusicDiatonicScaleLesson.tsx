'use client';

import { useMemo } from 'react';

import { getKangurLessonStageGameRuntimeSpec } from '@/features/kangur/games/lesson-stage-runtime-specs';
import type { LessonProps } from '@/features/kangur/lessons/lesson-ui-registry';
import { useOptionalKangurLessonTemplate } from '@/features/kangur/ui/context/KangurLessonsRuntimeContext';
import { KangurUnifiedLesson } from '../lessons/lesson-components';

import { CONTENT, HUB_SECTIONS, SLIDES } from './MusicDiatonicScaleLesson.data';
import {
  buildMusicDiatonicScaleLessonSections,
  buildMusicDiatonicScaleLessonSlides,
  resolveMusicDiatonicScaleLessonContent,
} from './music-diatonic-scale-lesson-content';

export { HUB_SECTIONS, SLIDES };

const MUSIC_MELODY_REPEAT_RUNTIME = getKangurLessonStageGameRuntimeSpec(
  'music_melody_repeat_lesson_stage'
);
const MUSIC_PIANO_ROLL_FREE_PLAY_RUNTIME = getKangurLessonStageGameRuntimeSpec(
  'music_piano_roll_free_play_lesson_stage'
);

export default function MusicDiatonicScaleLesson({ lessonTemplate }: LessonProps): JSX.Element {
  const runtimeTemplate = useOptionalKangurLessonTemplate('music_diatonic_scale');
  const resolvedTemplate = lessonTemplate ?? runtimeTemplate;
  const resolvedTitle = resolvedTemplate?.title?.trim() || 'Skala diatoniczna';
  const resolvedContent = useMemo(
    () => resolveMusicDiatonicScaleLessonContent(resolvedTemplate, CONTENT),
    [resolvedTemplate],
  );
  const resolvedSections = useMemo(
    () => buildMusicDiatonicScaleLessonSections(resolvedContent),
    [resolvedContent],
  );
  const resolvedSlides = useMemo(
    () => buildMusicDiatonicScaleLessonSlides(resolvedContent),
    [resolvedContent],
  );

  return (
    <KangurUnifiedLesson
      progressMode='panel'
      lessonId='music_diatonic_scale'
      lessonEmoji='🎵'
      lessonTitle={resolvedTitle}
      sections={resolvedSections}
      slides={resolvedSlides}
      gradientClass='kangur-gradient-accent-sky'
      progressDotClassName='bg-sky-300'
      dotActiveClass='bg-sky-400'
      dotDoneClass='bg-sky-200'
      completionSectionId='summary'
      autoRecordComplete
      scorePercent={100}
      skipMarkFor={['game_repeat', 'game_freeplay']}
      games={[
        {
          sectionId: 'game_repeat',
          stage: {
            accent: 'sky',
            icon: '🎹',
            maxWidthClassName: 'max-w-none',
            shellTestId: 'music-diatonic-scale-game-shell',
            shellVariant: 'plain',
            title: resolvedContent.gameRepeatSection.gameStageTitle,
            description: resolvedContent.gameRepeatSection.gameStageDescription,
          },
          runtime: MUSIC_MELODY_REPEAT_RUNTIME,
        },
        {
          sectionId: 'game_freeplay',
          stage: {
            accent: 'sky',
            icon: '🎛️',
            maxWidthClassName: 'max-w-none',
            shellTestId: 'music-diatonic-scale-freeplay-shell',
            shellVariant: 'plain',
            title: resolvedContent.gameFreeplaySection.gameStageTitle,
            description: resolvedContent.gameFreeplaySection.gameStageDescription,
          },
          runtime: MUSIC_PIANO_ROLL_FREE_PLAY_RUNTIME,
        },
      ]}
    />
  );
}
