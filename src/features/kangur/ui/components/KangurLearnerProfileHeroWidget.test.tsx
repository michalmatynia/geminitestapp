/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { routerPushMock, useKangurLearnerProfileRuntimeMock } = vi.hoisted(() => ({
  routerPushMock: vi.fn(),
  useKangurLearnerProfileRuntimeMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: routerPushMock,
  }),
}));

vi.mock('@/features/kangur/ui/context/KangurLearnerProfileRuntimeContext', () => ({
  getKangurLearnerProfileDisplayName: (user: { activeLearner?: { displayName?: string } | null } | null) =>
    user?.activeLearner?.displayName ?? 'Tryb lokalny',
  useKangurLearnerProfileRuntime: useKangurLearnerProfileRuntimeMock,
}));

import { KangurLearnerProfileHeroWidget } from '@/features/kangur/ui/components/KangurLearnerProfileHeroWidget';

describe('KangurLearnerProfileHeroWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the shared intro-card shell and routes back home', () => {
    const navigateToLogin = vi.fn();

    useKangurLearnerProfileRuntimeMock.mockReturnValue({
      basePath: '/kangur',
      navigateToLogin,
      user: null,
    });

    render(<KangurLearnerProfileHeroWidget />);

    expect(screen.getByTestId('kangur-learner-profile-hero')).toHaveClass(
      'glass-panel',
      'border-white/78',
      'bg-white/68'
    );
    expect(screen.getByRole('heading', { name: 'Profil ucznia' })).toHaveClass('text-3xl');
    expect(
      screen.getByText(
        'Zaloguj sie, aby synchronizowac postep ucznia miedzy urzadzeniami. Jesli nie masz jeszcze konta rodzica, zaloz je tutaj.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Zaloguj sie, aby synchronizowac postep' })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Utworz konto rodzica' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Wróć do poprzedniej strony' }));
    fireEvent.click(screen.getByRole('button', { name: 'Zaloguj sie, aby synchronizowac postep' }));
    fireEvent.click(screen.getByRole('button', { name: 'Utworz konto rodzica' }));

    expect(routerPushMock).toHaveBeenCalledWith('/kangur');
    expect(navigateToLogin).toHaveBeenCalledTimes(2);
    expect(navigateToLogin).toHaveBeenLastCalledWith({
      authMode: 'create-account',
    });
  });

  it('keeps the shared top section without the login CTA when a learner is active', () => {
    useKangurLearnerProfileRuntimeMock.mockReturnValue({
      basePath: '/kangur',
      navigateToLogin: vi.fn(),
      user: {
        activeLearner: {
          displayName: 'Ala',
        },
      },
    });

    render(<KangurLearnerProfileHeroWidget />);

    expect(screen.getByText('Ala')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Zaloguj sie, aby synchronizowac postep' })
    ).not.toBeInTheDocument();
  });
});
