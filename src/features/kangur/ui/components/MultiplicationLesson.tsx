'use client';

import MultiplicationArrayGame from '@/features/kangur/ui/components/MultiplicationArrayGame';
import { KangurUnifiedLesson } from '../lessons/lesson-components';

import { HUB_SECTIONS, SLIDES } from './MultiplicationLesson.data';

export { HUB_SECTIONS, SLIDES };

export default function MultiplicationLesson(): JSX.Element {
  return (
    <KangurUnifiedLesson
      lessonId='multiplication-basics'
      lessonEmoji='✖️'
      lessonTitle='Mnożenie'
      sections={HUB_SECTIONS}
      slides={SLIDES}
      gradientClass='kangur-gradient-accent-amber'
      progressDotClassName='bg-amber-300'
      dotActiveClass='bg-amber-400'
      dotDoneClass='bg-amber-200'
      completionSectionId='summary'
      autoRecordComplete
      games={[
        {
          sectionId: 'game',
          stage: {
            accent: 'violet',
            icon: '🎮',
            maxWidthClassName: 'max-w-none',
            shellTestId: 'multiplication-lesson-game-array-shell',
            title: 'Gra z grupami!',
          },
          render: ({ onFinish }) => (
            <MultiplicationArrayGame finishLabelVariant='topics' onFinish={onFinish} />
          ),
        },
      ]}
    />
  );
}
