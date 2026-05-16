import { KangurUnifiedLesson } from '../lessons/lesson-components';

import { HUB_SECTIONS, SLIDES } from './WebDevelopmentJavaScriptBasicsLesson.data';

export { HUB_SECTIONS, SLIDES };

export default function WebDevelopmentJavaScriptBasicsLesson(): JSX.Element {
  return (
    <KangurUnifiedLesson
      lessonId='webdev-js-basics'
      lessonEmoji='📜'
      lessonTitle='JavaScript First Steps'
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
