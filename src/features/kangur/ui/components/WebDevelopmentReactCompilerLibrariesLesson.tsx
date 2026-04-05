import { KangurUnifiedLesson } from '../lessons/lesson-components';

import { HUB_SECTIONS, SLIDES } from './WebDevelopmentReactCompilerLibrariesLesson.data';

export { HUB_SECTIONS, SLIDES };

export default function WebDevelopmentReactCompilerLibrariesLesson(): JSX.Element {
  return (
    <KangurUnifiedLesson
      lessonId='webdev-react-compiler-libraries'
      lessonEmoji='📚'
      lessonTitle='React Compiler Libraries Basics'
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
