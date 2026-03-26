/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

let capturedProps: Record<string, unknown> | null = null;

vi.mock('@/features/kangur/ui/lessons/lesson-components', () => ({
  KangurUnifiedLesson: (props: Record<string, unknown>) => {
    capturedProps = props;
    return <div data-testid='kangur-unified-lesson'>{String(props.lessonTitle ?? '')}</div>;
  },
}));

import AgenticCodingCodex54ApprovalsLesson from '@/features/kangur/ui/components/AgenticCodingCodex54ApprovalsLesson';
import AgenticCodingCodex54ModelsLesson from '@/features/kangur/ui/components/AgenticCodingCodex54ModelsLesson';
import AgenticCodingCodex54PromptingLesson from '@/features/kangur/ui/components/AgenticCodingCodex54PromptingLesson';

describe('AgenticCodingCodex54 stage lesson configs', () => {
  afterEach(() => {
    capturedProps = null;
  });

  it.each([
    {
      lessonTitle: 'Codex 5.4: Prompting & Context',
      Component: AgenticCodingCodex54PromptingLesson,
      sectionId: 'prompt_trim_game',
      runtimeId: 'agentic_prompt_trim_lesson_stage',
      rendererId: 'agentic_prompt_trim_game',
      engineId: 'token-trim-engine',
      shellTestId: 'agentic-prompt-trim-game-shell',
    },
    {
      lessonTitle: 'Codex 5.4: Approvals & Network',
      Component: AgenticCodingCodex54ApprovalsLesson,
      sectionId: 'approval_gate_game',
      runtimeId: 'agentic_approval_gate_lesson_stage',
      rendererId: 'agentic_approval_gate_game',
      engineId: 'classification-engine',
      shellTestId: 'agentic-approval-gate-game-shell',
    },
    {
      lessonTitle: 'Codex 5.4: Models & Reasoning',
      Component: AgenticCodingCodex54ModelsLesson,
      sectionId: 'reasoning_router_game',
      runtimeId: 'agentic_reasoning_router_lesson_stage',
      rendererId: 'agentic_reasoning_router_game',
      engineId: 'classification-engine',
      shellTestId: 'agentic-reasoning-router-game-shell',
    },
  ])(
    'passes the shared lesson-stage runtime into KangurUnifiedLesson for $lessonTitle',
    ({ Component, lessonTitle, sectionId, runtimeId, rendererId, engineId, shellTestId }) => {
      render(<Component />);

      expect(screen.getByTestId('kangur-unified-lesson')).toHaveTextContent(lessonTitle);

      const games =
        (capturedProps?.games as Array<{
          sectionId: string;
          stage: Record<string, unknown>;
          runtime?: { runtimeId?: string; rendererId?: string; engineId?: string };
          render?: unknown;
        }>) ?? [];
      const game = games.find((candidate) => candidate.sectionId === sectionId);

      expect(game?.stage).toMatchObject({
        shellTestId,
      });
      expect(game?.runtime).toMatchObject({
        runtimeId,
        rendererId,
        engineId,
      });
      expect(game).not.toHaveProperty('render');
    }
  );
});
