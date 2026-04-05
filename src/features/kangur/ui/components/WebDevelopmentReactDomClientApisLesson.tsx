import { KangurUnifiedLesson } from '../lessons/lesson-components';

import { HUB_SECTIONS, SLIDES } from './WebDevelopmentReactDomClientApisLesson.data';

export { HUB_SECTIONS, SLIDES };

export default function WebDevelopmentReactDomClientApisLesson(): JSX.Element {
  return (
    <KangurUnifiedLesson
      lessonId='webdev-react-dom-client-apis'
      lessonEmoji='📡'
      lessonTitle='Client APIs: React Dom Basics'
      sections={HUB_SECTIONS}
      slides={SLIDES}
      gradientClass='kangur-gradient-accent-slate'
      progressDotClassName='bg-slate-300'
      dotActiveClass='bg-slate-400'
      dotDoneClass='bg-slate-200'
      completionSectionId='summary'
      autoRecordComplete
    />
  );
}
