'use client';

import GeometryDrawingGame from './GeometryDrawingGame';
import { KangurUnifiedLesson } from '../lessons/lesson-components';

import { HUB_SECTIONS, SLIDES } from './GeometryShapesLesson.data';

export { HUB_SECTIONS, SLIDES };

export default function GeometryShapesLesson(): JSX.Element {
  return (
    <KangurUnifiedLesson
      lessonId='geometry-shapes'
      lessonEmoji='📐'
      lessonTitle='Kształty'
      sections={HUB_SECTIONS}
      slides={SLIDES}
      gradientClass='kangur-gradient-accent-amber'
      progressDotClassName='bg-amber-300'
      dotActiveClass='bg-amber-400'
      dotDoneClass='bg-amber-200'
      completionSectionId='summary'
      autoRecordComplete
      skipMarkFor={['game']}
      games={[
        {
          sectionId: 'game',
          stage: {
            accent: 'amber',
            title: 'Rysuj figury',
            icon: '✏️',
            shellTestId: 'geometry-shapes-game-shell',
          },
          render: ({ onFinish }) => <GeometryDrawingGame onFinish={onFinish} />,
        },
      ]}
    />
  );
}
