'use client';

import { getKangurLessonStageGameRuntimeSpec } from '@/features/kangur/games/lesson-stage-runtime-specs';
import { KangurUnifiedLesson } from '../lessons/lesson-components';

import { HUB_SECTIONS, SLIDES } from './AlphabetSequenceLesson.data';

export { HUB_SECTIONS, SLIDES };

const ALPHABET_LETTER_ORDER_RUNTIME = getKangurLessonStageGameRuntimeSpec(
  'alphabet_letter_order_lesson_stage'
);

export default function AlphabetSequenceLesson(): JSX.Element {
  return (
    <KangurUnifiedLesson
      progressMode='panel'
      lessonId='alphabet-sequence'
      lessonEmoji='🧠'
      lessonTitle='Alfabet - kolejność'
      sections={HUB_SECTIONS}
      slides={SLIDES}
      gradientClass='kangur-gradient-accent-amber'
      progressDotClassName='bg-amber-300'
      dotActiveClass='bg-amber-400'
      dotDoneClass='bg-amber-200'
      completionSectionId='summary'
      autoRecordComplete
      skipMarkFor={['game_order']}
      games={[
        {
          sectionId: 'game_order',
          stage: {
            accent: 'amber',
            icon: '🎮',
            shellTestId: 'alphabet-sequence-game-shell',
            title: 'Gra alfabet',
            description: 'Uzupełnij brakujące litery w kolejności alfabetu.',
          },
          runtime: ALPHABET_LETTER_ORDER_RUNTIME,
        },
      ]}
    />
  );
}
