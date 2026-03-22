/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiPostMock } = vi.hoisted(() => ({
  apiPostMock: vi.fn(),
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

vi.mock('@/features/kangur/shared/hooks/use-interval', () => ({
  useInterval: () => undefined,
}));

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    post: apiPostMock,
  },
}));

import enMessages from '@/i18n/messages/en.json';
import NumberBalanceRushGame from '@/features/kangur/ui/components/NumberBalanceRushGame';

describe('NumberBalanceRushGame touch interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const serverTimeMs = Date.now();
    const match = {
      matchId: 'match-1',
      status: 'in_progress' as const,
      seed: 42,
      startTimeMs: serverTimeMs - 1000,
      roundDurationMs: 15000,
      tier: 'tier1' as const,
      balancedProbability: 1,
    };
    const player = {
      playerId: 'player-1',
      score: 0,
      puzzleIndex: 0,
      puzzleStartedAtMs: serverTimeMs - 1000,
    };

    apiPostMock.mockImplementation(async (path: string) => {
      if (path === '/api/kangur/number-balance/create') {
        return { match, player, serverTimeMs };
      }
      if (path === '/api/kangur/number-balance/state') {
        return {
          match,
          player,
          scores: [{ playerId: player.playerId, score: player.score }],
          playerCount: 1,
          serverTimeMs,
        };
      }
      throw new Error(`Unexpected API path: ${path}`);
    });
  });

  it('shows touch guidance and supports tap-to-zone moves', async () => {
    render(
      <NextIntlClientProvider locale='en' messages={enMessages}>
        <NumberBalanceRushGame />
      </NextIntlClientProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId('number-balance-touch-hint')).toHaveTextContent(
        'Tap a tile, then tap the left side, right side, or tray.'
      )
    );

    const tray = screen.getByTestId('number-balance-tray-zone');
    const tile = within(tray).getAllByRole('button')[0];
    const tileValue = tile.textContent?.trim() ?? '';
    expect(tileValue).not.toBe('');
    expect(tile).toHaveClass('touch-manipulation');
    expect(tile).toHaveClass('h-20');

    fireEvent.click(tile);

    expect(screen.getByTestId('number-balance-touch-hint')).toHaveTextContent(
      `Selected number: ${tileValue}. Tap the left side, right side, or tray.`
    );

    const leftZone = screen.getByTestId('number-balance-left-zone');
    fireEvent.click(leftZone);

    expect(screen.getByTestId('number-balance-touch-hint')).toHaveTextContent(
      'Tap a tile, then tap the left side, right side, or tray.'
    );
    expect(within(leftZone).getByText(tileValue)).toBeInTheDocument();
  });
});
