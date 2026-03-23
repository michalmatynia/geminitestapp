/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  duelsLobbyMock,
  kangurTransitionLinkMock,
  useKangurGameRuntimeMock,
} = vi.hoisted(() => ({
  duelsLobbyMock: vi.fn(),
  kangurTransitionLinkMock: vi.fn(),
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
        if (key === 'empty') return 'Brak zaproszen';
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

vi.mock('@/features/kangur/ui/components/KangurTransitionLink', () => ({
  KangurTransitionLink: ({
    children,
    href,
    prefetch: _prefetch,
    targetPageKey: _targetPageKey,
    transitionAcknowledgeMs: _transitionAcknowledgeMs,
    transitionSourceId: _transitionSourceId,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    prefetch?: boolean;
    targetPageKey?: string | null;
    transitionAcknowledgeMs?: number;
    transitionSourceId?: string | null;
  }) => {
    kangurTransitionLinkMock({
      href,
      prefetch: _prefetch,
      targetPageKey: _targetPageKey,
      transitionAcknowledgeMs: _transitionAcknowledgeMs,
      transitionSourceId: _transitionSourceId,
    });
    return (
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
    );
  },
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
  });

  it('renders a touch-friendly CTA without fetching duel invites on the home screen', () => {
    render(<KangurGameHomeDuelsInvitesWidget />);

    const inviteAction = screen.getByRole('link', { name: 'Wyslij zaproszenie' });

    expect(inviteAction).toHaveClass(
      'min-h-11',
      'px-4',
      'touch-manipulation'
    );
    expect(inviteAction).toHaveAttribute('href', '/kangur/duels#kangur-duels-invite');
    expect(screen.getByText('Brak zaproszen')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Dolacz' })).not.toBeInTheDocument();
    expect(kangurTransitionLinkMock).toHaveBeenCalledWith(
      expect.objectContaining({
        href: '/kangur/duels#kangur-duels-invite',
        prefetch: false,
        targetPageKey: 'Duels',
      })
    );
    expect(duelsLobbyMock).not.toHaveBeenCalled();
  });
});
