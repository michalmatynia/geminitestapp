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
  setImportDryRunMock: vi.fn(),
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
  Hint: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
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
    expect(screen.getByRole('button', { name: 'Run import' })).toBeInTheDocument();
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
});
