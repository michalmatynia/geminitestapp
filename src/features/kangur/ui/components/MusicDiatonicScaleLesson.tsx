'use client';

import MusicMelodyRepeatGame from '@/features/kangur/ui/components/music/MusicMelodyRepeatGame';
import MusicPianoRollFreePlayGame from '@/features/kangur/ui/components/music/MusicPianoRollFreePlayGame';
import { KangurUnifiedLesson } from '../lessons/lesson-components';

import { HUB_SECTIONS, SLIDES } from './MusicDiatonicScaleLesson.data';

export { HUB_SECTIONS, SLIDES };

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
          render: ({ onFinish }) => <MusicMelodyRepeatGame onFinish={onFinish} />,
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
          render: ({ onFinish }) => <MusicPianoRollFreePlayGame onFinish={onFinish} />,
        },
      ]}
    />
  );
}
