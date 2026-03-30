/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', () => ({
  useLocale: () => 'pl',
}));

const {
  toastMock,
  mutateAsyncMock,
  handleSelectMock,
  updateCatalogMock,
  useAppearancePageMock,
} = vi.hoisted(() => ({
  toastMock: vi.fn(),
  mutateAsyncMock: vi.fn(async () => undefined),
  handleSelectMock: vi.fn(),
  updateCatalogMock: vi.fn(),
  useAppearancePageMock: vi.fn(),
}));

vi.mock('@/features/kangur/shared/ui', () => ({
  AppModal: ({
    isOpen,
    title,
    children,
  }: {
    isOpen: boolean;
    title: React.ReactNode;
    children: React.ReactNode;
  }) =>
    isOpen ? (
      <div role='dialog' aria-label={String(title)}>
        {children}
      </div>
    ) : null,
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  Button: ({
    children,
    onClick,
    disabled,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button type='button' onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  Card: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => <section {...props}>{children}</section>,
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
  SelectSimple: ({
    value,
    onValueChange,
    options,
    ariaLabel,
    title,
  }: {
    value: string | undefined;
    onValueChange: (value: string) => void;
    options: Array<{ value: string; label: string }>;
    ariaLabel?: string;
    title?: string;
  }) => (
    <select
      aria-label={ariaLabel}
      title={title}
      value={value ?? ''}
      onChange={(event) => onValueChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
  useToast: () => ({ toast: toastMock }),
}));

vi.mock('@/shared/hooks/use-settings', () => ({
  useUpdateSetting: () => ({
    mutateAsync: mutateAsyncMock,
  }),
}));

vi.mock('@/features/cms/public', () => ({
  resolveKangurStorefrontAppearance: () => ({
    background: 'linear-gradient(180deg, #111827 0%, #1f2937 100%)',
  }),
}));

vi.mock('./AppearancePage.context', () => ({
  useAppearancePage: useAppearancePageMock,
}));

vi.mock('@/features/kangur/observability/client', () => ({
  withKangurClientError: async (
    _metadata: unknown,
    action: () => Promise<unknown>
  ): Promise<unknown> => action(),
}));

import { KANGUR_DEFAULT_DAILY_THEME } from '@/features/kangur/appearance/theme-settings';
import { ThemeCatalogModal } from './ThemeCatalogModal';

const buildThemeEntry = (
  id: string,
  name: string,
  createdAt: string,
  updatedAt: string
) => ({
  id,
  name,
  settings: {
    ...KANGUR_DEFAULT_DAILY_THEME,
    themePreset: id,
  },
  createdAt,
  updatedAt,
});

const catalogEntries = [
  buildThemeEntry('theme-alpha', 'Alpha', '2026-03-01T10:00:00.000Z', '2026-03-01T10:00:00.000Z'),
  buildThemeEntry('theme-beta', 'Beta', '2026-03-12T10:00:00.000Z', '2026-03-18T10:00:00.000Z'),
  buildThemeEntry('theme-gamma', 'Gamma', '2026-03-05T10:00:00.000Z', '2026-03-20T10:00:00.000Z'),
];

const getVisibleThemeNames = (): string[] =>
  screen
    .queryAllByTestId('theme-catalog-entry-name')
    .map((node) => node.textContent?.trim() ?? '')
    .filter(Boolean);

describe('ThemeCatalogModal', () => {
  beforeEach(() => {
    toastMock.mockReset();
    mutateAsyncMock.mockClear();
    handleSelectMock.mockClear();
    updateCatalogMock.mockClear();
    useAppearancePageMock.mockReturnValue({
      catalog: catalogEntries,
      draft: KANGUR_DEFAULT_DAILY_THEME,
      slotThemes: {
        daily: KANGUR_DEFAULT_DAILY_THEME,
      },
      selectedId: 'theme-alpha',
      handleSelect: handleSelectMock,
      updateCatalog: updateCatalogMock,
    });
  });

  it('shows newest themes first by default and exposes catalog metadata', () => {
    render(<ThemeCatalogModal />);

    fireEvent.click(screen.getByRole('button', { name: /Katalog motywów/i }));

    expect(screen.getByRole('dialog', { name: 'Katalog zapisanych motywów' })).toBeInTheDocument();
    expect(getVisibleThemeNames()).toEqual(['Beta', 'Gamma', 'Alpha']);
    expect(screen.getByText('Pokazano 3 z 3 motywów')).toBeInTheDocument();
    expect(screen.getAllByText(/Utworzono:/i)).toHaveLength(3);
    expect(screen.getAllByText(/Zaktualizowano:/i)).toHaveLength(3);
  });

  it('filters themes by name and updates the visible count', () => {
    render(<ThemeCatalogModal />);

    fireEvent.click(screen.getByRole('button', { name: /Katalog motywów/i }));
    fireEvent.change(screen.getByLabelText('Filtruj motywy w katalogu'), {
      target: { value: 'ga' },
    });

    expect(getVisibleThemeNames()).toEqual(['Gamma']);
    expect(screen.getByText('Pokazano 1 z 3 motywów')).toBeInTheDocument();
  });

  it('supports sorting by oldest, updated date, and alphabetical name', () => {
    render(<ThemeCatalogModal />);

    fireEvent.click(screen.getByRole('button', { name: /Katalog motywów/i }));

    fireEvent.change(screen.getByLabelText('Sortowanie katalogu motywów'), {
      target: { value: 'created-asc' },
    });
    expect(getVisibleThemeNames()).toEqual(['Alpha', 'Gamma', 'Beta']);

    fireEvent.change(screen.getByLabelText('Sortowanie katalogu motywów'), {
      target: { value: 'updated-desc' },
    });
    expect(getVisibleThemeNames()).toEqual(['Gamma', 'Beta', 'Alpha']);

    fireEvent.change(screen.getByLabelText('Sortowanie katalogu motywów'), {
      target: { value: 'name-asc' },
    });
    expect(getVisibleThemeNames()).toEqual(['Alpha', 'Beta', 'Gamma']);
  });

  it('shows a dedicated empty state when filters hide every theme', () => {
    render(<ThemeCatalogModal />);

    fireEvent.click(screen.getByRole('button', { name: /Katalog motywów/i }));
    fireEvent.change(screen.getByLabelText('Filtruj motywy w katalogu'), {
      target: { value: 'zzz' },
    });

    expect(getVisibleThemeNames()).toEqual([]);
    expect(screen.getByText('Brak motywów pasujących do bieżących filtrów.')).toBeInTheDocument();
  });
});
