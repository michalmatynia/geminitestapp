/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  duelsLobbyMock,
  withKangurClientErrorMock,
  withKangurClientErrorSyncMock,
  useKangurGameRuntimeMock,
} = vi.hoisted(() => ({
  duelsLobbyMock: vi.fn(),
  withKangurClientErrorMock: vi.fn(),
  withKangurClientErrorSyncMock: vi.fn(),
  useKangurGameRuntimeMock: vi.fn(),
}));

vi.mock('next-intl', () => ({
  useTranslations:
    (namespace: string) =>
    (key: string, values?: Record<string, string | number>) => {
      if (namespace === 'KangurDuels.homeInvites') {
        if (key === 'heading') return 'Zaproszenia do pojedynkow';
        if (key === 'description') return 'Dolacz do prywatnych zaproszen.';
        if (key === 'sendInvite') return 'Wyslij zaproszenie';
        if (key === 'join') return 'Dolacz';
        if (key === 'loading') return 'Ladowanie';
        if (key === 'empty') return 'Brak zaproszen';
        if (key === 'loadError') return 'Blad ladowania';
        if (key === 'listAria') return 'Lista zaproszen';
        if (key === 'cardAria') return `Zaproszenie od ${values?.name ?? ''}`;
        if (key === 'meta') {
          return `${values?.operation} · ${values?.difficulty} · ${values?.questionCount} · ${values?.seconds}`;
        }
      }

      if (namespace === 'KangurDuels.common') {
        if (key === 'difficulty.easy') return 'Latwy';
        if (key === 'operations.addition') return 'Dodawanie';
        if (key === 'relative.now') return 'teraz';
      }

      return key;
    },
}));

vi.mock('@/features/kangur/services/kangur-platform', () => ({
  getKangurPlatform: () => ({
    duels: {
      lobby: duelsLobbyMock,
    },
  }),
}));

vi.mock('@/features/kangur/ui/context/KangurGameRuntimeContext', () => ({
  useKangurGameRuntime: useKangurGameRuntimeMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => true,
}));

vi.mock('@/features/kangur/observability/client', () => ({
  withKangurClientError: withKangurClientErrorMock,
  withKangurClientErrorSync: withKangurClientErrorSyncMock,
}));

vi.mock('@/features/kangur/ui/components/KangurTransitionLink', () => ({
  KangurTransitionLink: ({
    children,
    href,
    targetPageKey: _targetPageKey,
    transitionAcknowledgeMs: _transitionAcknowledgeMs,
    transitionSourceId: _transitionSourceId,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    targetPageKey?: string | null;
    transitionAcknowledgeMs?: number;
    transitionSourceId?: string | null;
  }) => (
    <a
      href={href}
      onClick={(event) => {
        event.preventDefault();
        rest.onClick?.(event);
      }}
      {...rest}
    >
      {children}
    </a>
  ),
}));

import { KangurGameHomeDuelsInvitesWidget } from '@/features/kangur/ui/components/KangurGameHomeDuelsInvitesWidget';

describe('KangurGameHomeDuelsInvitesWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useKangurGameRuntimeMock.mockReturnValue({
      basePath: '/kangur',
      screen: 'home',
      user: {
        activeLearner: {
          id: 'learner-1',
        },
      },
    });
    withKangurClientErrorMock.mockImplementation(async (_details, action: () => Promise<unknown>) => {
      await action();
      return undefined;
    });
    withKangurClientErrorSyncMock.mockImplementation(
      (_details, action: () => string): string => action()
    );
    duelsLobbyMock.mockResolvedValue({
      entries: [
        {
          sessionId: 'session-1',
          visibility: 'private',
          operation: 'addition',
          difficulty: 'easy',
          questionCount: 8,
          timePerQuestionSec: 12,
          updatedAt: '2026-03-22T11:00:00.000Z',
          host: {
            displayName: 'Ala',
          },
        },
      ],
    });
  });

  it('uses touch-friendly CTA sizing for the invite and join actions', async () => {
    render(<KangurGameHomeDuelsInvitesWidget />);

    expect(screen.getByRole('link', { name: 'Wyslij zaproszenie' })).toHaveClass(
      'min-h-11',
      'px-4',
      'touch-manipulation'
    );

    const joinAction = await screen.findByRole('link', { name: 'Dolacz' });
    expect(joinAction).toHaveClass('min-h-11', 'px-4', 'touch-manipulation');
    expect(joinAction).toHaveAttribute('href', '/kangur/duels?join=session-1');

    await waitFor(() => {
      expect(duelsLobbyMock).toHaveBeenCalledTimes(1);
    });
  });
});
