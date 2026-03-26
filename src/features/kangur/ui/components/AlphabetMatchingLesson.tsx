'use client';

import { getKangurLessonStageGameRuntimeSpec } from '@/features/kangur/games/lesson-stage-runtime-specs';
import { KangurUnifiedLesson } from '../lessons/lesson-components';

import { HUB_SECTIONS, SLIDES } from './AlphabetMatchingLesson.data';

export { HUB_SECTIONS, SLIDES };

const ALPHABET_LETTER_MATCHING_RUNTIME = getKangurLessonStageGameRuntimeSpec(
  'alphabet_letter_matching_lesson_stage'
);

export default function AlphabetMatchingLesson(): JSX.Element {
  return (
    <KangurUnifiedLesson
      progressMode='panel'
      lessonId='alphabet-matching'
      lessonEmoji='🔤'
      lessonTitle='Dopasowanie liter'
      sections={HUB_SECTIONS}
      slides={SLIDES}
      gradientClass='kangur-gradient-accent-amber'
      progressDotClassName='bg-amber-300'
      dotActiveClass='bg-amber-400'
      dotDoneClass='bg-amber-200'
      completionSectionId='summary'
      autoRecordComplete
      skipMarkFor={['game_pairs']}
      games={[
        {
          sectionId: 'game_pairs',
          stage: {
            accent: 'amber',
            icon: '🎮',
            shellTestId: 'alphabet-matching-game-shell',
            title: 'Gra litery',
            description: 'Połącz wielkie i małe litery.',
          },
          runtime: ALPHABET_LETTER_MATCHING_RUNTIME,
        },
      ]}
    />
  );
}
