/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', async () => await vi.importActual<typeof import('next-intl')>('next-intl'));
vi.mock('use-intl', async () => await vi.importActual<typeof import('use-intl')>('use-intl'));

vi.mock('@hello-pangea/dnd', () => ({
  DragDropContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Droppable: ({
    children,
  }: {
    children: (
      provided: {
        innerRef: (element: HTMLElement | null) => void;
        droppableProps: Record<string, never>;
        placeholder: null;
      },
      snapshot: { isDraggingOver: boolean }
    ) => React.ReactNode;
  }) =>
    children(
      {
        innerRef: () => undefined,
        droppableProps: {},
        placeholder: null,
      },
      { isDraggingOver: false }
    ),
  Draggable: ({
    children,
  }: {
    children: (
      provided: {
        innerRef: (element: HTMLElement | null) => void;
        draggableProps: Record<string, never>;
        dragHandleProps: Record<string, never>;
      },
      snapshot: { isDragging: boolean }
    ) => React.ReactNode;
  }) =>
    children(
      {
        innerRef: () => undefined,
        draggableProps: {},
        dragHandleProps: {},
      },
      { isDragging: false }
    ),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => true,
}));

import enMessages from '@/i18n/messages/en.json';
import CalendarInteractiveGame from '@/features/kangur/ui/components/CalendarInteractiveGame';

describe('CalendarInteractiveGame touch interactions', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows season touch guidance and lets coarse pointers tap a season card directly', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    render(
      <NextIntlClientProvider locale='en' messages={enMessages}>
        <CalendarInteractiveGame onFinish={vi.fn()} section='miesiace' />
      </NextIntlClientProvider>
    );

    expect(screen.getByTestId('calendar-interactive-touch-hint')).toHaveTextContent(
      'Tap a season card or drag the month card.'
    );

    const monthChip = screen.getByTestId('calendar-season-month-chip');
    expect(monthChip).toHaveClass('touch-manipulation');
    expect(monthChip).toHaveClass('min-h-[4.5rem]');

    const winterButton = screen.getByTestId('calendar-season-3');
    expect(winterButton).toHaveClass('touch-manipulation');
    expect(winterButton).toHaveClass('min-h-[124px]');

    fireEvent.click(winterButton);

    expect(winterButton).toBeDisabled();
  });
});
