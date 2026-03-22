/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => true,
}));

import AgenticApprovalGateGame from '@/features/kangur/ui/components/AgenticApprovalGateGame';

describe('AgenticApprovalGateGame touch interactions', () => {
  it('shows touch guidance and supports tap assignment', () => {
    render(<AgenticApprovalGateGame onFinish={vi.fn()} />);

    expect(screen.getByTestId('agentic-approval-touch-hint')).toHaveTextContent(
      'Tap an action card, then tap a gate choice.'
    );

    const action = screen.getByRole('button', {
      name: /Read log files and summarize the issue\./,
    });
    expect(action).toHaveClass('touch-manipulation');
    expect(action).toHaveClass('min-h-[5rem]');

    fireEvent.click(action);

    expect(action).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('agentic-approval-touch-hint')).toHaveTextContent(
      'Selected action: Read log files and summarize the issue. Tap a gate choice.'
    );

    fireEvent.click(screen.getByRole('button', { name: /Safe without approval/i }));

    expect(screen.getByTestId('agentic-approval-touch-hint')).toHaveTextContent(
      'Tap an action card, then tap a gate choice.'
    );
    expect(within(action).getByText('Safe without approval')).toBeInTheDocument();
  });
});
