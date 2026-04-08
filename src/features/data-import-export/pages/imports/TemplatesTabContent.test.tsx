/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { LabeledOptionDto } from '@/shared/contracts/base';

const mocks = vi.hoisted(() => ({
  useImportExportActionsMock: vi.fn(),
  useImportExportDataMock: vi.fn(),
  useImportExportStateMock: vi.fn(),
  useProductCustomFieldsMock: vi.fn(),
  useProductParametersMock: vi.fn(),
  useProductSimpleParametersMock: vi.fn(),
  handleNewTemplateMock: vi.fn(),
  handleDuplicateTemplateMock: vi.fn(),
  handleCreateExportFromImportTemplateMock: vi.fn(),
  handleSaveTemplateMock: vi.fn(),
  handleDeleteTemplateMock: vi.fn(),
  applyTemplateMock: vi.fn(),
  setTemplateScopeMock: vi.fn(),
  setImportTemplateMappingsMock: vi.fn(),
  setExportTemplateMappingsMock: vi.fn(),
  setImportTemplateNameMock: vi.fn(),
  setExportTemplateNameMock: vi.fn(),
  setImportTemplateDescriptionMock: vi.fn(),
  setExportTemplateDescriptionMock: vi.fn(),
  setImportTemplateParameterImportMock: vi.fn(),
  setExportImagesAsBase64Mock: vi.fn(),
}));

vi.mock('@/features/data-import-export/context/ImportExportContext', () => ({
  useImportExportActions: () => mocks.useImportExportActionsMock(),
  useImportExportData: () => mocks.useImportExportDataMock(),
  useImportExportState: () => mocks.useImportExportStateMock(),
}));

vi.mock('@/features/data-import-export/hooks/useImportQueries', () => ({
  useProductParameters: (...args: unknown[]) => mocks.useProductParametersMock(...args),
  useProductCustomFields: (...args: unknown[]) => mocks.useProductCustomFieldsMock(...args),
  useProductSimpleParameters: (...args: unknown[]) => mocks.useProductSimpleParametersMock(...args),
}));

vi.mock('./imports-page-utils', () => ({
  parseParameterTarget: vi.fn(() => null),
  toParameterTargetValue: vi.fn((parameterId: string) => `parameter:${parameterId}`),
  getParameterDisplayName: vi.fn((parameter: { name?: string; id: string }) => parameter.name ?? parameter.id),
}));

vi.mock('@/shared/ui/primitives.public', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type='button' onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
  Checkbox: ({
    checked,
    onCheckedChange,
    ...props
  }: {
    checked?: boolean;
    onCheckedChange?: (value: boolean) => void;
  } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'checked' | 'onChange'>) => (
    <input
      type='checkbox'
      checked={checked}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
      {...props}
    />
  ),
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div {...props}>{children}</div>
  ),
  TabsTrigger: ({
    children,
    value,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }) => (
    <button type='button' data-value={value} {...props}>
      {children}
    </button>
  ),
  Label: ({ children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
    <label {...props}>{children}</label>
  ),
  Card: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
}));

vi.mock('@/shared/ui/forms-and-actions.public', () => ({
  SelectSimple: ({
    value,
    onValueChange,
    options,
    ariaLabel,
    title,
  }: {
    value: string;
    onValueChange: (value: string) => void;
    options: Array<LabeledOptionDto<string>>;
    ariaLabel?: string;
    title?: string;
  }) => (
    <select
      aria-label={ariaLabel}
      title={title}
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
  Hint: ({
    children,
    uppercase: _uppercase,
    ...props
  }: React.HTMLAttributes<HTMLDivElement> & { uppercase?: boolean }) => (
    <div {...props}>{children}</div>
  ),
}));

vi.mock('@/shared/ui/templates.public', () => ({
  ConfirmModal: () => null,
}));

import { TemplatesTabContent } from './TemplatesTabContent';

const buildActions = () => ({
  handleNewTemplate: mocks.handleNewTemplateMock,
  handleDuplicateTemplate: mocks.handleDuplicateTemplateMock,
  handleCreateExportFromImportTemplate: mocks.handleCreateExportFromImportTemplateMock,
  handleSaveTemplate: mocks.handleSaveTemplateMock,
  handleDeleteTemplate: mocks.handleDeleteTemplateMock,
  savingImportTemplate: false,
  savingExportTemplate: false,
  applyTemplate: mocks.applyTemplateMock,
});

const buildData = () => ({
  importTemplates: [],
  exportTemplates: [],
  importSourceFields: ['sku', 'custom_note', 'tradera_excluded'],
  importSourceFieldValues: {
    sku: 'SKU-1',
    custom_note: 'Handle with care',
    tradera_excluded: '1',
  },
  loadingImportSourceFields: false,
});

const buildState = (templateScope: 'import' | 'export') => ({
  templateScope,
  setTemplateScope: mocks.setTemplateScopeMock,
  importActiveTemplateId: '',
  exportActiveTemplateId: '',
  importTemplateName: '',
  setImportTemplateName: mocks.setImportTemplateNameMock,
  exportTemplateName: '',
  setExportTemplateName: mocks.setExportTemplateNameMock,
  importTemplateDescription: '',
  setImportTemplateDescription: mocks.setImportTemplateDescriptionMock,
  exportTemplateDescription: '',
  setExportTemplateDescription: mocks.setExportTemplateDescriptionMock,
  importTemplateMappings: [{ sourceKey: 'custom_note', targetField: '' }],
  setImportTemplateMappings: mocks.setImportTemplateMappingsMock,
  importTemplateParameterImport: {
    enabled: false,
    languageScope: 'catalog_languages',
    matchBy: 'base_id_then_name',
    createMissingParameters: false,
    overwriteExistingValues: false,
  },
  setImportTemplateParameterImport: mocks.setImportTemplateParameterImportMock,
  exportTemplateMappings: [{ sourceKey: 'sku', targetField: '' }],
  setExportTemplateMappings: mocks.setExportTemplateMappingsMock,
  exportImagesAsBase64: false,
  setExportImagesAsBase64: mocks.setExportImagesAsBase64Mock,
  catalogId: 'catalog-default',
});

describe('TemplatesTabContent custom fields', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.useImportExportActionsMock.mockReturnValue(buildActions() as never);
    mocks.useImportExportDataMock.mockReturnValue(buildData() as never);
    mocks.useProductParametersMock.mockReturnValue({ data: [], isLoading: false } as never);
    mocks.useProductSimpleParametersMock.mockReturnValue({ data: [], isLoading: false } as never);
    mocks.useProductCustomFieldsMock.mockReturnValue({
      data: [
        {
          id: 'notes',
          name: 'Internal Notes',
          type: 'text',
          options: [],
          createdAt: '2026-04-08T00:00:00.000Z',
          updatedAt: '2026-04-08T00:00:00.000Z',
        },
        {
          id: 'market-exclusion',
          name: 'Market Exclusion',
          type: 'checkbox_set',
          options: [
            { id: 'tradera', label: 'Tradera' },
            { id: 'vinted', label: 'Vinted' },
          ],
          createdAt: '2026-04-08T00:00:00.000Z',
          updatedAt: '2026-04-08T00:00:00.000Z',
        },
      ],
      isLoading: false,
    } as never);
  });

  it('shows custom field targets in import templates', () => {
    mocks.useImportExportStateMock.mockReturnValue(buildState('import') as never);

    render(<TemplatesTabContent />);

    const targetFieldSelect = screen.getByTitle('Target Field');

    expect(
      within(targetFieldSelect).getByRole('option', { name: 'Custom field: Internal Notes' })
    ).toBeInTheDocument();
    expect(
      within(targetFieldSelect).getByRole('option', {
        name: 'Checkbox: Market Exclusion -> Tradera',
      })
    ).toBeInTheDocument();
    expect(
      within(targetFieldSelect).getByRole('option', {
        name: 'Checkbox: Market Exclusion -> Vinted',
      })
    ).toBeInTheDocument();
  });

  it('hides custom field targets in export templates', () => {
    mocks.useImportExportStateMock.mockReturnValue(buildState('export') as never);

    render(<TemplatesTabContent />);

    const targetFieldSelect = screen.getByTitle('Target Field');

    expect(
      within(targetFieldSelect).queryByRole('option', { name: 'Custom field: Internal Notes' })
    ).not.toBeInTheDocument();
    expect(
      within(targetFieldSelect).queryByRole('option', {
        name: 'Checkbox: Market Exclusion -> Tradera',
      })
    ).not.toBeInTheDocument();
  });

  it('forces import scope when rendered inside the dedicated import page', () => {
    mocks.useImportExportStateMock.mockReturnValue(buildState('export') as never);

    render(<TemplatesTabContent scope='import' />);

    expect(mocks.setTemplateScopeMock).toHaveBeenCalledWith('import');
    expect(screen.queryByRole('button', { name: 'Export' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create Export Copy' })).not.toBeInTheDocument();
  });

  it('passes the forced export scope into template actions', () => {
    mocks.useImportExportStateMock.mockReturnValue(buildState('import') as never);

    render(<TemplatesTabContent scope='export' />);

    fireEvent.click(screen.getByRole('button', { name: 'New' }));

    expect(mocks.handleNewTemplateMock).toHaveBeenCalledWith('export');
  });
});
