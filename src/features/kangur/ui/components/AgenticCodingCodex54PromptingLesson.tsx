'use client';

import { getKangurBuiltInGameInstanceId } from '@/features/kangur/games';
import { KangurUnifiedLesson } from '../lessons/lesson-components';

import { HUB_SECTIONS, SLIDES } from './AgenticCodingCodex54PromptingLesson.data';

export { HUB_SECTIONS, SLIDES };

const AGENTIC_PROMPT_TRIM_INSTANCE_ID = getKangurBuiltInGameInstanceId('agentic_prompt_trim_stage');

export default function AgenticCodingCodex54PromptingLesson(): JSX.Element {
  return (
    <KangurUnifiedLesson
      lessonId='agentic-coding-codex-5-4-prompting'
      lessonEmoji='🎯'
      lessonTitle='Codex 5.4: Prompting & Context'
      sections={HUB_SECTIONS}
      slides={SLIDES}
      gradientClass='kangur-gradient-accent-rose'
      progressDotClassName='bg-rose-300'
      dotActiveClass='bg-rose-400'
      dotDoneClass='bg-rose-200'
      skipMarkFor={['prompt_trim_game']}
      games={[
        {
          sectionId: 'prompt_trim_game',
          shell: {
            accent: 'rose',
            icon: '✂️',
            title: 'Prompt Trim Game',
            description: 'Trim the prompt by clicking the unnecessary words.',
            maxWidthClassName: 'max-w-4xl',
            shellTestId: 'agentic-prompt-trim-game-shell',
          },
          launchableInstance: {
            gameId: 'agentic_prompt_trim_stage',
            instanceId: AGENTIC_PROMPT_TRIM_INSTANCE_ID,
          },
        },
      ]}
      completionSectionId='prompting'
      autoRecordComplete
    />
  );
}
