'use client';

import AddingBallGame from './AddingBallGame';
import AddingSynthesisGame from './AddingSynthesisGame';
import { KangurUnifiedLesson } from '../lessons/lesson-components';

import { HUB_SECTIONS, SLIDES } from './AddingLesson.data';

export { HUB_SECTIONS, SLIDES };

export default function AddingLesson(): JSX.Element {
  return (
    <KangurUnifiedLesson
      lessonId='adding-basics'
      lessonEmoji='➕'
      lessonTitle='Dodawanie'
      sections={HUB_SECTIONS}
      slides={SLIDES}
      gradientClass='kangur-gradient-accent-amber'
      progressDotClassName='bg-amber-200'
      dotActiveClass='bg-orange-400'
      dotDoneClass='bg-orange-200'
      skipMarkFor={['game', 'synthesis']}
      games={[
        {
          sectionId: 'game',
          stage: {
            accent: 'amber',
            icon: '🎮',
            maxWidthClassName: 'max-w-none',
            shellTestId: 'adding-lesson-game-shell',
            title: 'Gra z dodawaniem!',
          },
          render: ({ onFinish }) => (
            <AddingBallGame finishLabelVariant='topics' onFinish={onFinish} />
          ),
        },
        {
          sectionId: 'synthesis',
          stage: {
            accent: 'amber',
            icon: '🧩',
            maxWidthClassName: 'max-w-[1120px]',
            shellClassName: '!p-4',
            shellTestId: 'adding-lesson-synthesis-shell',
            title: 'Synteza dodawania',
          },
          render: ({ onFinish }) => <AddingSynthesisGame onFinish={onFinish} />,
        },
      ]}
    />
  );
}
