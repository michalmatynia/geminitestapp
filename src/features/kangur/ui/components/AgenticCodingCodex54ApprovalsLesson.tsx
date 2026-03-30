import { getKangurBuiltInGameInstanceId } from '@/features/kangur/games';
import { KangurUnifiedLesson } from '../lessons/lesson-components';

import { HUB_SECTIONS, SLIDES } from './AgenticCodingCodex54ApprovalsLesson.data';

export { HUB_SECTIONS, SLIDES };

const AGENTIC_APPROVAL_GATE_INSTANCE_ID = getKangurBuiltInGameInstanceId('agentic_approval_gate');

export default function AgenticCodingCodex54ApprovalsLesson(): JSX.Element {
  return (
    <KangurUnifiedLesson
      lessonId='agentic-coding-codex-5-4-approvals'
      lessonEmoji='🔒'
      lessonTitle='Codex 5.4: Approvals & Network'
      sections={HUB_SECTIONS}
      slides={SLIDES}
      gradientClass='kangur-gradient-accent-slate'
      progressDotClassName='bg-slate-300'
      dotActiveClass='bg-slate-400'
      dotDoneClass='bg-slate-200'
      skipMarkFor={['approval_gate_game']}
      games={[
        {
          sectionId: 'approval_gate_game',
          shell: {
            accent: 'sky',
            icon: '🛡️',
            title: 'Approval Gate',
            description: 'Classify actions that require approval.',
            maxWidthClassName: 'max-w-4xl',
            shellTestId: 'agentic-approval-gate-game-shell',
          },
          launchableInstance: {
            gameId: 'agentic_approval_gate',
            instanceId: AGENTIC_APPROVAL_GATE_INSTANCE_ID,
          },
        },
      ]}
      completionSectionId='approvals'
      autoRecordComplete
    />
  );
}
