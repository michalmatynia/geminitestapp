import { KangurUnifiedLesson } from '../lessons/lesson-components';

import { HUB_SECTIONS, SLIDES } from './WebDevelopmentReactDomComponentsLesson.data';

export { HUB_SECTIONS, SLIDES };

export default function WebDevelopmentReactDomComponentsLesson(): JSX.Element {
  return (
    <KangurUnifiedLesson
      lessonId='webdev-react-dom-components'
      lessonEmoji='🧩'
      lessonTitle='Components: React Dom Basics'
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
