import { KangurUnifiedLesson } from '../lessons/lesson-components';

import { HUB_SECTIONS, SLIDES } from './WebDevelopmentJavaScriptAsyncLesson.data';

export { HUB_SECTIONS, SLIDES };

export default function WebDevelopmentJavaScriptAsyncLesson(): JSX.Element {
  return (
    <KangurUnifiedLesson
      lessonId='webdev-js-async'
      lessonEmoji='⏱️'
      lessonTitle='Asynchronous JavaScript'
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
