/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

const { coarsePointerHookMock } = vi.hoisted(() => ({
  coarsePointerHookMock: vi.fn(() => true),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => coarsePointerHookMock(),
}));

import { KangurLessonGroupAccordion } from '../KangurLessonGroupAccordion';

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
    const shell = trigger.closest('.kangur-lesson-group-accordion');

    expect(shell).toHaveClass('kangur-panel-shell');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveAttribute('data-state', 'closed');
    expect(trigger).toHaveClass('min-h-12', 'touch-manipulation', 'select-none');
    expect(trigger).toHaveClass(
      'kangur-lesson-group-trigger',
      'kangur-button-shell',
      'kangur-cta-pill',
      'surface-cta',
      'justify-center',
      'text-center',
      'border-transparent'
    );
    expect(screen.queryByText('Grupa')).not.toBeInTheDocument();
    expect(document.querySelector('.kangur-lesson-group-chevron')).not.toBeInTheDocument();
    expect(screen.queryByText('Grouped lesson')).not.toBeInTheDocument();

    fireEvent.pointerDown(trigger);
    expect(trigger).toHaveAttribute('data-pressed', 'true');

    fireEvent.pointerUp(trigger);
    expect(trigger).toHaveAttribute('data-pressed', 'false');

    await user.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(trigger).toHaveAttribute('data-state', 'open');
    expect(trigger).toHaveClass(
      'kangur-button-shell',
      'kangur-cta-pill',
      'surface-cta',
      'justify-center',
      'text-center'
    );
    expect(screen.queryByText('Grupa')).not.toBeInTheDocument();
    expect(document.querySelector('.kangur-lesson-group-chevron')).not.toBeInTheDocument();
    expect(screen.getByText('Grouped lesson')).toBeInTheDocument();
    expect(screen.getByRole('region').firstElementChild).toHaveClass('w-full', 'items-center');

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

  it('uses provided coarse-pointer state without reading the hook', () => {
    coarsePointerHookMock.mockClear();

    render(
      <KangurLessonGroupAccordion
        accordionId='opening-section'
        fallbackTypeLabel='Grupa'
        isCoarsePointer={false}
        isExpanded={false}
        label='Opening Section'
        onToggle={() => undefined}
      >
        <div>Grouped lesson</div>
      </KangurLessonGroupAccordion>
    );

    const trigger = screen.getByRole('button', { name: /opening section/i });

    expect(coarsePointerHookMock).not.toHaveBeenCalled();
    expect(trigger).not.toHaveClass('min-h-12', 'touch-manipulation');
  });
});
