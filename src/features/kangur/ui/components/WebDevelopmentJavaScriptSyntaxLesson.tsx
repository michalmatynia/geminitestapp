import { KangurUnifiedLesson } from '../lessons/lesson-components';

import { HUB_SECTIONS, SLIDES } from './WebDevelopmentJavaScriptSyntaxLesson.data';

export { HUB_SECTIONS, SLIDES };

export default function WebDevelopmentJavaScriptSyntaxLesson(): JSX.Element {
  return (
    <KangurUnifiedLesson
      lessonId='webdev-js-syntax'
      lessonEmoji='🔎'
      lessonTitle='Syntax, Types & Data'
      sections={HUB_SECTIONS}
      slides={SLIDES}
      gradientClass='kangur-gradient-accent-sky'
      progressDotClassName='bg-sky-300'
      dotActiveClass='bg-sky-400'
      dotDoneClass='bg-sky-200'
      completionSectionId='summary'
      autoRecordComplete
    />
  );
}
