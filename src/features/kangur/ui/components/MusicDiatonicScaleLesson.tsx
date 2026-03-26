'use client';

import { getKangurLessonStageGameRuntimeSpec } from '@/features/kangur/games/lesson-stage-runtime-specs';
import { KangurUnifiedLesson } from '../lessons/lesson-components';

import { HUB_SECTIONS, SLIDES } from './MusicDiatonicScaleLesson.data';

export { HUB_SECTIONS, SLIDES };

const MUSIC_MELODY_REPEAT_RUNTIME = getKangurLessonStageGameRuntimeSpec(
  'music_melody_repeat_lesson_stage'
);
const MUSIC_PIANO_ROLL_FREE_PLAY_RUNTIME = getKangurLessonStageGameRuntimeSpec(
  'music_piano_roll_free_play_lesson_stage'
);

export default function MusicDiatonicScaleLesson(): JSX.Element {
  return (
    <KangurUnifiedLesson
      progressMode='panel'
      lessonId='music_diatonic_scale'
      lessonEmoji='🎵'
      lessonTitle='Skala diatoniczna'
      sections={HUB_SECTIONS}
      slides={SLIDES}
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
            title: 'Powtorz melodie',
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
            title: 'Swobodna gra',
          },
          runtime: MUSIC_PIANO_ROLL_FREE_PLAY_RUNTIME,
        },
      ]}
    />
  );
}
