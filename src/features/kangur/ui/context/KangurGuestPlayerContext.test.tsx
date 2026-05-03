/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  KangurGuestPlayerProvider,
  useKangurGuestPlayer,
} from './KangurGuestPlayerContext';

const { idleReadyMock, optionalRoutingMock } = vi.hoisted(() => ({
  idleReadyMock: vi.fn(() => true),
  optionalRoutingMock: vi.fn(() => null),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurIdleReady', () => ({
  useKangurIdleReady: (input: { minimumDelayMs?: number }) => idleReadyMock(input),
}));

vi.mock('@/features/kangur/ui/context/KangurRoutingContext', () => ({
  useOptionalKangurRouting: () => optionalRoutingMock(),
}));

function GuestPlayerProbe(): React.JSX.Element {
  const { guestPlayerName } = useKangurGuestPlayer();
  return <div data-testid='kangur-guest-player-name'>{guestPlayerName}</div>;
}

describe('KangurGuestPlayerProvider', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
    idleReadyMock.mockReturnValue(true);
    optionalRoutingMock.mockReturnValue(null);
  });

  it('hydrates the persisted guest player name immediately outside the standalone home delay path', () => {
    sessionStorage.setItem('kangur.guest-player-name', 'Ada');

    render(
      <KangurGuestPlayerProvider>
        <GuestPlayerProbe />
      </KangurGuestPlayerProvider>
    );

    expect(screen.getByTestId('kangur-guest-player-name')).toHaveTextContent('Ada');
  });

  it('keeps the guest player name dormant on the standalone home route until the idle gate opens', () => {
    sessionStorage.setItem('kangur.guest-player-name', 'Ada');
    optionalRoutingMock.mockReturnValue({
      pageKey: 'Game',
      embedded: false,
      requestedPath: '/kangur',
      requestedHref: '/kangur',
      basePath: '/kangur',
    });
    idleReadyMock.mockReturnValue(false);

    const { rerender } = render(
      <KangurGuestPlayerProvider>
        <GuestPlayerProbe />
      </KangurGuestPlayerProvider>
    );

    expect(screen.getByTestId('kangur-guest-player-name')).toHaveTextContent('');

    idleReadyMock.mockReturnValue(true);
    rerender(
      <KangurGuestPlayerProvider>
        <GuestPlayerProbe />
      </KangurGuestPlayerProvider>
    );

    expect(screen.getByTestId('kangur-guest-player-name')).toHaveTextContent('Ada');
  });
});
