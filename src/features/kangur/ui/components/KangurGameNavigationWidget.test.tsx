/**
 * @vitest-environment jsdom
 */

import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  gameRuntimeMock,
  guestPlayerStateMock,
  openLoginModalMock,
  routingStateMock,
  topNavigationControllerPropsMock,
} = vi.hoisted(() => ({
  gameRuntimeMock: vi.fn(),
  guestPlayerStateMock: vi.fn(),
  openLoginModalMock: vi.fn(),
  routingStateMock: vi.fn(),
  topNavigationControllerPropsMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/context/KangurGameRuntimeContext', () => ({
  useKangurGameRuntime: () => gameRuntimeMock(),
}));

vi.mock('@/features/kangur/ui/context/KangurGuestPlayerContext', () => ({
  useKangurGuestPlayer: () => guestPlayerStateMock(),
}));

vi.mock('@/features/kangur/ui/context/KangurLoginModalContext', () => ({
  useKangurLoginModal: () => ({
    openLoginModal: openLoginModalMock,
  }),
}));

vi.mock('@/features/kangur/ui/context/KangurRoutingContext', () => ({
  useKangurRouting: () => routingStateMock(),
}));

vi.mock('@/features/kangur/ui/components/primary-navigation/KangurTopNavigationController', () => ({
  KangurTopNavigationController: (props: unknown) => {
    topNavigationControllerPropsMock(props);
    return <div data-testid='kangur-top-navigation-controller' />;
  },
}));

import { KangurGameNavigationWidget } from '@/features/kangur/ui/components/KangurGameNavigationWidget';

describe('KangurGameNavigationWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    gameRuntimeMock.mockReturnValue({
      basePath: '/kangur',
      handleHome: vi.fn(),
      logout: vi.fn(),
      screen: 'operation',
      user: null,
    });
    guestPlayerStateMock.mockReturnValue({
      guestPlayerName: 'Ala',
      setGuestPlayerName: vi.fn(),
    });
    routingStateMock.mockReturnValue({
      pageKey: 'Game',
    });
  });

  it('passes the shared login modal opener into the top navigation for guests', () => {
    const logout = vi.fn();
    const handleHome = vi.fn();
    const setGuestPlayerName = vi.fn();

    gameRuntimeMock.mockReturnValue({
      basePath: '/kangur',
      handleHome,
      logout,
      screen: 'home',
      user: null,
    });
    guestPlayerStateMock.mockReturnValue({
      guestPlayerName: 'Ala',
      setGuestPlayerName,
    });

    render(<KangurGameNavigationWidget />);

    const latestProps = topNavigationControllerPropsMock.mock.calls.at(-1)?.[0] as
      | {
        navigation?: {
          guestPlayerName?: string;
          homeActive?: boolean;
          isAuthenticated?: boolean;
          onGuestPlayerNameChange?: (value: string) => void;
          onHomeClick?: () => void;
          onLogin?: () => void;
          onLogout?: () => void;
        };
        visible?: boolean;
      }
      | undefined;

    expect(latestProps?.visible).toBe(true);
    expect(latestProps?.navigation?.guestPlayerName).toBe('Ala');
    expect(latestProps?.navigation?.homeActive).toBe(true);
    expect(latestProps?.navigation?.isAuthenticated).toBe(false);
    expect(latestProps?.navigation?.onGuestPlayerNameChange).toBe(setGuestPlayerName);
    expect(latestProps?.navigation?.onHomeClick).toBe(handleHome);
    expect(latestProps?.navigation?.onLogin).toBe(openLoginModalMock);

    latestProps?.navigation?.onLogin?.();
    latestProps?.navigation?.onLogout?.();

    expect(openLoginModalMock).toHaveBeenCalledTimes(1);
    expect(logout).toHaveBeenCalledWith(false);
  });

  it('forwards the hidden home-state visibility to the top navigation controller', () => {
    render(<KangurGameNavigationWidget visible={false} />);

    const latestProps = topNavigationControllerPropsMock.mock.calls.at(-1)?.[0] as
      | { visible?: boolean }
      | undefined;

    expect(latestProps?.visible).toBe(false);
  });
});
