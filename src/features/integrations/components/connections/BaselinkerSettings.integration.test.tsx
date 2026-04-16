// @vitest-environment jsdom

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { IntegrationsActionsContext } from '@/features/integrations/context/integrations/IntegrationsActionsContext';
import { IntegrationsDataContext } from '@/features/integrations/context/integrations/IntegrationsDataContext';
import { IntegrationsFormContext } from '@/features/integrations/context/integrations/IntegrationsFormContext';
import { IntegrationsTestingContext } from '@/features/integrations/context/integrations/IntegrationsTestingContext';
import type { IntegrationConnection } from '@/shared/contracts/integrations/connections';
import type { Integration } from '@/shared/contracts/integrations/base';
import type { IntegrationsData } from '@/shared/contracts/integrations/context';
import type { PlaywrightSettings } from '@/shared/contracts/playwright';

const useQuickImportBaseOrdersMutation = vi.fn();
const useSettings = vi.fn();
const useUpdateSettingsBulk = vi.fn();
const useDefaultExportConnection = vi.fn();
const useUpdateDefaultExportConnection = vi.fn();
const toastMock = vi.fn();

vi.mock('@/shared/hooks/useBaseOrderQuickImport', () => ({
  useQuickImportBaseOrdersMutation: () => useQuickImportBaseOrdersMutation(),
}));

vi.mock('@/shared/hooks/use-settings', () => ({
  useSettings: () => useSettings(),
  useUpdateSettingsBulk: () => useUpdateSettingsBulk(),
}));

vi.mock('@/features/integrations/hooks/useIntegrationQueries', () => ({
  useDefaultExportConnection: () => useDefaultExportConnection(),
}));

vi.mock('@/features/integrations/hooks/useIntegrationMutations', () => ({
  useUpdateDefaultExportConnection: () => useUpdateDefaultExportConnection(),
}));

vi.mock('@/shared/ui/primitives.public', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    loading,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    children?: React.ReactNode;
    loading?: boolean;
  }) => (
    <button type='button' onClick={onClick} disabled={disabled} {...props}>
      {loading ? 'Loading...' : children}
    </button>
  ),
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
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
  Card: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/shared/ui/forms-and-actions.public', () => ({
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
  FormSection: ({
    children,
    title,
    description,
  }: {
    children?: React.ReactNode;
    title?: React.ReactNode;
    description?: React.ReactNode;
  }) => (
    <section>
      <h2>{title}</h2>
      <p>{description}</p>
      {children}
    </section>
  ),
  FormField: ({
    children,
    label,
    description,
  }: {
    children?: React.ReactNode;
    label?: React.ReactNode;
    description?: React.ReactNode;
  }) => (
    <label>
      <span>{label}</span>
      <span>{description}</span>
      {children}
    </label>
  ),
  FormActions: ({
    onSave,
    saveText,
    isDisabled,
  }: {
    onSave?: () => void;
    saveText?: React.ReactNode;
    isDisabled?: boolean;
  }) => (
    <button type='button' onClick={onSave} disabled={isDisabled}>
      {saveText}
    </button>
  ),
  Hint: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/shared/ui/data-display.public', () => ({
  StatusBadge: ({ status }: { status: string }) => <span>{status}</span>,
}));

vi.mock('@/shared/ui/navigation-and-layout.public', () => ({
  CompactEmptyState: ({
    title,
    description,
  }: {
    title?: React.ReactNode;
    description?: React.ReactNode;
  }) => (
    <div>
      <span>{title}</span>
      <span>{description}</span>
    </div>
  ),
  MetadataItem: ({
    label,
    value,
  }: {
    label?: React.ReactNode;
    value?: React.ReactNode;
  }) => (
    <div>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  ),
  UI_GRID_ROOMY_CLASSNAME: 'grid gap-4',
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientError: vi.fn(),
}));

import { BaselinkerSettings } from './BaselinkerSettings';

const defaultPlaywrightSettings: PlaywrightSettings = {
  identityProfile: 'default',
  headless: true,
  slowMo: 0,
  timeout: 30_000,
  navigationTimeout: 30_000,
  locale: '',
  timezoneId: '',
  humanizeMouse: false,
  mouseJitter: 0,
  clickDelayMin: 0,
  clickDelayMax: 0,
  inputDelayMin: 0,
  inputDelayMax: 0,
  actionDelayMin: 0,
  actionDelayMax: 0,
  proxyEnabled: false,
  proxyServer: '',
  proxyUsername: '',
  proxyPassword: '',
  proxySessionAffinity: false,
  proxySessionMode: 'sticky',
  proxyProviderPreset: 'custom',
  emulateDevice: false,
  deviceName: '',
};

const noopAsync = async (): Promise<void> => {};
const noopBooleanAsync = async (): Promise<boolean> => false;

const activeIntegration: Integration = {
  id: 'integration-1',
  name: 'Baselinker',
  slug: 'baselinker',
  type: 'export',
  status: 'active',
  enabled: true,
  description: null,
  config: null,
  capabilities: [],
  lastSyncAt: null,
  createdAt: '2026-03-27T10:00:00.000Z',
  updatedAt: '2026-03-27T10:00:00.000Z',
};

const baseConnection = (overrides: Partial<IntegrationConnection>): IntegrationConnection => ({
  id: 'conn-1',
  integrationId: 'integration-1',
  name: 'Base connection',
  username: null,
  createdAt: '2026-03-27T10:00:00.000Z',
  updatedAt: '2026-03-27T10:00:00.000Z',
  baseApiToken: null,
  baseLastInventoryId: null,
  baseLastExportTemplateId: null,
  baseLastInventoryImportedAt: null,
  baseLastExportedAt: null,
  baseLastProductSyncAt: null,
  baseTokenUpdatedAt: null,
  baseLastOrderStatusSyncAt: null,
  baseSyncEnabled: false,
  baseSyncFrequencyMinutes: null,
  baseDefaultPriceGroupId: null,
  baseDefaultWarehouseId: null,
  baseLastSyncCursor: null,
  baseLastSyncError: null,
  baseLastSyncAttemptAt: null,
  baseApiMethod: null,
  baseApiParams: null,
  baseApiLastRequestAt: null,
  baseApiLastError: null,
  hasBaseApiToken: false,
  hasPlaywrightStorageState: false,
  playwrightStorageStateUpdatedAt: null,
  playwrightHeadless: null,
  playwrightSlowMo: null,
  playwrightTimeout: null,
  playwrightNavigationTimeout: null,
  playwrightHumanizeMouse: null,
  playwrightMouseJitter: null,
  playwrightClickDelayMin: null,
  playwrightClickDelayMax: null,
  playwrightInputDelayMin: null,
  playwrightInputDelayMax: null,
  playwrightActionDelayMin: null,
  playwrightActionDelayMax: null,
  playwrightProxyEnabled: null,
  playwrightProxyServer: null,
  playwrightProxyUsername: null,
  playwrightPersonaId: null,
  playwrightEmulateDevice: null,
  playwrightDeviceName: null,
  ...overrides,
});

const renderWithProviders = ({
  connections,
  editingConnectionId,
}: {
  connections: IntegrationConnection[];
  editingConnectionId: string | null;
}) => {
  const dataValue: IntegrationsData = {
    integrations: [activeIntegration],
    integrationsLoading: false,
    activeIntegration,
    setActiveIntegration: vi.fn(),
    connections,
    connectionsLoading: false,
    playwrightPersonas: [],
    playwrightPersonasLoading: false,
  };

  const formValue = {
    isModalOpen: true,
    setIsModalOpen: vi.fn(),
    editingConnectionId,
    setEditingConnectionId: vi.fn(),
    connectionToDelete: null,
    setConnectionToDelete: vi.fn(),
    playwrightSettings: defaultPlaywrightSettings,
    setPlaywrightSettings: vi.fn(),
    playwrightPersonaId: null,
    savingAllegroSandbox: false,
  };

  const actionsValue = {
    handleIntegrationClick: noopAsync,
    handleSaveConnection: async () => null,
    handleDeleteConnection: vi.fn(),
    handleConfirmDeleteConnection: noopBooleanAsync,
    handleBaselinkerTest: noopAsync,
    handleAllegroTest: noopAsync,
    handleTestConnection: noopAsync,
    handleTraderaManualLogin: noopAsync,
    handleVintedManualLogin: noopAsync,
    handleSelectPlaywrightPersona: noopAsync,
    handleSavePlaywrightSettings: noopAsync,
    handleAllegroAuthorize: vi.fn(),
    handleAllegroDisconnect: noopAsync,
    handleAllegroSandboxToggle: noopAsync,
    handleAllegroSandboxConnect: noopAsync,
    handleLinkedInAuthorize: vi.fn(),
    handleLinkedInDisconnect: noopAsync,
    handleBaseApiRequest: noopAsync,
    handleAllegroApiRequest: noopAsync,
    onCloseModal: vi.fn(),
    onOpenSessionModal: vi.fn(),
    handleResetListingScript: noopAsync,
  };

  const testingValue = {
    isTesting: false,
    testLog: [],
    showTestLogModal: false,
    setShowTestLogModal: vi.fn(),
    selectedStep: null,
    setSelectedStep: vi.fn(),
    showTestErrorModal: false,
    setShowTestErrorModal: vi.fn(),
    testError: null,
    testErrorMeta: null,
    showTestSuccessModal: false,
    setShowTestSuccessModal: vi.fn(),
    testSuccessMessage: null,
  };

  return render(
    <IntegrationsDataContext.Provider value={dataValue}>
      <IntegrationsFormContext.Provider value={formValue}>
        <IntegrationsActionsContext.Provider value={actionsValue}>
          <IntegrationsTestingContext.Provider value={testingValue}>
            <BaselinkerSettings />
          </IntegrationsTestingContext.Provider>
        </IntegrationsActionsContext.Provider>
      </IntegrationsFormContext.Provider>
    </IntegrationsDataContext.Provider>
  );
};

describe('BaselinkerSettings integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSettings.mockReturnValue({
      data: [{ key: 'base_sync_poll_interval_minutes', value: '10' }],
    });
    useUpdateSettingsBulk.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    });
    useDefaultExportConnection.mockReturnValue({
      data: { connectionId: 'conn-1' },
    });
    useUpdateDefaultExportConnection.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    });
  });

  it('imports latest orders for the selected editing connection', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({
      preview: {
        orders: [],
        stats: {
          total: 1,
          newCount: 1,
          importedCount: 0,
          changedCount: 0,
        },
      },
      importableCount: 1,
      skippedImportedCount: 0,
      importedCount: 1,
      createdCount: 1,
      updatedCount: 0,
      syncedAt: '2026-03-27T10:00:00.000Z',
      results: [],
    });
    useQuickImportBaseOrdersMutation.mockReturnValue({
      isPending: false,
      mutateAsync,
    });

    renderWithProviders({
      connections: [
        baseConnection({ id: 'conn-1', name: 'Primary Base', hasBaseApiToken: true }),
        baseConnection({
          id: 'conn-2',
          name: 'Secondary Base',
          hasBaseApiToken: true,
          baseLastInventoryId: 'inventory-2',
        }),
      ],
      editingConnectionId: 'conn-2',
    });

    fireEvent.click(screen.getByRole('button', { name: /Import Latest Orders/i }));

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({
        connectionId: 'conn-2',
        limit: 50,
      })
    );
    expect(toastMock).toHaveBeenCalledWith(
      'Imported 1 orders from Base.com. Created 1, updated 0.',
      { variant: 'success' }
    );
    expect(screen.getByText('Latest order import')).toBeInTheDocument();
    expect(
      screen.getByText('Imported 1 orders from Base.com. Created 1, updated 0.')
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open detailed importer/i })).toHaveAttribute(
      'href',
      '/admin/products/orders-import?connectionId=conn-2&autoPreview=1'
    );
  });
});
