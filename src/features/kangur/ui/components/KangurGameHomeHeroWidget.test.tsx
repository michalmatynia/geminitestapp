/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { useKangurGameRuntimeMock } = vi.hoisted(() => ({
  useKangurGameRuntimeMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/context/KangurGameRuntimeContext', () => ({
  useKangurGameRuntime: useKangurGameRuntimeMock,
}));

vi.mock('@/features/kangur/ui/components/KangurAssignmentSpotlight', () => ({
  default: ({ basePath }: { basePath: string }) => <div>spotlight:{basePath}</div>,
}));

import { KangurGameHomeHeroWidget } from '@/features/kangur/ui/components/KangurGameHomeHeroWidget';

describe('KangurGameHomeHeroWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('no longer renders anonymous guest controls on the home page', () => {
    useKangurGameRuntimeMock.mockReturnValue({
      basePath: '/kangur',
      canAccessParentAssignments: false,
      handleStartGame: vi.fn(),
      navigateToLogin: vi.fn(),
      playerName: 'Ala',
      screen: 'home',
      setPlayerName: vi.fn(),
      user: null,
    });

    render(<KangurGameHomeHeroWidget />);

    expect(screen.queryByTestId('kangur-home-hero-shell')).toBeNull();
    expect(screen.queryByPlaceholderText('Wpisz swoje imie...')).toBeNull();
    expect(screen.queryByText('Grasz jako gosc')).toBeNull();
  });

  it('shows the assignment spotlight for signed-in users on home', () => {
    useKangurGameRuntimeMock.mockReturnValue({
      basePath: '/kangur',
      canAccessParentAssignments: true,
      handleStartGame: vi.fn(),
      navigateToLogin: vi.fn(),
      playerName: '',
      screen: 'home',
      setPlayerName: vi.fn(),
      user: { id: 'user-1' },
    });

    render(<KangurGameHomeHeroWidget />);

    expect(screen.getByText('spotlight:/kangur')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Wpisz swoje imie...')).toBeNull();
  });

  it('stays empty when assignment access is disabled', () => {
    useKangurGameRuntimeMock.mockReturnValue({
      basePath: '/kangur',
      canAccessParentAssignments: false,
      handleStartGame: vi.fn(),
      navigateToLogin: vi.fn(),
      playerName: '',
      screen: 'home',
      setPlayerName: vi.fn(),
      user: { id: 'user-1' },
    });

    render(<KangurGameHomeHeroWidget />);

    expect(screen.queryByText('spotlight:/kangur')).toBeNull();
    expect(screen.queryByTestId('kangur-home-hero-shell')).toBeNull();
  });

  it('keeps the assignment spotlight mounted outside the home screen when the transition override is disabled', () => {
    useKangurGameRuntimeMock.mockReturnValue({
      basePath: '/kangur',
      canAccessParentAssignments: true,
      handleStartGame: vi.fn(),
      navigateToLogin: vi.fn(),
      playerName: 'Ala',
      screen: 'operation',
      setPlayerName: vi.fn(),
      user: { id: 'user-1' },
    });

    render(<KangurGameHomeHeroWidget hideWhenScreenMismatch={false} />);

    expect(screen.getByText('spotlight:/kangur')).toBeInTheDocument();
  });
});
