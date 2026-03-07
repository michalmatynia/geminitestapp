/**
 * @vitest-environment jsdom
 */

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { useKangurRoutingMock, useKangurAuthMock, settingsStoreGetMock } = vi.hoisted(() => ({
  useKangurRoutingMock: vi.fn(),
  useKangurAuthMock: vi.fn(),
  settingsStoreGetMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/context/KangurRoutingContext', () => ({
  useKangurRouting: useKangurRoutingMock,
  useOptionalKangurRouting: () => null,
}));

vi.mock('@/features/kangur/ui/context/KangurAuthContext', () => ({
  useKangurAuth: useKangurAuthMock,
}));

vi.mock('@/shared/providers/SettingsStoreProvider', () => ({
  useSettingsStore: () => ({
    get: settingsStoreGetMock,
  }),
}));

vi.mock('@/features/kangur/docs/tooltips', () => ({
  KangurDocsTooltipEnhancer: () => null,
  useKangurDocsTooltips: () => ({
    enabled: false,
    helpSettings: {
      version: 1,
      docsTooltips: {
        enabled: false,
        homeEnabled: false,
        lessonsEnabled: false,
        testsEnabled: false,
        profileEnabled: false,
        parentDashboardEnabled: false,
        adminEnabled: false,
      },
    },
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
    const heading = screen.getByTestId('kangur-tests-list-heading');
    expect(heading).toHaveClass('flex', 'flex-col', 'items-center', 'text-center');
    expect(within(heading).getByRole('heading', { name: 'Testy Kangur' })).toHaveClass(
      'text-2xl',
      'text-indigo-700'
    );
    expect(within(heading).getByText('🦘')).toHaveClass('bg-indigo-100', 'text-indigo-700');
  });

  it('shows the empty state when no suites are configured', () => {
    render(<Tests />);
    expect(screen.getByText(/Brak aktywnych zestawów testowych/)).toBeInTheDocument();
    expect(screen.getByText('Brak aktywnych zestawów testowych.').parentElement).toHaveClass(
      'soft-card',
      'border-dashed',
      'border-slate-200/80'
    );
  });

  it('shows enabled suites and hides disabled ones', () => {
    settingsStoreGetMock.mockImplementation((key: string) =>
      key === KANGUR_TEST_SUITES_SETTING_KEY ? twoSuitesRaw : null
    );
    render(<Tests />);
    expect(screen.getByRole('button', { name: /Kangur 2024 — 3 pkt/i })).toHaveClass('soft-card');
    expect(screen.getByTestId('tests-suite-icon-suite-math-2024')).toHaveClass(
      'bg-indigo-100',
      'text-indigo-700'
    );
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
    expect(screen.getByText('Zestaw testowy')).toHaveClass('border-indigo-200', 'bg-indigo-100');
    expect(screen.getByRole('button', { name: /wróć/i })).toHaveClass(
      'kangur-cta-pill',
      'surface-cta'
    );
  });

  it('shows suite metadata (year, gradeLevel, question count)', () => {
    settingsStoreGetMock.mockImplementation((key: string) =>
      key === KANGUR_TEST_SUITES_SETTING_KEY ? twoSuitesRaw : null
    );
    render(<Tests />);
    expect(screen.getByText('2024')).toHaveClass('border-slate-200', 'bg-slate-100');
    expect(screen.getByText(/III–IV/)).toHaveClass('border-slate-200', 'bg-slate-100');
    expect(screen.getByText('0 pytań')).toHaveClass('border-indigo-200', 'bg-indigo-100');
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
