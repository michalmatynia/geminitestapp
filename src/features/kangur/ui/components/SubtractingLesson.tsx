'use client';

import SubtractingGardenGame from './SubtractingGardenGame';
import { KangurUnifiedLesson } from '../lessons/lesson-components';

import { HUB_SECTIONS, SLIDES } from './SubtractingLesson.data';

export { HUB_SECTIONS, SLIDES };

export default function SubtractingLesson(): JSX.Element {
  return (
    <KangurUnifiedLesson
      lessonId='subtracting-basics'
      lessonEmoji='➖'
      lessonTitle='Odejmowanie'
      sections={HUB_SECTIONS}
      slides={SLIDES}
      gradientClass='kangur-gradient-accent-rose'
      progressDotClassName='bg-red-200'
      dotActiveClass='bg-red-400'
      dotDoneClass='bg-red-200'
      skipMarkFor={['game']}
      games={[
        {
          sectionId: 'game',
          stage: {
            accent: 'rose',
            icon: '🎮',
            maxWidthClassName: 'max-w-none',
            shellTestId: 'subtracting-lesson-game-shell',
            title: 'Gra z odejmowaniem!',
          },
          render: ({ onFinish }) => (
            <SubtractingGardenGame finishLabelVariant='topics' onFinish={onFinish} />
          ),
        },
      ]}
    />
  );
}
