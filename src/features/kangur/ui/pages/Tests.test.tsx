/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { routerPushMock, settingsStoreMock, authState } = vi.hoisted(() => ({
  routerPushMock: vi.fn(),
  settingsStoreMock: {
    get: vi.fn<(key: string) => string | undefined>(),
  },
  authState: {
    value: {
      logout: vi.fn(),
      navigateToLogin: vi.fn(),
      user: null,
    },
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: routerPushMock,
  }),
}));

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

vi.mock('@/features/kangur/docs/tooltips', () => ({
  KangurDocsTooltipEnhancer: () => null,
  useKangurDocsTooltips: () => ({ enabled: false }),
}));

vi.mock('@/features/kangur/ui/components/KangurTopNavigationController', () => ({
  KangurTopNavigationController: () => <div data-testid='mock-tests-top-navigation' />,
}));

vi.mock('@/features/kangur/ui/components/KangurTestSuitePlayer', () => ({
  KangurTestSuitePlayer: () => <div data-testid='mock-test-suite-player' />,
}));

vi.mock('@/features/kangur/ui/context/KangurAuthContext', () => ({
  useKangurAuth: () => authState.value,
}));

vi.mock('@/features/kangur/ui/context/KangurRoutingContext', () => ({
  useKangurRouting: () => ({ basePath: '/kangur' }),
  useOptionalKangurRouting: () => ({ basePath: '/kangur', embedded: false }),
}));

vi.mock('@/shared/providers/SettingsStoreProvider', () => ({
  useSettingsStore: () => settingsStoreMock,
}));

import { KANGUR_TEST_QUESTIONS_SETTING_KEY, KANGUR_TEST_SUITES_SETTING_KEY } from '@/shared/contracts/kangur-tests';
import { KangurGuestPlayerProvider } from '@/features/kangur/ui/context/KangurGuestPlayerContext';
import Tests from '@/features/kangur/ui/pages/Tests';

const renderTestsPage = () =>
  render(
    <KangurGuestPlayerProvider>
      <Tests />
    </KangurGuestPlayerProvider>
  );

describe('Tests page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    settingsStoreMock.get.mockImplementation((key: string) => {
      if (key === KANGUR_TEST_SUITES_SETTING_KEY) {
        return JSON.stringify([
          {
            id: 'suite-1',
            title: 'Test probny',
            description: 'Pierwszy zestaw',
            year: 2024,
            gradeLevel: 'Klasa 3',
            category: 'custom',
            enabled: true,
            sortOrder: 1000,
          },
        ]);
      }

      if (key === KANGUR_TEST_QUESTIONS_SETTING_KEY) {
        return JSON.stringify({});
      }

      return undefined;
    });
  });

  it('renders the tests list with the shared intro-card top section and back navigation', () => {
    renderTestsPage();

    expect(screen.getByTestId('kangur-tests-list-top-section')).toHaveClass(
      'glass-panel',
      'border-white/78',
      'bg-white/68'
    );
    expect(screen.getByRole('heading', { name: 'Testy Kangur' })).toHaveClass('text-3xl');
    expect(screen.queryByText('Zestawy treningowe')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Test probny/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Wróć do poprzedniej strony' }));

    expect(routerPushMock).toHaveBeenCalledWith('/kangur');
  });
});
