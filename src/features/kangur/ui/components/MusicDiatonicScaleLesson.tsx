'use client';

import { useMemo } from 'react';

import {
  KANGUR_MUSIC_DIATONIC_SCALE_COMPONENT_ID,
  KANGUR_MUSIC_PIANO_ROLL_DEFAULT_INSTANCE_IDS,
  KANGUR_MUSIC_PIANO_ROLL_GAME_IDS,
} from '@/features/kangur/games/music-piano-roll-contract';
import type { LessonProps } from '@/features/kangur/lessons/lesson-ui-registry';
import { useOptionalKangurLessonTemplate } from '@/features/kangur/ui/context/KangurLessonsRuntimeContext';
import { KangurUnifiedLesson } from '../lessons/lesson-components';

import { CONTENT, HUB_SECTIONS, SLIDES } from './MusicDiatonicScaleLesson.data';
import {
  buildMusicDiatonicScaleLessonSections,
  buildMusicDiatonicScaleLessonSlides,
  MUSIC_DIATONIC_SCALE_SECTION_IDS,
  resolveMusicDiatonicScaleLessonContent,
} from './music-diatonic-scale-lesson-content';

export { HUB_SECTIONS, SLIDES };

export const MUSIC_DIATONIC_SCALE_COMPONENT_ID = KANGUR_MUSIC_DIATONIC_SCALE_COMPONENT_ID;
export const MUSIC_DIATONIC_SCALE_LAUNCHABLE_GAME_IDS = KANGUR_MUSIC_PIANO_ROLL_GAME_IDS;
export const MUSIC_DIATONIC_SCALE_LAUNCHABLE_INSTANCE_IDS =
  KANGUR_MUSIC_PIANO_ROLL_DEFAULT_INSTANCE_IDS;

export const MUSIC_DIATONIC_SCALE_GAME_SECTION_CONFIGS = {
  freePlay: {
    launchableInstance: {
      gameId: MUSIC_DIATONIC_SCALE_LAUNCHABLE_GAME_IDS.freePlay,
      instanceId: MUSIC_DIATONIC_SCALE_LAUNCHABLE_INSTANCE_IDS.freePlay,
    },
    sectionId: MUSIC_DIATONIC_SCALE_SECTION_IDS.freePlayGame,
    stage: {
      accent: 'sky',
      icon: '🎛️',
      maxWidthClassName: 'max-w-none',
      shellTestId: 'music-diatonic-scale-freeplay-shell',
      shellVariant: 'plain',
    },
  },
  repeat: {
    launchableInstance: {
      gameId: MUSIC_DIATONIC_SCALE_LAUNCHABLE_GAME_IDS.repeat,
      instanceId: MUSIC_DIATONIC_SCALE_LAUNCHABLE_INSTANCE_IDS.repeat,
    },
    sectionId: MUSIC_DIATONIC_SCALE_SECTION_IDS.repeatGame,
    stage: {
      accent: 'sky',
      icon: '🎹',
      maxWidthClassName: 'max-w-none',
      shellTestId: 'music-diatonic-scale-game-shell',
      shellVariant: 'plain',
    },
  },
} as const;

export const MUSIC_DIATONIC_SCALE_TOP_SECTION_TEST_IDS = {
  freePlay: MUSIC_DIATONIC_SCALE_GAME_SECTION_CONFIGS.freePlay.stage.shellTestId,
  repeat: MUSIC_DIATONIC_SCALE_GAME_SECTION_CONFIGS.repeat.stage.shellTestId,
} as const;

export default function MusicDiatonicScaleLesson({ lessonTemplate }: LessonProps): JSX.Element {
  const runtimeTemplate = useOptionalKangurLessonTemplate(MUSIC_DIATONIC_SCALE_COMPONENT_ID);
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
      lessonId={MUSIC_DIATONIC_SCALE_COMPONENT_ID}
      lessonEmoji='🎵'
      lessonTitle={resolvedTitle}
      sections={resolvedSections}
      slides={resolvedSlides}
      gradientClass='kangur-gradient-accent-sky'
      progressDotClassName='bg-sky-300'
      dotActiveClass='bg-sky-400'
      dotDoneClass='bg-sky-200'
      completionSectionId={MUSIC_DIATONIC_SCALE_SECTION_IDS.summary}
      autoRecordComplete
      scorePercent={100}
      skipMarkFor={[
        MUSIC_DIATONIC_SCALE_SECTION_IDS.repeatGame,
        MUSIC_DIATONIC_SCALE_SECTION_IDS.freePlayGame,
      ]}
      games={[
        {
          sectionId: MUSIC_DIATONIC_SCALE_GAME_SECTION_CONFIGS.repeat.sectionId,
          stage: {
            ...MUSIC_DIATONIC_SCALE_GAME_SECTION_CONFIGS.repeat.stage,
            title: resolvedContent.gameRepeatSection.gameStageTitle,
            description: resolvedContent.gameRepeatSection.gameStageDescription,
          },
          launchableInstance: MUSIC_DIATONIC_SCALE_GAME_SECTION_CONFIGS.repeat.launchableInstance,
        },
        {
          sectionId: MUSIC_DIATONIC_SCALE_GAME_SECTION_CONFIGS.freePlay.sectionId,
          stage: {
            ...MUSIC_DIATONIC_SCALE_GAME_SECTION_CONFIGS.freePlay.stage,
            title: resolvedContent.gameFreeplaySection.gameStageTitle,
            description: resolvedContent.gameFreeplaySection.gameStageDescription,
          },
          launchableInstance: MUSIC_DIATONIC_SCALE_GAME_SECTION_CONFIGS.freePlay.launchableInstance,
        },
      ]}
    />
  );
}
