/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { LabeledOptionDto } from '@/shared/contracts/base';

const mocks = vi.hoisted(() => ({
  useImportExportActionsMock: vi.fn(),
  useImportExportDataMock: vi.fn(),
  useImportExportStateMock: vi.fn(),
  useBaseImportQueueHealthMock: vi.fn(),
  setImportDryRunMock: vi.fn(),
  setUniqueOnlyMock: vi.fn(),
  setAllowDuplicateSkuMock: vi.fn(),
  setInventoryIdMock: vi.fn(),
  setLimitMock: vi.fn(),
  setCatalogIdMock: vi.fn(),
  setImportTemplateIdMock: vi.fn(),
  setSelectedBaseConnectionIdMock: vi.fn(),
  setImageModeMock: vi.fn(),
  setImportModeMock: vi.fn(),
  handleLoadInventoriesMock: vi.fn(),
  handleClearInventoryMock: vi.fn(),
  handleSaveImportSettingsMock: vi.fn(),
  handleClearSavedImportSettingsMock: vi.fn(),
  handleSaveDefaultBaseConnectionMock: vi.fn(),
  handleImportMock: vi.fn(),
}));

vi.mock('@/features/data-import-export/context/ImportExportContext', () => ({
  useImportExportActions: () => mocks.useImportExportActionsMock(),
  useImportExportData: () => mocks.useImportExportDataMock(),
  useImportExportState: () => mocks.useImportExportStateMock(),
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: React.PropsWithChildren<{ href: string } & React.AnchorHTMLAttributes<HTMLAnchorElement>>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/shared/lib/jobs/hooks/useJobQueries', () => ({
  useBaseImportQueueHealth: () => mocks.useBaseImportQueueHealthMock(),
}));

vi.mock('@/shared/ui/primitives.public', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    loading: _loading,
    loadingText: _loadingText,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    loading?: boolean;
    loadingText?: string;
  }) => (
    <button type='button' onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
  Card: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
}));

vi.mock('@/shared/ui/forms-and-actions.public', () => ({
  FormField: ({
    label,
    description,
    children,
  }: {
    label?: React.ReactNode;
    description?: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <section>
      {label ? <h3>{label}</h3> : null}
      {description ? <p>{description}</p> : null}
      {children}
    </section>
  ),
  FormSection: ({
    title,
    description,
    children,
    actions,
    ...props
  }: {
    title?: React.ReactNode;
    description?: React.ReactNode;
    children: React.ReactNode;
    actions?: React.ReactNode;
  } & React.HTMLAttributes<HTMLDivElement>) => (
    <div {...props}>
      {title ? <h2>{title}</h2> : null}
      {description ? <p>{description}</p> : null}
      {actions}
      {children}
    </div>
  ),
  Hint: ({
    children,
    uppercase: _uppercase,
    ...props
  }: React.HTMLAttributes<HTMLDivElement> & { uppercase?: boolean }) => <div {...props}>{children}</div>,
  RefreshButton: ({
    onRefresh,
    isRefreshing: _isRefreshing,
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    onRefresh: () => void;
    isRefreshing?: boolean;
  }) => (
    <button type='button' onClick={onRefresh} {...props}>
      {children ?? 'Refresh'}
    </button>
  ),
  SelectSimple: ({
    value,
    onValueChange,
    options,
    ariaLabel,
  }: {
    value: string;
    onValueChange: (value: string) => void;
    options: Array<LabeledOptionDto<string>>;
    ariaLabel?: string;
  }) => (
    <select
      aria-label={ariaLabel ?? 'select'}
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
  ToggleRow: ({
    label,
    description,
    checked,
    onCheckedChange,
  }: {
    label: string;
    description?: string;
    checked: boolean;
    onCheckedChange: (value: boolean) => void;
  }) => (
    <label>
      <input
        type='checkbox'
        aria-label={label}
        checked={checked}
        onChange={(event) => onCheckedChange(event.target.checked)}
      />
      <span>{label}</span>
      {description ? <span>{description}</span> : null}
    </label>
  ),
}));

vi.mock('@/shared/ui/data-display.public', () => ({
  StatusBadge: ({ status }: { status: string }) => <div>{status}</div>,
}));

vi.mock('@/shared/ui/navigation-and-layout.public', () => ({
  UI_GRID_RELAXED_CLASSNAME: 'grid',
  UI_GRID_ROOMY_CLASSNAME: 'grid',
}));

import { ImportBaseConnectionSection } from './Import.BaseConnection';

const buildState = (overrides: Record<string, unknown> = {}) => ({
  inventoryId: '',
  setInventoryId: mocks.setInventoryIdMock,
  limit: 'all',
  setLimit: mocks.setLimitMock,
  catalogId: '',
  setCatalogId: mocks.setCatalogIdMock,
  importTemplateId: '',
  setImportTemplateId: mocks.setImportTemplateIdMock,
  selectedBaseConnectionId: '',
  setSelectedBaseConnectionId: mocks.setSelectedBaseConnectionIdMock,
  imageMode: 'download',
  setImageMode: mocks.setImageModeMock,
  importMode: 'upsert_on_base_id',
  setImportMode: mocks.setImportModeMock,
  importDryRun: false,
  setImportDryRun: mocks.setImportDryRunMock,
  uniqueOnly: true,
  setUniqueOnly: mocks.setUniqueOnlyMock,
  allowDuplicateSku: false,
  setAllowDuplicateSku: mocks.setAllowDuplicateSkuMock,
  saveImportSettings: false,
  hasUnsavedImportSettingsChanges: false,
  ...overrides,
});

const buildData = (overrides: Record<string, unknown> = {}) => ({
  inventories: [],
  isFetchingInventories: false,
  catalogsData: [],
  loadingCatalogs: false,
  importTemplates: [],
  loadingImportTemplates: false,
  activeImportRunId: '',
  isBaseConnected: true,
  baseConnections: [],
  ...overrides,
});

const buildActions = () => ({
  handleLoadInventories: mocks.handleLoadInventoriesMock,
  handleClearInventory: mocks.handleClearInventoryMock,
  handleSaveImportSettings: mocks.handleSaveImportSettingsMock,
  handleClearSavedImportSettings: mocks.handleClearSavedImportSettingsMock,
  savingDefaultConnection: false,
  handleSaveDefaultBaseConnection: mocks.handleSaveDefaultBaseConnectionMock,
  importing: false,
  handleImport: mocks.handleImportMock,
});

describe('ImportBaseConnectionSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useImportExportDataMock.mockReturnValue(buildData());
    mocks.useImportExportStateMock.mockReturnValue(buildState());
    mocks.useImportExportActionsMock.mockReturnValue(buildActions());
    mocks.useBaseImportQueueHealthMock.mockReturnValue({
      data: {
        ok: true,
        mode: 'bullmq',
        redisAvailable: true,
        queues: {
          baseImport: {
            waitingCount: 4,
            activeCount: 1,
            completedCount: 8,
            failedCount: 2,
            running: true,
          },
        },
      },
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });
  });

  it('renders the save import settings buttons and saved-state message', () => {
    mocks.useImportExportStateMock.mockReturnValue(
      buildState({
        saveImportSettings: true,
        hasUnsavedImportSettingsChanges: true,
      })
    );

    render(<ImportBaseConnectionSection />);

    expect(screen.getByRole('button', { name: 'Save Import Settings' })).toHaveAttribute(
      'variant',
      'success'
    );
    expect(screen.getByRole('button', { name: 'Clear Saved' })).toBeEnabled();
    expect(
      screen.getByText('Saved import settings exist. You have unsaved changes.')
    ).toBeInTheDocument();
  });

  it('shows a disabled saved state when there are no unsaved import settings changes', () => {
    mocks.useImportExportStateMock.mockReturnValue(
      buildState({
        saveImportSettings: true,
        hasUnsavedImportSettingsChanges: false,
      })
    );

    render(<ImportBaseConnectionSection />);

    expect(screen.getByRole('button', { name: 'Save Import Settings' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save Import Settings' })).toHaveAttribute(
      'variant',
      'outline'
    );
    expect(
      screen.getByText('Saved import settings will be restored on the next reload in this browser.')
    ).toBeInTheDocument();
  });

  it('calls the explicit save and clear import settings actions', () => {
    mocks.useImportExportStateMock.mockReturnValue(
      buildState({
        saveImportSettings: true,
        hasUnsavedImportSettingsChanges: true,
      })
    );

    render(<ImportBaseConnectionSection />);

    fireEvent.click(screen.getByRole('button', { name: 'Save Import Settings' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear Saved' }));

    expect(mocks.handleSaveImportSettingsMock).toHaveBeenCalledTimes(1);
    expect(mocks.handleClearSavedImportSettingsMock).toHaveBeenCalledTimes(1);
  });

  it('shows base-import runtime queue health directly in the import options card', () => {
    render(<ImportBaseConnectionSection />);

    expect(
      screen.getByText((content) => content.includes('Base imports run on the separate'))
    ).toBeInTheDocument();
    expect(screen.getByText('bullmq')).toBeInTheDocument();
    expect(screen.getByText('Running')).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes('Waiting 4 | Active 1'))).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes('2 failed'))).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes('Completed 8'))).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Inspect runtime' })).toHaveAttribute(
      'href',
      '/api/v2/integrations/queues/base-import'
    );
    expect(screen.getByRole('link', { name: 'View Import Jobs' })).toHaveAttribute(
      'href',
      '/admin/ai-paths/queue?tab=product-imports'
    );
  });

  it('links the runtime queue card directly to the active import run in Job Queue', () => {
    mocks.useImportExportDataMock.mockReturnValue(
      buildData({
        activeImportRunId: 'run-42',
      })
    );

    render(<ImportBaseConnectionSection />);

    expect(screen.getByRole('link', { name: 'View Import Jobs' })).toHaveAttribute(
      'href',
      '/admin/ai-paths/queue?tab=product-imports&query=run-42'
    );
  });

  it('allows manually refreshing base-import runtime queue health', () => {
    const refetchMock = vi.fn();
    mocks.useBaseImportQueueHealthMock.mockReturnValue({
      data: {
        ok: true,
        mode: 'bullmq',
        redisAvailable: true,
        queues: {
          baseImport: {
            waitingCount: 0,
            activeCount: 0,
            completedCount: 0,
            failedCount: 0,
            running: true,
          },
        },
      },
      isLoading: false,
      isFetching: false,
      refetch: refetchMock,
    });

    render(<ImportBaseConnectionSection />);

    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));

    expect(refetchMock).toHaveBeenCalledTimes(1);
  });

  it('warns when base imports will fall back to inline runtime execution', () => {
    mocks.useBaseImportQueueHealthMock.mockReturnValue({
      data: {
        ok: true,
        mode: 'inline',
        redisAvailable: false,
        queues: {
          baseImport: null,
        },
      },
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });

    render(<ImportBaseConnectionSection />);

    expect(screen.getByText('Runtime queue is in inline fallback mode')).toBeInTheDocument();
    expect(
      screen.getByText(
        'New imports will run inline and will not appear as BullMQ runtime jobs until Redis queueing is available again.'
      )
    ).toBeInTheDocument();
  });

  it('warns when the worker is offline but Redis is still available', () => {
    mocks.useBaseImportQueueHealthMock.mockReturnValue({
      data: {
        ok: false,
        mode: 'bullmq',
        redisAvailable: true,
        queues: {
          baseImport: {
            waitingCount: 3,
            activeCount: 0,
            completedCount: 0,
            failedCount: 0,
            running: false,
          },
        },
      },
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });

    render(<ImportBaseConnectionSection />);

    expect(
      screen.getByText(
        'Redis is available, but the base-import worker is not running. New imports may queue without being processed until the worker is restored.'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('Base import worker is offline')).toBeInTheDocument();
  });

  it('lets import settings control unique-only filtering from the settings tab', () => {
    render(<ImportBaseConnectionSection />);

    fireEvent.click(screen.getByLabelText('Unique products only'));

    expect(mocks.setUniqueOnlyMock).toHaveBeenCalledWith(false);
  });
});
