import { KangurUnifiedLesson } from '../lessons/lesson-components';

import { HUB_SECTIONS, SLIDES } from './WebDevelopmentJavaScriptDomLesson.data';

export { HUB_SECTIONS, SLIDES };

export default function WebDevelopmentJavaScriptDomLesson(): JSX.Element {
  return (
    <KangurUnifiedLesson
      lessonId='webdev-js-dom'
      lessonEmoji='🖱️'
      lessonTitle='Browser APIs & DOM'
      sections={HUB_SECTIONS}
      slides={SLIDES}
      gradientClass='kangur-gradient-accent-emerald'
      progressDotClassName='bg-emerald-300'
      dotActiveClass='bg-emerald-400'
      dotDoneClass='bg-emerald-200'
      completionSectionId='summary'
      autoRecordComplete
    />
  );
}
