'use client';

import { KangurUnifiedLesson } from '../lessons/lesson-components';

import { HUB_SECTIONS, SLIDES } from './AgenticCodingCodex54ApprovalsLesson.data';
import AgenticApprovalGateGame from './AgenticApprovalGateGame';

export { HUB_SECTIONS, SLIDES };

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
          stage: {
            accent: 'sky',
            icon: '🛡️',
            title: 'Approval Gate',
            description: 'Classify actions that require approval.',
            maxWidthClassName: 'max-w-4xl',
          },
          render: ({ onFinish }) => <AgenticApprovalGateGame onFinish={onFinish} />,
        },
      ]}
      completionSectionId='approvals'
      autoRecordComplete
    />
  );
}
