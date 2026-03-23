/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, within } from '@testing-library/react';
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
  useKangurCoarsePointer: () => true,
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

describe('SubtractingGardenGame touch interactions', () => {
  it('supports selecting a token and tapping a destination zone', () => {
    render(
      <NextIntlClientProvider locale='en' messages={enMessages}>
        <SubtractingGardenGame onFinish={vi.fn()} />
      </NextIntlClientProvider>
    );

    expect(screen.getByTestId('subtracting-garden-touch-hint')).toHaveTextContent(
      'Tap a glowing point, then tap the basket or the cloud. You can still drag too.'
    );

    const basketZone = screen.getByTestId('subtracting-garden-zone-basket');
    const firstToken = within(basketZone).getAllByRole('button')[0];
    const tokenEmoji = firstToken.textContent ?? '';

    expect(firstToken).toHaveClass('touch-manipulation');
    expect(firstToken).toHaveStyle({ touchAction: 'none' });
    expect(firstToken).toHaveClass('h-14');

    fireEvent.click(firstToken);

    expect(screen.getByTestId('subtracting-garden-touch-hint')).toHaveTextContent(
      `Selected point: ${tokenEmoji}. Tap the basket or the cloud.`
    );

    const skyZone = screen.getByTestId('subtracting-garden-zone-sky');
    fireEvent.click(skyZone);

    expect(screen.getByTestId('subtracting-garden-touch-hint')).toHaveTextContent(
      'Tap a glowing point, then tap the basket or the cloud. You can still drag too.'
    );
    expect(within(skyZone).getByText(tokenEmoji)).toBeInTheDocument();
  });
});
