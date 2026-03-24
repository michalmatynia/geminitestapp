/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ApprovalGateVisual } from '@/features/kangur/ui/components/AgenticApprovalGateGame';
import { ReasoningDialVisual } from '@/features/kangur/ui/components/AgenticReasoningRouterGame';
import { SurfaceOrbitVisual } from '@/features/kangur/ui/components/AgenticSurfaceMatchGame';

describe('Agentic mini-game visuals', () => {
  it('renders the upgraded approval gate visual surface', () => {
    render(<ApprovalGateVisual />);

    expect(screen.getByTestId('agentic-approval-gate-visual-animation')).toBeInTheDocument();
    expect(screen.getByTestId('agentic-approval-gate-visual-atmosphere')).toBeInTheDocument();
    expect(screen.getByTestId('agentic-approval-gate-visual-frame')).toBeInTheDocument();
    expect(
      screen
        .getByTestId('agentic-approval-gate-visual-animation')
        .querySelectorAll('ellipse[data-kangur-soft-oval="true"]').length
    ).toBe(3);
  });

  it('renders the upgraded surface orbit visual surface', () => {
    render(<SurfaceOrbitVisual />);

    expect(screen.getByTestId('agentic-surface-orbit-animation')).toBeInTheDocument();
    expect(screen.getByTestId('agentic-surface-orbit-atmosphere')).toBeInTheDocument();
    expect(screen.getByTestId('agentic-surface-orbit-frame')).toBeInTheDocument();
    expect(
      screen
        .getByTestId('agentic-surface-orbit-animation')
        .querySelectorAll('ellipse[data-kangur-soft-oval="true"]').length
    ).toBe(3);
  });

  it('renders the upgraded reasoning dial visual surface', () => {
    render(<ReasoningDialVisual />);

    expect(screen.getByTestId('agentic-reasoning-dial-animation')).toBeInTheDocument();
    expect(screen.getByTestId('agentic-reasoning-dial-atmosphere')).toBeInTheDocument();
    expect(screen.getByTestId('agentic-reasoning-dial-frame')).toBeInTheDocument();
    expect(
      screen
        .getByTestId('agentic-reasoning-dial-animation')
        .querySelectorAll('ellipse[data-kangur-soft-oval="true"]').length
    ).toBe(3);
  });
});
