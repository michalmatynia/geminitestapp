import { KangurUnifiedLesson } from '../lessons/lesson-components';

import { HUB_SECTIONS, SLIDES } from './WebDevelopmentReactSetupLesson.data';

export { HUB_SECTIONS, SLIDES };

export default function WebDevelopmentReactSetupLesson(): JSX.Element {
  return (
    <KangurUnifiedLesson
      lessonId='webdev-react-setup'
      lessonEmoji='📦'
      lessonTitle='Setup Basics'
      sections={HUB_SECTIONS}
      slides={SLIDES}
      gradientClass='kangur-gradient-accent-amber'
      progressDotClassName='bg-amber-300'
      dotActiveClass='bg-amber-400'
      dotDoneClass='bg-amber-200'
      completionSectionId='summary'
      autoRecordComplete
    />
  );
}
