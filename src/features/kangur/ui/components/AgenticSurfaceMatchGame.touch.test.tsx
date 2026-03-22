/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => true,
}));

import AgenticSurfaceMatchGame from '@/features/kangur/ui/components/AgenticSurfaceMatchGame';

describe('AgenticSurfaceMatchGame touch interactions', () => {
  it('shows touch guidance and supports tap surface matching', () => {
    render(<AgenticSurfaceMatchGame onFinish={vi.fn()} />);

    expect(screen.getByTestId('agentic-surface-touch-hint')).toHaveTextContent(
      'Tap a scenario card, then tap a surface.'
    );

    const scenario = screen.getByRole('button', {
      name: /You have a clear repro and want to run quick local tests\./,
    });
    expect(scenario).toHaveClass('touch-manipulation');
    expect(scenario).toHaveClass('min-h-[5rem]');

    fireEvent.click(scenario);

    expect(scenario).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('agentic-surface-touch-hint')).toHaveTextContent(
      'Selected scenario: You have a clear repro and want to run quick local tests. Tap a surface.'
    );

    fireEvent.click(screen.getByRole('button', { name: /^CLI$/i }));

    expect(screen.getByTestId('agentic-surface-touch-hint')).toHaveTextContent(
      'Tap a scenario card, then tap a surface.'
    );
    expect(within(scenario).getByText('CLI')).toBeInTheDocument();
  });
});
