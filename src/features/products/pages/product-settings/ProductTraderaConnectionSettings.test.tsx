// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { IntegrationWithConnections } from '@/shared/contracts/integrations/domain';

const {
  invalidateListingBadgesMock,
  mutateAsyncMock,
  toastMock,
  useDefaultTraderaConnectionMock,
  useIntegrationsWithConnectionsMock,
  useUpdateDefaultTraderaConnectionMock,
} = vi.hoisted(() => ({
  invalidateListingBadgesMock: vi.fn(),
  mutateAsyncMock: vi.fn(),
  toastMock: vi.fn(),
  useDefaultTraderaConnectionMock: vi.fn(),
  useIntegrationsWithConnectionsMock: vi.fn(),
  useUpdateDefaultTraderaConnectionMock: vi.fn(),
}));

vi.mock('@/features/integrations/hooks/useIntegrationQueries', () => ({
  useDefaultTraderaConnection: () => useDefaultTraderaConnectionMock(),
  useIntegrationsWithConnections: () => useIntegrationsWithConnectionsMock(),
}));

vi.mock('@/features/integrations/hooks/useIntegrationMutations', () => ({
  useUpdateDefaultTraderaConnection: () => useUpdateDefaultTraderaConnectionMock(),
}));

vi.mock('@/shared/lib/query-invalidation', () => ({
  invalidateListingBadges: (...args: unknown[]) => invalidateListingBadgesMock(...args),
}));

vi.mock('@/shared/ui/forms-and-actions.public', () => ({
  FormField: ({
    children,
    description,
    label,
  }: {
    children?: ReactNode;
    description?: string;
    label?: string;
  }) => (
    <label>
      <span>{label}</span>
      <span>{description}</span>
      {children}
    </label>
  ),
  FormSection: ({
    children,
    description,
    title,
  }: {
    children?: ReactNode;
    description?: string;
    title?: string;
  }) => (
    <section>
      <h2>{title}</h2>
      <p>{description}</p>
      {children}
    </section>
  ),
  Hint: ({ children }: { children?: ReactNode }) => <p>{children}</p>,
  SelectSimple: ({
    ariaLabel,
    disabled,
    onValueChange,
    options,
    value,
  }: {
    ariaLabel?: string;
    disabled?: boolean;
    onValueChange?: (value: string) => void;
    options: Array<{ label: string; value: string }>;
    value?: string;
  }) => (
    <select
      aria-label={ariaLabel}
      disabled={disabled}
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

vi.mock('@/shared/ui/primitives.public', () => ({
  useToast: () => ({
    toast: toastMock,
  }),
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientCatch: vi.fn(),
}));

import { ProductTraderaConnectionSettings } from './ProductTraderaConnectionSettings';

const integrations: IntegrationWithConnections[] = [
  {
    id: 'integration-tradera',
    name: 'Tradera',
    slug: 'tradera',
    connections: [
      {
        id: 'connection-tradera-1',
        name: 'Main Tradera',
        integrationId: 'integration-tradera',
        hasPlaywrightStorageState: true,
      },
      {
        id: 'connection-tradera-2',
        name: 'Outlet Tradera',
        integrationId: 'integration-tradera',
        hasPlaywrightStorageState: false,
      },
    ],
  },
  {
    id: 'integration-vinted',
    name: 'Vinted',
    slug: 'vinted',
    connections: [
      {
        id: 'connection-vinted-1',
        name: 'Vinted Main',
        integrationId: 'integration-vinted',
      },
    ],
  },
] satisfies IntegrationWithConnections[];

const renderSettings = (): void => {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <ProductTraderaConnectionSettings />
    </QueryClientProvider>
  );
};

describe('ProductTraderaConnectionSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateListingBadgesMock.mockResolvedValue(undefined);
    mutateAsyncMock.mockResolvedValue({ connectionId: 'connection-tradera-2' });
    useDefaultTraderaConnectionMock.mockReturnValue({
      data: { connectionId: 'connection-tradera-1' },
      isLoading: false,
    });
    useIntegrationsWithConnectionsMock.mockReturnValue({
      data: integrations,
      isLoading: false,
    });
    useUpdateDefaultTraderaConnectionMock.mockReturnValue({
      isPending: false,
      mutateAsync: mutateAsyncMock,
    });
  });

  it('updates the selected Tradera connection for Product List statuses', async () => {
    renderSettings();

    const selector = screen.getByLabelText('Active Tradera Product List connection');
    expect(selector).toHaveValue('connection-tradera-1');
    expect(screen.getByRole('option', { name: 'Main Tradera' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Outlet Tradera' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Vinted Main' })).not.toBeInTheDocument();

    fireEvent.change(selector, { target: { value: 'connection-tradera-2' } });

    await waitFor(() => {
      expect(mutateAsyncMock).toHaveBeenCalledWith({ connectionId: 'connection-tradera-2' });
    });
    await waitFor(() => {
      expect(invalidateListingBadgesMock).toHaveBeenCalledTimes(1);
    });
    expect(toastMock).toHaveBeenCalledWith('Tradera Product List connection updated.', {
      variant: 'success',
    });
  });

  it('can clear the saved connection and return to all Tradera connections', async () => {
    renderSettings();

    fireEvent.change(screen.getByLabelText('Active Tradera Product List connection'), {
      target: { value: '__all_tradera_connections__' },
    });

    await waitFor(() => {
      expect(mutateAsyncMock).toHaveBeenCalledWith({ connectionId: null });
    });
  });

  it('disables the selector when no Tradera connection exists', () => {
    useDefaultTraderaConnectionMock.mockReturnValue({
      data: { connectionId: null },
      isLoading: false,
    });
    useIntegrationsWithConnectionsMock.mockReturnValue({
      data: [],
      isLoading: false,
    });

    renderSettings();

    expect(screen.getByLabelText('Active Tradera Product List connection')).toBeDisabled();
    expect(
      screen.getByText('Add a Tradera integration connection before selecting a Product List account.')
    ).toBeInTheDocument();
  });
});
