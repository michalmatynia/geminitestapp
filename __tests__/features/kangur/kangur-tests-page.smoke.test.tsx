/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { useKangurRoutingMock, useKangurAuthMock, settingsStoreGetMock } = vi.hoisted(() => ({
  useKangurRoutingMock: vi.fn(),
  useKangurAuthMock: vi.fn(),
  settingsStoreGetMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/context/KangurRoutingContext', () => ({
  useKangurRouting: useKangurRoutingMock,
}));

vi.mock('@/features/kangur/ui/context/KangurAuthContext', () => ({
  useKangurAuth: useKangurAuthMock,
}));

vi.mock('@/shared/providers/SettingsStoreProvider', () => ({
  useSettingsStore: () => ({
    get: settingsStoreGetMock,
  }),
}));

vi.mock('@/features/kangur/ui/components/KangurTestSuitePlayer', () => ({
  KangurTestSuitePlayer: ({ suite }: { suite: { title: string } }) => (
    <div data-testid='suite-player'>{suite.title}</div>
  ),
}));

import Tests from '@/features/kangur/ui/pages/Tests';
import { KANGUR_TEST_SUITES_SETTING_KEY } from '@/shared/contracts/kangur-tests';

const twoSuitesRaw = JSON.stringify([
  {
    id: 'suite-math-2024',
    title: 'Kangur 2024 — 3 pkt',
    description: 'Zadania 3-punktowe',
    year: 2024,
    gradeLevel: 'III–IV',
    category: 'matematyczny',
    enabled: true,
    sortOrder: 1000,
  },
  {
    id: 'suite-disabled',
    title: 'Ukryty zestaw',
    description: '',
    year: null,
    gradeLevel: '',
    category: 'custom',
    enabled: false,
    sortOrder: 2000,
  },
]);

describe('Tests page smoke', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useKangurRoutingMock.mockReturnValue({ basePath: '/kangur' });
    useKangurAuthMock.mockReturnValue({
      user: null,
      navigateToLogin: vi.fn(),
      logout: vi.fn(),
    });
    settingsStoreGetMock.mockReturnValue(null);
  });

  it('renders the page heading', () => {
    render(<Tests />);
    expect(screen.getByText('🦘 Testy Kangur')).toBeInTheDocument();
  });

  it('shows the empty state when no suites are configured', () => {
    render(<Tests />);
    expect(screen.getByText(/Brak aktywnych zestawów testowych/)).toBeInTheDocument();
  });

  it('shows enabled suites and hides disabled ones', () => {
    settingsStoreGetMock.mockImplementation((key: string) =>
      key === KANGUR_TEST_SUITES_SETTING_KEY ? twoSuitesRaw : null
    );
    render(<Tests />);
    expect(screen.getByText('Kangur 2024 — 3 pkt')).toBeInTheDocument();
    expect(screen.queryByText('Ukryty zestaw')).not.toBeInTheDocument();
  });

  it('renders nav links to Game and Lessons pages', () => {
    render(<Tests />);
    expect(screen.getByRole('link', { name: /Strona glowna/i })).toHaveAttribute(
      'href',
      '/kangur/game'
    );
    expect(screen.getByRole('link', { name: /Lekcje/i })).toHaveAttribute(
      'href',
      '/kangur/lessons'
    );
  });

  it('shows the suite player after clicking an enabled suite', async () => {
    settingsStoreGetMock.mockImplementation((key: string) =>
      key === KANGUR_TEST_SUITES_SETTING_KEY ? twoSuitesRaw : null
    );
    render(<Tests />);

    const suiteButton = screen.getByRole('button', { name: /Kangur 2024 — 3 pkt/i });
    await userEvent.click(suiteButton);

    const player = await screen.findByTestId('suite-player');
    expect(player).toBeInTheDocument();
    expect(player).toHaveTextContent('Kangur 2024 — 3 pkt');
    expect(screen.getByRole('button', { name: /wróć/i })).toHaveClass(
      'kangur-cta-pill',
      'soft-cta'
    );
  });

  it('shows suite metadata (year, gradeLevel, question count)', () => {
    settingsStoreGetMock.mockImplementation((key: string) =>
      key === KANGUR_TEST_SUITES_SETTING_KEY ? twoSuitesRaw : null
    );
    render(<Tests />);
    expect(screen.getByText('2024')).toBeInTheDocument();
    expect(screen.getByText(/III–IV/)).toBeInTheDocument();
  });

  it('uses admin basePath for nav links when mounted inside admin shell', () => {
    useKangurRoutingMock.mockReturnValue({ basePath: '/admin/kangur' });
    render(<Tests />);
    expect(screen.getByRole('link', { name: /Strona glowna/i })).toHaveAttribute(
      'href',
      '/admin/kangur/game'
    );
  });
});
