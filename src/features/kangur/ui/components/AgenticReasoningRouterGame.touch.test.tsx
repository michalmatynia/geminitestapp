/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => true,
}));

import AgenticReasoningRouterGame from '@/features/kangur/ui/components/AgenticReasoningRouterGame';

describe('AgenticReasoningRouterGame touch interactions', () => {
  it('shows touch guidance and supports tap routing', () => {
    render(<AgenticReasoningRouterGame onFinish={vi.fn()} />);

    expect(screen.getByTestId('agentic-reasoning-touch-hint')).toHaveTextContent(
      'Tap a task card, then tap a reasoning level.'
    );

    const task = screen.getByRole('button', {
      name: /Fix a typo in README and rerun lint\./,
    });
    expect(task).toHaveClass('touch-manipulation');
    expect(task).toHaveClass('min-h-[5rem]');

    fireEvent.click(task);

    expect(task).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('agentic-reasoning-touch-hint')).toHaveTextContent(
      'Selected task: Fix a typo in README and rerun lint. Tap a reasoning level.'
    );

    fireEvent.click(screen.getByRole('button', { name: /^Low$/i }));

    expect(screen.getByTestId('agentic-reasoning-touch-hint')).toHaveTextContent(
      'Tap a task card, then tap a reasoning level.'
    );
    expect(within(task).getByText('Low')).toBeInTheDocument();
  });
});
