/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/kangur/ui/design/primitives', () => ({
  KangurButton: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => false,
}));

import { KangurLessonsHubSectionSelector } from './KangurLessonsHubSectionSelector';

describe('KangurLessonsHubSectionSelector', () => {
  it('renders a centered left-right selector without accordion chrome', () => {
    const onSelect = vi.fn();

    render(
      <KangurLessonsHubSectionSelector
        items={[
          { id: 'clock', accessibleLabel: 'Clock', label: 'Clock' },
          { id: 'calendar', accessibleLabel: 'Calendar', label: 'Calendar' },
          { id: 'time', accessibleLabel: 'Time', label: 'Time' },
        ]}
        onSelect={onSelect}
        selectedId='calendar'
      />
    );

    expect(screen.getByTestId('kangur-lessons-hub-selector-current')).toHaveTextContent('Calendar');
    expect(document.querySelector('.kangur-lesson-group-chevron')).toBeNull();

    fireEvent.click(screen.getByTestId('kangur-lessons-hub-selector-prev'));
    fireEvent.click(screen.getByTestId('kangur-lessons-hub-selector-next'));

    expect(onSelect).toHaveBeenNthCalledWith(1, 'clock');
    expect(onSelect).toHaveBeenNthCalledWith(2, 'time');
  });

  it('disables unavailable directions at the edges', () => {
    render(
      <KangurLessonsHubSectionSelector
        items={[
          { id: 'clock', accessibleLabel: 'Clock', label: 'Clock' },
          { id: 'calendar', accessibleLabel: 'Calendar', label: 'Calendar' },
        ]}
        onSelect={vi.fn()}
        selectedId='clock'
      />
    );

    expect(screen.getByTestId('kangur-lessons-hub-selector-prev')).toBeDisabled();
    expect(screen.getByTestId('kangur-lessons-hub-selector-next')).not.toBeDisabled();
  });
});
