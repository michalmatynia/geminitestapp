'use client';

import { getKangurLessonStageGameRuntimeSpec } from '@/features/kangur/games/lesson-stage-runtime-specs';
import { KangurUnifiedLesson } from '../lessons/lesson-components';

import { HUB_SECTIONS, SLIDES } from './AlphabetWordsLesson.data';

export { HUB_SECTIONS, SLIDES };

const ALPHABET_FIRST_WORDS_RUNTIME = getKangurLessonStageGameRuntimeSpec(
  'alphabet_first_words_lesson_stage'
);

export default function AlphabetWordsLesson(): JSX.Element {
  return (
    <KangurUnifiedLesson
      progressMode='panel'
      lessonId='alphabet-words'
      lessonEmoji='📖'
      lessonTitle='Pierwsze słowa'
      sections={HUB_SECTIONS}
      slides={SLIDES}
      gradientClass='kangur-gradient-accent-amber'
      progressDotClassName='bg-amber-300'
      dotActiveClass='bg-amber-400'
      dotDoneClass='bg-amber-200'
      completionSectionId='summary'
      autoRecordComplete
      skipMarkFor={['game_words']}
      games={[
        {
          sectionId: 'game_words',
          stage: {
            accent: 'amber',
            icon: '🎮',
            shellTestId: 'alphabet-words-game-shell',
            title: 'Gra słowa',
            description: 'Dopasuj obrazek do właściwego słowa.',
          },
          runtime: ALPHABET_FIRST_WORDS_RUNTIME,
        },
      ]}
    />
  );
}
