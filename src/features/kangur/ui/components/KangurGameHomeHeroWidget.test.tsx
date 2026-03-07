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

  it('uses the shared Kangur text field for anonymous home entry', () => {
    const setPlayerName = vi.fn();
    const handleStartGame = vi.fn();
    const navigateToLogin = vi.fn();

    useKangurGameRuntimeMock.mockReturnValue({
      basePath: '/kangur',
      handleStartGame,
      navigateToLogin,
      playerName: 'Ala',
      screen: 'home',
      setPlayerName,
      user: null,
    });

    render(<KangurGameHomeHeroWidget />);

    const input = screen.getByPlaceholderText('Wpisz swoje imie...');

    expect(screen.getByTestId('kangur-home-hero-shell')).toHaveClass(
      'glass-panel',
      'border-white/78',
      'bg-white/58'
    );
    expect(input).toHaveClass('soft-card', 'focus:border-indigo-300');
    expect(screen.getByRole('button', { name: /zaloguj się/i })).toHaveClass(
      'kangur-cta-pill',
      'surface-cta'
    );

    fireEvent.change(input, { target: { value: 'Ola' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.click(screen.getByRole('button', { name: /zaloguj się/i }));

    expect(setPlayerName).toHaveBeenCalledWith('Ola');
    expect(handleStartGame).toHaveBeenCalledTimes(1);
    expect(navigateToLogin).toHaveBeenCalledTimes(1);
  });

  it('shows the assignment spotlight for signed-in users on home', () => {
    useKangurGameRuntimeMock.mockReturnValue({
      basePath: '/kangur',
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
});
