import { KangurUnifiedLesson } from '../lessons/lesson-components';

import { HUB_SECTIONS, SLIDES } from './WebDevelopmentJavaScriptEs6Lesson.data';

export { HUB_SECTIONS, SLIDES };

export default function WebDevelopmentJavaScriptEs6Lesson(): JSX.Element {
  return (
    <KangurUnifiedLesson
      lessonId='webdev-js-es6'
      lessonEmoji='🧩'
      lessonTitle='Functions, Objects & Modules'
      sections={HUB_SECTIONS}
      slides={SLIDES}
      gradientClass='kangur-gradient-accent-indigo'
      progressDotClassName='bg-indigo-300'
      dotActiveClass='bg-indigo-400'
      dotDoneClass='bg-indigo-200'
      completionSectionId='summary'
      autoRecordComplete
    />
  );
}
