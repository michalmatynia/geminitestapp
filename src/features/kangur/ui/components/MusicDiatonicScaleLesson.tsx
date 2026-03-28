'use client';

import { useMemo } from 'react';

import {
  KANGUR_MUSIC_PIANO_ROLL_VARIANT_KEYS,
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

const MUSIC_DIATONIC_SCALE_GAME_SECTION_SHELL_PRESENTATION = {
  freePlay: {
    sectionId: MUSIC_DIATONIC_SCALE_SECTION_IDS.freePlayGame,
    shell: {
      accent: 'sky',
      icon: '🎛️',
      maxWidthClassName: 'max-w-none',
      shellTestId: 'music-diatonic-scale-freeplay-shell',
      shellVariant: 'plain',
    },
  },
  repeat: {
    sectionId: MUSIC_DIATONIC_SCALE_SECTION_IDS.repeatGame,
    shell: {
      accent: 'sky',
      icon: '🎹',
      maxWidthClassName: 'max-w-none',
      shellTestId: 'music-diatonic-scale-game-shell',
      shellVariant: 'plain',
    },
  },
} as const;

export const MUSIC_DIATONIC_SCALE_GAME_SECTION_CONFIGS = Object.fromEntries(
  KANGUR_MUSIC_PIANO_ROLL_VARIANT_KEYS.map((key) => [
    key,
    {
      launchableInstance: {
        gameId: MUSIC_DIATONIC_SCALE_LAUNCHABLE_GAME_IDS[key],
        instanceId: MUSIC_DIATONIC_SCALE_LAUNCHABLE_INSTANCE_IDS[key],
      },
      sectionId: MUSIC_DIATONIC_SCALE_GAME_SECTION_SHELL_PRESENTATION[key].sectionId,
      shell: MUSIC_DIATONIC_SCALE_GAME_SECTION_SHELL_PRESENTATION[key].shell,
    },
  ])
) as {
  [Key in (typeof KANGUR_MUSIC_PIANO_ROLL_VARIANT_KEYS)[number]]: {
    launchableInstance: {
      gameId: (typeof MUSIC_DIATONIC_SCALE_LAUNCHABLE_GAME_IDS)[Key];
      instanceId: (typeof MUSIC_DIATONIC_SCALE_LAUNCHABLE_INSTANCE_IDS)[Key];
    };
    sectionId: (typeof MUSIC_DIATONIC_SCALE_GAME_SECTION_SHELL_PRESENTATION)[Key]['sectionId'];
    shell: (typeof MUSIC_DIATONIC_SCALE_GAME_SECTION_SHELL_PRESENTATION)[Key]['shell'];
  };
};

export const MUSIC_DIATONIC_SCALE_TOP_SECTION_TEST_IDS = Object.fromEntries(
  KANGUR_MUSIC_PIANO_ROLL_VARIANT_KEYS.map((key) => [
    key,
    MUSIC_DIATONIC_SCALE_GAME_SECTION_CONFIGS[key].shell.shellTestId,
  ])
) as {
  [Key in (typeof KANGUR_MUSIC_PIANO_ROLL_VARIANT_KEYS)[number]]: string;
};

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
  const resolvedGameContentByVariant = useMemo(
    () => ({
      freePlay: {
        description: resolvedContent.gameFreeplaySection.gameStageDescription,
        title: resolvedContent.gameFreeplaySection.gameStageTitle,
      },
      repeat: {
        description: resolvedContent.gameRepeatSection.gameStageDescription,
        title: resolvedContent.gameRepeatSection.gameStageTitle,
      },
    }),
    [resolvedContent],
  );
  const resolvedGames = useMemo(
    () =>
      KANGUR_MUSIC_PIANO_ROLL_VARIANT_KEYS.map((key) => ({
        sectionId: MUSIC_DIATONIC_SCALE_GAME_SECTION_CONFIGS[key].sectionId,
        shell: {
          ...MUSIC_DIATONIC_SCALE_GAME_SECTION_CONFIGS[key].shell,
          title: resolvedGameContentByVariant[key].title,
          description: resolvedGameContentByVariant[key].description,
        },
        launchableInstance: MUSIC_DIATONIC_SCALE_GAME_SECTION_CONFIGS[key].launchableInstance,
      })),
    [resolvedGameContentByVariant],
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
      skipMarkFor={KANGUR_MUSIC_PIANO_ROLL_VARIANT_KEYS.map(
        (key) => MUSIC_DIATONIC_SCALE_GAME_SECTION_CONFIGS[key].sectionId
      )}
      games={resolvedGames}
    />
  );
}
