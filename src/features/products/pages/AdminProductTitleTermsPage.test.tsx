// @vitest-environment jsdom

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  toastMock,
  confirmMock,
  useCatalogsMock,
  useTitleTermsMock,
  useSaveTitleTermMutationMock,
  useDeleteTitleTermMutationMock,
} = vi.hoisted(() => ({
  toastMock: vi.fn(),
  confirmMock: vi.fn(),
  useCatalogsMock: vi.fn(),
  useTitleTermsMock: vi.fn(),
  useSaveTitleTermMutationMock: vi.fn(),
  useDeleteTitleTermMutationMock: vi.fn(),
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
  }: {
    children?: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

vi.mock('@/features/products/hooks/useProductMetadataQueries', () => ({
  useCatalogs: (...args: unknown[]) => useCatalogsMock(...args),
  useTitleTerms: (...args: unknown[]) => useTitleTermsMock(...args),
  useSaveTitleTermMutation: () => useSaveTitleTermMutationMock(),
  useDeleteTitleTermMutation: () => useDeleteTitleTermMutationMock(),
}));

vi.mock('@/shared/hooks/ui/useConfirm', () => ({
  useConfirm: () => ({
    confirm: confirmMock,
    ConfirmationModal: () => null,
  }),
}));

vi.mock('@/shared/ui/toast', () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientCatch: vi.fn(),
}));

vi.mock('@/shared/ui/admin-products-page-layout', () => ({
  AdminProductsPageLayout: ({
    children,
    title,
    headerActions,
  }: {
    children?: React.ReactNode;
    title?: string;
    headerActions?: React.ReactNode;
  }) => (
    <div>
      <h1>{title}</h1>
      {headerActions}
      {children}
    </div>
  ),
}));

vi.mock('@/shared/ui/button', () => ({
  Button: ({
    children,
    onClick,
    asChild,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    children?: React.ReactNode;
    asChild?: boolean;
  }) =>
    asChild ? (
      <span {...props}>{children}</span>
    ) : (
      <button type='button' onClick={onClick} {...props}>
        {children}
      </button>
    ),
}));

vi.mock('@/shared/ui/empty-state', () => ({
  EmptyState: ({
    title,
    description,
  }: {
    title?: string;
    description?: string;
  }) => (
    <div>
      <div>{title}</div>
      <div>{description}</div>
    </div>
  ),
}));

vi.mock('@/shared/ui/search-input', () => ({
  SearchInput: ({
    value,
    onChange,
    placeholder,
  }: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input value={value} onChange={onChange} placeholder={placeholder} />
  ),
}));

vi.mock('@/shared/ui/select-simple', () => ({
  SelectSimple: ({
    value,
    onValueChange,
    options,
    ariaLabel,
  }: {
    value?: string;
    onValueChange?: (value: string) => void;
    options: Array<{ value: string; label: string }>;
    ariaLabel?: string;
  }) => (
    <select
      aria-label={ariaLabel}
      value={value ?? ''}
      onChange={(event) => onValueChange?.(event.target.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}));

vi.mock('@/shared/ui/templates/SettingsPanelBuilder', () => ({
  SettingsPanelBuilder: () => null,
}));

vi.mock('@/shared/ui/templates/StandardDataTablePanel', () => ({
  StandardDataTablePanel: ({
    data,
    filters,
  }: {
    data?: Array<{ id: string; name_en: string; catalogId: string; type: string }>;
    filters?: React.ReactNode;
  }) => (
    <section>
      {filters}
      {data?.map((row) => (
        <div key={row.id}>
          <span>{row.name_en}</span>
          <span>{row.catalogId}</span>
          <span>{row.type}</span>
        </div>
      ))}
    </section>
  ),
}));

import { AdminProductTitleTermsPage } from './AdminProductTitleTermsPage';

const buildQueryResult = (overrides: Record<string, unknown> = {}) => ({
  data: [],
  isLoading: false,
  ...overrides,
});

const catalogs = [
  { id: 'catalog-a', name: 'Catalog A', isDefault: true },
  { id: 'catalog-b', name: 'Catalog B', isDefault: false },
];

const titleTerms = [
  {
    id: 'term-1',
    name: '4 cm',
    description: null,
    catalogId: 'catalog-a',
    type: 'size',
    name_en: '4 cm',
    name_pl: '4 cm',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'term-2',
    name: 'Metal',
    description: null,
    catalogId: 'catalog-b',
    type: 'material',
    name_en: 'Metal',
    name_pl: 'Metal',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

describe('AdminProductTitleTermsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useCatalogsMock.mockReturnValue(
      buildQueryResult({
        data: catalogs,
      })
    );
    useTitleTermsMock.mockImplementation(
      (catalogId?: string, type?: 'size' | 'material' | 'theme') =>
        buildQueryResult({
          data: titleTerms.filter(
            (term) =>
              (!catalogId || term.catalogId === catalogId) && (!type || term.type === type)
          ),
        })
    );
    useSaveTitleTermMutationMock.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
    useDeleteTitleTermMutationMock.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
  });

  it('loads all-catalog title terms when the catalog filter is not selected', () => {
    render(<AdminProductTitleTermsPage />);

    expect(useTitleTermsMock).toHaveBeenLastCalledWith(undefined, undefined, {
      allowWithoutCatalog: true,
    });
    expect(screen.getByText('4 cm')).toBeInTheDocument();
    expect(screen.getByText('Metal')).toBeInTheDocument();
  });

  it('switches to a catalog-specific query when the catalog filter changes', async () => {
    render(<AdminProductTitleTermsPage />);

    fireEvent.change(screen.getByLabelText('Filter by catalog'), {
      target: { value: 'catalog-b' },
    });

    await waitFor(() => {
      expect(useTitleTermsMock).toHaveBeenLastCalledWith('catalog-b', undefined, {
        allowWithoutCatalog: true,
      });
    });
    expect(screen.queryByText('4 cm')).not.toBeInTheDocument();
    expect(screen.getByText('Metal')).toBeInTheDocument();
  });
});
