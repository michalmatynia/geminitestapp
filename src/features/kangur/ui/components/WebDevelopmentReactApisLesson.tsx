import { KangurUnifiedLesson } from '../lessons/lesson-components';

import { HUB_SECTIONS, SLIDES } from './WebDevelopmentReactApisLesson.data';

export { HUB_SECTIONS, SLIDES };

export default function WebDevelopmentReactApisLesson(): JSX.Element {
  return (
    <KangurUnifiedLesson
      lessonId='webdev-react-apis'
      lessonEmoji='🔌'
      lessonTitle='APIs Basics'
      sections={HUB_SECTIONS}
      slides={SLIDES}
      gradientClass='kangur-gradient-accent-teal'
      progressDotClassName='bg-teal-300'
      dotActiveClass='bg-teal-400'
      dotDoneClass='bg-teal-200'
      completionSectionId='summary'
      autoRecordComplete
    />
  );
}
