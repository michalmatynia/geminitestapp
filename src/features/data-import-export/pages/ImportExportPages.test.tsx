/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockState = vi.hoisted(() => ({
  checkingIntegration: false,
  isBaseConnected: true,
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/features/data-import-export/context/ImportExportContext', () => ({
  ImportExportProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useImportExportData: () => ({
    checkingIntegration: mockState.checkingIntegration,
    isBaseConnected: mockState.isBaseConnected,
  }),
}));

vi.mock('@/shared/ui/admin-products-page-layout', () => ({
  AdminProductsPageLayout: ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

vi.mock('@/shared/ui/admin-integrations-page-layout', () => ({
  AdminIntegrationsPageLayout: ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

vi.mock('@/shared/ui/primitives.public', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({
    children,
    ...props
  }: React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }) => (
    <div {...props}>{children}</div>
  ),
  TabsTrigger: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
    <button type='button' {...props}>
      {children}
    </button>
  ),
  TabsContent: ({
    children,
    ...props
  }: React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }) => (
    <div {...props}>{children}</div>
  ),
}));

vi.mock('@/shared/ui/navigation-and-layout.public', () => ({
  LoadingState: ({ message }: { message?: string }) => <div>{message}</div>,
  DocumentationSection: ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  ),
}));

vi.mock('./imports/TemplatesTabContent', () => ({
  TemplatesTabContent: ({ scope }: { scope?: 'import' | 'export' }) => (
    <div data-testid={`templates-${scope ?? 'none'}`}>{scope}</div>
  ),
}));

vi.mock('./imports-page/Import.BaseConnection', () => ({
  ImportBaseConnectionSection: () => <div>import base connection</div>,
}));

vi.mock('./imports-page/Import.List', () => ({
  ImportListPreviewSection: () => <div>import list preview</div>,
}));

vi.mock('./imports-page/Import.RunStatus', () => ({
  ImportRunStatusSection: () => <div>import run status</div>,
}));

vi.mock('./imports-page/Import.LastResult', () => ({
  ImportLastResultSection: () => <div>import last result</div>,
}));

vi.mock('@/features/data-import-export/components/imports/sections/ExportBaseConfigSection', () => ({
  ExportBaseConfigSection: () => <div>export base config</div>,
}));

vi.mock('./imports-page/Export.CategoryStatus', () => ({
  ExportCategoryStatusSection: () => <div>export category status</div>,
}));

vi.mock('./imports-page/Export.WarehouseConfig', () => ({
  ExportWarehouseConfigSection: () => <div>export warehouse config</div>,
}));

vi.mock('./imports-page/Export.ImageRetryPresets', () => ({
  ExportImageRetryPresetsSection: () => <div>export image retry presets</div>,
}));

vi.mock('./imports-page/Export.QuickActions', () => ({
  ExportQuickActionsSection: () => <div>export quick actions</div>,
}));

import ExportsPage from './ExportsPage';
import ImportsPage from './ImportsPage';

describe('Import/export page shells', () => {
  beforeEach(() => {
    mockState.checkingIntegration = false;
    mockState.isBaseConnected = true;
  });

  it('renders the dedicated product import page with import-only tabs', () => {
    render(<ImportsPage />);

    expect(screen.getByRole('heading', { name: 'Product Import' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Import' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Import Template' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Export Template' })).not.toBeInTheDocument();
    expect(screen.getByText('import base connection')).toBeInTheDocument();
    expect(screen.getByTestId('templates-import')).toBeInTheDocument();
  });

  it('renders the export page with export-only tabs and import guidance link', () => {
    render(<ExportsPage />);

    expect(screen.getByRole('heading', { name: 'Product Export' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export Template' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Import Template' })).not.toBeInTheDocument();
    expect(screen.getByText('export base config')).toBeInTheDocument();
    expect(screen.getByTestId('templates-export')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Products → Import' })).toHaveAttribute(
      'href',
      '/admin/products/import'
    );
  });

  it('shows the integration warning state on both pages when Base.com is disconnected', () => {
    mockState.isBaseConnected = false;

    render(
      <>
        <ImportsPage />
        <ExportsPage />
      </>
    );

    expect(screen.getAllByText('Base.com integration required')).toHaveLength(2);
  });

  it('shows the loading state while integration status is being checked', () => {
    mockState.checkingIntegration = true;

    render(
      <>
        <ImportsPage />
        <ExportsPage />
      </>
    );

    expect(screen.getAllByText('Checking Base.com integration status...')).toHaveLength(2);
  });
});
