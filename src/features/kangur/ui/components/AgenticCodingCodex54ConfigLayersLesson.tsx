import { KangurUnifiedLesson } from '../lessons/lesson-components';

import { HUB_SECTIONS, SLIDES } from './AgenticCodingCodex54ConfigLayersLesson.data';

export { HUB_SECTIONS, SLIDES };

export default function AgenticCodingCodex54ConfigLayersLesson(): JSX.Element {
  return (
    <KangurUnifiedLesson
      lessonId='agentic-coding-codex-5-4-config-layers'
      lessonEmoji='⚙️'
      lessonTitle='Codex 5.4: Config Layers'
      sections={HUB_SECTIONS}
      slides={SLIDES}
      gradientClass='kangur-gradient-accent-slate'
      progressDotClassName='bg-slate-300'
      dotActiveClass='bg-slate-400'
      dotDoneClass='bg-slate-200'
      completionSectionId='config-layers'
      autoRecordComplete
    />
  );
}
