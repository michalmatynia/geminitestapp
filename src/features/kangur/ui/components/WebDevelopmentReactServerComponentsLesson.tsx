import { KangurUnifiedLesson } from '../lessons/lesson-components';

import { HUB_SECTIONS, SLIDES } from './WebDevelopmentReactServerComponentsLesson.data';

export { HUB_SECTIONS, SLIDES };

export default function WebDevelopmentReactServerComponentsLesson(): JSX.Element {
  return (
    <KangurUnifiedLesson
      lessonId='webdev-react-server-components'
      lessonEmoji='🖥️'
      lessonTitle='Server Component Basics'
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
