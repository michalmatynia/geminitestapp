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
import AgenticCodingCodex54SurfacesLesson from '@/features/kangur/ui/components/AgenticCodingCodex54SurfacesLesson';

describe('AgenticCodingCodex54 lesson game configs', () => {
  afterEach(() => {
    capturedProps = null;
  });

  it.each([
    {
      lessonTitle: 'Codex 5.4: Prompting & Context',
      Component: AgenticCodingCodex54PromptingLesson,
      sectionId: 'prompt_trim_game',
      gameId: 'agentic_prompt_trim_stage',
      instanceId: 'agentic_prompt_trim_stage:instance:default',
      shellTestId: 'agentic-prompt-trim-game-shell',
    },
    {
      lessonTitle: 'Codex 5.4: Approvals & Network',
      Component: AgenticCodingCodex54ApprovalsLesson,
      sectionId: 'approval_gate_game',
      gameId: 'agentic_approval_gate',
      instanceId: 'agentic_approval_gate:instance:default',
      shellTestId: 'agentic-approval-gate-game-shell',
    },
    {
      lessonTitle: 'Codex 5.4: Models & Reasoning',
      Component: AgenticCodingCodex54ModelsLesson,
      sectionId: 'reasoning_router_game',
      gameId: 'agentic_reasoning_router',
      instanceId: 'agentic_reasoning_router:instance:default',
      shellTestId: 'agentic-reasoning-router-game-shell',
    },
    {
      lessonTitle: 'Codex 5.4: Surfaces',
      Component: AgenticCodingCodex54SurfacesLesson,
      sectionId: 'surface_match_game',
      gameId: 'agentic_surface_match',
      instanceId: 'agentic_surface_match:instance:default',
      shellTestId: 'agentic-surface-match-game-shell',
    },
  ])(
    'passes the shared launchable instance into KangurUnifiedLesson for $lessonTitle',
    ({ Component, lessonTitle, sectionId, gameId, instanceId, shellTestId }) => {
      render(<Component />);

      expect(screen.getByTestId('kangur-unified-lesson')).toHaveTextContent(lessonTitle);

      const games =
        (capturedProps?.games as Array<{
          sectionId: string;
          shell: Record<string, unknown>;
          launchableInstance?: { gameId?: string; instanceId?: string };
          render?: unknown;
        }>) ?? [];
      const game = games.find((candidate) => candidate.sectionId === sectionId);

      expect(game?.shell).toMatchObject({
        shellTestId,
      });
      expect(game?.launchableInstance).toMatchObject({
        gameId,
        instanceId,
      });
      expect(game).not.toHaveProperty('render');
    }
  );
});
