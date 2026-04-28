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
  saveTitleTermMutateAsyncMock,
  useDeleteTitleTermMutationMock,
  useSearchParamsMock,
} = vi.hoisted(() => ({
  toastMock: vi.fn(),
  confirmMock: vi.fn(),
  useCatalogsMock: vi.fn(),
  useTitleTermsMock: vi.fn(),
  useSaveTitleTermMutationMock: vi.fn(),
  saveTitleTermMutateAsyncMock: vi.fn(),
  useDeleteTitleTermMutationMock: vi.fn(),
  useSearchParamsMock: vi.fn(),
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

vi.mock('next/navigation', () => ({
  useSearchParams: () => useSearchParamsMock(),
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
  SettingsPanelBuilder: ({
    open,
    title,
    fields,
    values,
    onChange,
    onSave,
  }: {
    open: boolean;
    title: string;
    fields: Array<{
      key: string;
      label: string;
      type: string;
      options?: Array<{ value: string; label: string }>;
    }>;
    values: Record<string, string>;
    onChange: (values: Record<string, string>) => void;
    onSave: () => Promise<void>;
  }) => {
    if (!open) return null;
    return (
      <section aria-label={title}>
        <h2>{title}</h2>
        {fields.map((field) => (
          <label key={field.key}>
            <span>{field.label}</span>
            {field.type === 'select' ? (
              <select
                aria-label={field.label}
                value={values[field.key] ?? ''}
                onChange={(event) => onChange({ [field.key]: event.target.value })}
              >
                {(field.options ?? []).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                aria-label={field.label}
                value={values[field.key] ?? ''}
                onChange={(event) => onChange({ [field.key]: event.target.value })}
              />
            )}
          </label>
        ))}
        <button type='button' onClick={() => void onSave()}>
          Save
        </button>
      </section>
    );
  },
}));

vi.mock('@/shared/ui/templates/StandardDataTablePanel', () => ({
  StandardDataTablePanel: ({
    data,
    columns,
    filters,
  }: {
    data?: Array<{
      id: string;
      name_en: string;
      name_pl: string | null;
      catalogId: string;
      type: string;
    }>;
    columns?: Array<{
      accessorKey?: string;
      id?: string;
      cell?: (props: {
        row: {
          original: {
            id: string;
            name_en: string;
            name_pl: string | null;
            catalogId: string;
            type: string;
          };
        };
      }) => React.ReactNode;
    }>;
    filters?: React.ReactNode;
  }) => (
    <section>
      {filters}
      {data?.map((row) => {
        const actionsColumn = columns?.find((column) => column.id === 'actions');
        const visibleColumns = columns?.filter((column) => column.id !== 'actions') ?? [];
        return (
          <div key={row.id}>
            {visibleColumns.map((column) => (
              <div key={column.id ?? column.accessorKey}>
                {column.cell !== undefined
                  ? column.cell({ row: { original: row } })
                  : row[column.accessorKey as keyof typeof row]}
              </div>
            ))}
            {actionsColumn?.cell?.({ row: { original: row } })}
          </div>
        );
      })}
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
    name_pl: 'Metal PL',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

describe('AdminProductTitleTermsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    saveTitleTermMutateAsyncMock.mockResolvedValue(titleTerms[0]);
    useSearchParamsMock.mockReturnValue(new URLSearchParams());

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
      mutateAsync: saveTitleTermMutateAsyncMock,
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
    expect(screen.getByText('Metal PL')).toBeInTheDocument();
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

  it('hydrates the initial catalog filter from the page query string', () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams('catalogId=catalog-b'));

    render(<AdminProductTitleTermsPage />);

    expect(useTitleTermsMock).toHaveBeenLastCalledWith('catalog-b', undefined, {
      allowWithoutCatalog: true,
    });
    expect(screen.queryByText('4 cm')).not.toBeInTheDocument();
    expect(screen.getByText('Metal')).toBeInTheDocument();
  });

  it('hydrates and saves the selected title term when editing', async () => {
    render(<AdminProductTitleTermsPage />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0]!);

    expect(screen.getByText('Edit Title Term')).toBeInTheDocument();
    expect(screen.getByLabelText('Catalog')).toHaveValue('catalog-a');
    expect(screen.getByLabelText('Type')).toHaveValue('size');
    expect(screen.getByLabelText('English name')).toHaveValue('4 cm');
    expect(screen.getByLabelText('Polish translation')).toHaveValue('4 cm');

    fireEvent.change(screen.getByLabelText('English name'), {
      target: { value: '4.5 cm' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(saveTitleTermMutateAsyncMock).toHaveBeenCalledWith({
        id: 'term-1',
        data: {
          catalogId: 'catalog-a',
          type: 'size',
          name_en: '4.5 cm',
          name_pl: '4 cm',
        },
      });
    });
    await waitFor(() => {
      expect(screen.queryByText('Edit Title Term')).not.toBeInTheDocument();
    });
  });
});
