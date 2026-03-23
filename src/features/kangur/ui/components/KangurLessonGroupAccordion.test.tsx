/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => true,
}));

import { KangurLessonGroupAccordion } from './KangurLessonGroupAccordion';

function TestAccordion() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <KangurLessonGroupAccordion
      accordionId='opening-section'
      fallbackTypeLabel='Grupa'
      isExpanded={isExpanded}
      label='Opening Section'
      onToggle={() => setIsExpanded((current) => !current)}
    >
      <div>Grouped lesson</div>
    </KangurLessonGroupAccordion>
  );
}

describe('KangurLessonGroupAccordion', () => {
  it('opens on the first click and exposes pressed-state feedback', async () => {
    const user = userEvent.setup();

    render(<TestAccordion />);

    const trigger = screen.getByRole('button', { name: /opening section/i });

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveAttribute('data-state', 'closed');
    expect(trigger).toHaveClass('min-h-12', 'touch-manipulation', 'select-none');
    expect(screen.queryByText('Grouped lesson')).not.toBeInTheDocument();

    fireEvent.pointerDown(trigger);
    expect(trigger).toHaveAttribute('data-pressed', 'true');

    fireEvent.pointerUp(trigger);
    expect(trigger).toHaveAttribute('data-pressed', 'false');

    await user.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(trigger).toHaveAttribute('data-state', 'open');
    expect(screen.getByText('Grouped lesson')).toBeInTheDocument();

    await user.click(trigger);

    await waitFor(() => {
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      expect(trigger).toHaveAttribute('data-state', 'closed');
    });
  });

  it('toggles from the keyboard as a native button', async () => {
    const user = userEvent.setup();

    render(<TestAccordion />);

    const trigger = screen.getByRole('button', { name: /opening section/i });

    trigger.focus();
    expect(trigger).toHaveFocus();

    await user.keyboard('{Enter}');

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Grouped lesson')).toBeInTheDocument();

    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });
  });
});
