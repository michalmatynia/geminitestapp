/**
 * @vitest-environment jsdom
 */

import userEvent from '@testing-library/user-event';
import { render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import { createDefaultKangurProgressState } from '@/features/kangur/shared/contracts/kangur';

const { addXpMock, createLessonPracticeRewardMock } = vi.hoisted(() => ({
  addXpMock: vi.fn(),
  createLessonPracticeRewardMock: vi.fn(() => ({
    xp: 25,
    scorePercent: 100,
    progressUpdates: {},
  })),
}));

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
  useKangurCoarsePointer: () => false,
}));

vi.mock('@/features/kangur/ui/services/progress', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/kangur/ui/services/progress')>();

  return {
    ...actual,
    loadProgress: () => createDefaultKangurProgressState(),
    createLessonPracticeReward: (...args: unknown[]) => createLessonPracticeRewardMock(...args),
    addXp: (...args: unknown[]) => addXpMock(...args),
  };
});

import enMessages from '@/i18n/messages/en.json';
import SubtractingGardenGame from '@/features/kangur/ui/components/SubtractingGardenGame';

describe('SubtractingGardenGame keyboard interactions', () => {
  it('supports selecting a point and moving it to the cloud with the keyboard', async () => {
    const user = userEvent.setup();

    render(
      <NextIntlClientProvider locale='en' messages={enMessages}>
        <SubtractingGardenGame onFinish={vi.fn()} />
      </NextIntlClientProvider>
    );

    expect(screen.getByTestId('subtracting-garden-touch-hint')).toHaveTextContent(
      'Choose a glowing point, then move to the basket or the cloud and press Enter or Space.'
    );

    const basketZone = screen.getByTestId('subtracting-garden-zone-basket');
    const token = within(basketZone).getAllByRole('button', {
      name: 'Move glowing point',
    })[0];
    const emoji = token?.textContent?.trim() ?? '';

    token.focus();
    await user.keyboard('{Enter}');

    expect(token).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('subtracting-garden-touch-hint')).toHaveTextContent(
      `Selected point: ${emoji}. Move to the basket or the cloud and press Enter or Space.`
    );

    const skyZone = screen.getByRole('button', {
      name: 'Move the selected point to the cloud',
    });
    skyZone.focus();
    await user.keyboard('{Enter}');

    expect(within(screen.getByTestId('subtracting-garden-zone-sky')).getByText(emoji)).toBeInTheDocument();
    expect(screen.getByTestId('subtracting-garden-touch-hint')).toHaveTextContent(
      'Choose a glowing point, then move to the basket or the cloud and press Enter or Space.'
    );
  });
});
