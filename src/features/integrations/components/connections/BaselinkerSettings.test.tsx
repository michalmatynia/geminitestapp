// @vitest-environment jsdom

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const useBaselinkerSettingsState = vi.fn();
const useQuickImportBaseOrdersMutation = vi.fn();
const toastMock = vi.fn();

vi.mock('@/features/integrations/hooks/useBaselinkerSettingsState', () => ({
  useBaselinkerSettingsState: () => useBaselinkerSettingsState(),
}));

vi.mock('@/shared/hooks/useBaseOrderQuickImport', () => ({
  useQuickImportBaseOrdersMutation: () => useQuickImportBaseOrdersMutation(),
}));

vi.mock('@/shared/ui', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    loading,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode; loading?: boolean }) => (
    <button type='button' onClick={onClick} disabled={disabled} {...props}>
      {loading ? 'Loading...' : children}
    </button>
  ),
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
  SelectSimple: ({
    value,
    onValueChange,
    options,
    ariaLabel,
  }: {
    value?: string;
    onValueChange: (value: string) => void;
    options: Array<{ value: string; label: string }>;
    ariaLabel?: string;
  }) => (
    <select
      value={value}
      aria-label={ariaLabel}
      onChange={(event) => onValueChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
  StatusBadge: ({ status }: { status: string }) => <span>{status}</span>,
  FormSection: ({ children, title, description }: { children?: React.ReactNode; title?: React.ReactNode; description?: React.ReactNode }) => (
    <section>
      <h2>{title}</h2>
      <p>{description}</p>
      {children}
    </section>
  ),
  FormField: ({ children, label, description }: { children?: React.ReactNode; label?: React.ReactNode; description?: React.ReactNode }) => (
    <label>
      <span>{label}</span>
      <span>{description}</span>
      {children}
    </label>
  ),
  CompactEmptyState: ({ title, description }: { title?: React.ReactNode; description?: React.ReactNode }) => (
    <div>
      <span>{title}</span>
      <span>{description}</span>
    </div>
  ),
  FormActions: ({ onSave, saveText, isDisabled }: { onSave?: () => void; saveText?: React.ReactNode; isDisabled?: boolean }) => (
    <button type='button' onClick={onSave} disabled={isDisabled}>
      {saveText}
    </button>
  ),
  Alert: ({
    children,
    title,
  }: {
    children?: React.ReactNode;
    title?: React.ReactNode;
  }) => (
    <div>
      <span>{title}</span>
      {children}
    </div>
  ),
  useToast: () => ({ toast: toastMock }),
  MetadataItem: ({ label, value }: { label?: React.ReactNode; value?: React.ReactNode }) => (
    <div>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  ),
  Card: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Hint: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  UI_GRID_ROOMY_CLASSNAME: 'grid gap-4',
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientError: vi.fn(),
}));

import { BaselinkerSettings } from './BaselinkerSettings';

describe('BaselinkerSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useBaselinkerSettingsState.mockReturnValue({
      connections: [{ id: 'conn-1', name: 'Primary Base', hasBaseApiToken: true }],
      activeConnection: {
        id: 'conn-1',
        name: 'Primary Base',
        hasBaseApiToken: true,
        baseLastInventoryId: 'inventory-1',
      },
      baselinkerConnected: true,
      baseTokenUpdatedAt: '2026-03-27 10:00',
      syncIntervalMinutes: '10',
      setSyncIntervalMinutes: vi.fn(),
      handleSaveAll: vi.fn(),
      isSaving: false,
      isDirty: false,
      defaultOneClickConnectionId: 'conn-1',
      setDefaultOneClickConnectionId: vi.fn(),
      defaultExportConnectionId: 'conn-1',
      handleBaselinkerTest: vi.fn(),
      isTesting: false,
    });
    useQuickImportBaseOrdersMutation.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    });
  });

  it('quick imports latest orders for the active connection', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({
      preview: {
        orders: [],
        stats: {
          total: 2,
          newCount: 0,
          importedCount: 2,
          changedCount: 0,
        },
      },
      importableCount: 2,
      skippedImportedCount: 0,
      importedCount: 2,
      createdCount: 1,
      updatedCount: 1,
      syncedAt: '2026-03-27T10:00:00.000Z',
      results: [],
    });
    useQuickImportBaseOrdersMutation.mockReturnValue({
      isPending: false,
      mutateAsync,
    });

    render(<BaselinkerSettings />);

    fireEvent.click(screen.getByRole('button', { name: /Import Latest Orders/i }));

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({
        connectionId: 'conn-1',
        limit: 50,
      })
    );
    expect(toastMock).toHaveBeenCalledWith(
      'Imported 2 orders from Base.com. Created 1, updated 1.',
      { variant: 'success' }
    );
    expect(screen.getByText('Latest order import')).toBeInTheDocument();
    expect(
      screen.getByText('Imported 2 orders from Base.com. Created 1, updated 1.')
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open detailed importer/i })).toHaveAttribute(
      'href',
      '/admin/products/orders-import?connectionId=conn-1&autoPreview=1'
    );
  });

  it('disables quick import when the active connection has no Base API token', () => {
    useBaselinkerSettingsState.mockReturnValue({
      connections: [{ id: 'conn-1', name: 'Primary Base', hasBaseApiToken: false }],
      activeConnection: {
        id: 'conn-1',
        name: 'Primary Base',
        hasBaseApiToken: false,
      },
      baselinkerConnected: false,
      baseTokenUpdatedAt: '—',
      syncIntervalMinutes: '10',
      setSyncIntervalMinutes: vi.fn(),
      handleSaveAll: vi.fn(),
      isSaving: false,
      isDirty: false,
      defaultOneClickConnectionId: 'conn-1',
      setDefaultOneClickConnectionId: vi.fn(),
      defaultExportConnectionId: 'conn-1',
      handleBaselinkerTest: vi.fn(),
      isTesting: false,
    });

    render(<BaselinkerSettings />);

    expect(screen.getByRole('button', { name: /Import Latest Orders/i })).toBeDisabled();
  });
});
