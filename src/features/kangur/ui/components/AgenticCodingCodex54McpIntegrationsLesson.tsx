'use client';

import { KangurUnifiedLesson } from '../lessons/lesson-components';

import {
  HUB_SECTIONS,
  SLIDES,
} from './AgenticCodingCodex54McpIntegrationsLesson.data';

export { HUB_SECTIONS, SLIDES };

export default function AgenticCodingCodex54McpIntegrationsLesson(): JSX.Element {
  return (
    <KangurUnifiedLesson
      lessonId='agentic-coding-codex-5-4-mcp-integrations'
      lessonEmoji='🔗'
      lessonTitle='Codex 5.4: MCP Integrations'
      sections={HUB_SECTIONS}
      slides={SLIDES}
      gradientClass='kangur-gradient-accent-sky'
      progressDotClassName='bg-sky-300'
      dotActiveClass='bg-sky-400'
      dotDoneClass='bg-sky-200'
      completionSectionId='mcp-integrations'
      autoRecordComplete
    />
  );
}
