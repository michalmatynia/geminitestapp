import { KangurUnifiedLesson } from '../lessons/lesson-components';

import { HUB_SECTIONS, SLIDES } from './WebDevelopmentReactRouterLesson.data';

export { HUB_SECTIONS, SLIDES };

export default function WebDevelopmentReactRouterLesson(): JSX.Element {
  return (
    <KangurUnifiedLesson
      lessonId='webdev-react-router'
      lessonEmoji='🧭'
      lessonTitle='React Router Basics'
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
