import { KangurUnifiedLesson } from '../lessons/lesson-components';

import { HUB_SECTIONS, SLIDES } from './WebDevelopmentJavaScriptToolingLesson.data';

export { HUB_SECTIONS, SLIDES };

export default function WebDevelopmentJavaScriptToolingLesson(): JSX.Element {
  return (
    <KangurUnifiedLesson
      lessonId='webdev-js-tooling'
      lessonEmoji='🛠️'
      lessonTitle='Reference & Debugging'
      sections={HUB_SECTIONS}
      slides={SLIDES}
      gradientClass='kangur-gradient-accent-rose'
      progressDotClassName='bg-rose-300'
      dotActiveClass='bg-rose-400'
      dotDoneClass='bg-rose-200'
      completionSectionId='summary'
      autoRecordComplete
    />
  );
}
