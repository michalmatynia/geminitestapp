/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { LabeledOptionDto } from '@/shared/contracts/base';

const {
  applyTemplateMock,
  setExportActiveTemplateIdMock,
  setExportInventoryIdMock,
  setExportWarehouseIdMock,
  setSelectedBaseConnectionIdMock,
  useImportExportActionsMock,
  useImportExportDataMock,
  useImportExportStateMock,
} = vi.hoisted(() => ({
  applyTemplateMock: vi.fn(),
  setExportActiveTemplateIdMock: vi.fn(),
  setExportInventoryIdMock: vi.fn(),
  setExportWarehouseIdMock: vi.fn(),
  setSelectedBaseConnectionIdMock: vi.fn(),
  useImportExportActionsMock: vi.fn(),
  useImportExportDataMock: vi.fn(),
  useImportExportStateMock: vi.fn(),
}));

vi.mock('@/features/data-import-export/context/ImportExportContext', () => ({
  useImportExportActions: () => useImportExportActionsMock(),
  useImportExportData: () => useImportExportDataMock(),
  useImportExportState: () => useImportExportStateMock(),
}));

vi.mock('@/shared/ui', () => ({
  Label: ({ children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
    <label {...props}>{children}</label>
  ),
  SelectSimple: ({
    value,
    onValueChange,
    options,
    disabled,
  }: {
    value: string;
    onValueChange: (value: string) => void;
    options: Array<LabeledOptionDto<string>>;
    disabled?: boolean;
  }) => (
    <select value={value} disabled={disabled} onChange={(event) => onValueChange(event.target.value)}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}));

import { ExportBaseConfigSection } from './ExportBaseConfigSection';

const buildData = (overrides?: Record<string, unknown>) => ({
  baseConnections: [
    { id: 'conn-1', name: 'Main Base' },
    { id: 'conn-2', name: 'Backup Base' },
  ],
  inventories: [{ id: 'inv-1', name: 'Inventory 1' }],
  exportTemplates: [
    { id: 'tpl-1', name: 'Template 1' },
    { id: 'tpl-2', name: 'Template 2' },
  ],
  loadingExportTemplates: false,
  ...overrides,
});

const buildState = (overrides?: Record<string, unknown>) => ({
  selectedBaseConnectionId: 'conn-1',
  setSelectedBaseConnectionId: setSelectedBaseConnectionIdMock,
  exportInventoryId: 'inv-1',
  setExportInventoryId: setExportInventoryIdMock,
  exportWarehouseId: 'warehouse-1',
  setExportWarehouseId: setExportWarehouseIdMock,
  exportActiveTemplateId: 'tpl-active',
  setExportActiveTemplateId: setExportActiveTemplateIdMock,
  ...overrides,
});

const configureContext = (options?: {
  actions?: Record<string, unknown>;
  data?: Record<string, unknown>;
  state?: Record<string, unknown>;
}): void => {
  useImportExportDataMock.mockReturnValue(buildData(options?.data) as never);
  useImportExportStateMock.mockReturnValue(buildState(options?.state) as never);
  useImportExportActionsMock.mockReturnValue({
    applyTemplate: applyTemplateMock,
    ...options?.actions,
  } as never);
};

describe('ExportBaseConfigSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    configureContext();
  });

  it('clears dependent export settings when switching the Base connection', async () => {
    const user = userEvent.setup();

    render(<ExportBaseConfigSection />);

    const [connectionSelect] = screen.getAllByRole('combobox');
    await user.selectOptions(connectionSelect!, 'conn-2');

    expect(setExportInventoryIdMock).toHaveBeenCalledWith('');
    expect(setExportWarehouseIdMock).toHaveBeenCalledWith('');
    expect(setExportActiveTemplateIdMock).toHaveBeenCalledWith('');
    expect(setSelectedBaseConnectionIdMock).toHaveBeenCalledWith('conn-2');
  });

  it('keeps dependent export settings when re-selecting the same Base connection', async () => {
    const user = userEvent.setup();

    render(<ExportBaseConfigSection />);

    const [connectionSelect] = screen.getAllByRole('combobox');
    await user.selectOptions(connectionSelect!, 'conn-1');

    expect(setExportInventoryIdMock).not.toHaveBeenCalled();
    expect(setExportWarehouseIdMock).not.toHaveBeenCalled();
    expect(setExportActiveTemplateIdMock).not.toHaveBeenCalled();
    expect(setSelectedBaseConnectionIdMock).toHaveBeenCalledWith('conn-1');
  });

  it('applies the selected export template when a saved template is chosen', async () => {
    const user = userEvent.setup();

    render(<ExportBaseConfigSection />);

    const [, , templateSelect] = screen.getAllByRole('combobox');
    await user.selectOptions(templateSelect!, 'tpl-1');

    expect(applyTemplateMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'tpl-1', name: 'Template 1' }),
      'export'
    );
    expect(setExportActiveTemplateIdMock).not.toHaveBeenCalled();
  });

  it('clears the active export template when selecting no template', async () => {
    const user = userEvent.setup();

    render(<ExportBaseConfigSection />);

    const [, , templateSelect] = screen.getAllByRole('combobox');
    await user.selectOptions(templateSelect!, '__none__');

    expect(applyTemplateMock).not.toHaveBeenCalled();
    expect(setExportActiveTemplateIdMock).toHaveBeenCalledWith('');
  });
});
