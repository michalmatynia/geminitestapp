// @vitest-environment jsdom

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DatabaseOperationsPanel } from './DatabaseOperationsPanel';

const mocks = vi.hoisted(() => ({
  setDbType: vi.fn(),
}));

vi.mock('@/shared/ui/admin.public', () => ({
  AdminDatabaseBreadcrumbs: ({ current }: { current: string }) => <nav>{current}</nav>,
}));

vi.mock('@/shared/ui/navigation-and-layout.public', () => ({
  ListPanel: ({
    alerts,
    children,
    filters,
    header,
  }: {
    alerts?: React.ReactNode;
    children?: React.ReactNode;
    filters?: React.ReactNode;
    header?: React.ReactNode;
  }) => (
    <section>
      <div>{header}</div>
      <div>{alerts}</div>
      <div>{filters}</div>
      <div>{children}</div>
    </section>
  ),
}));

vi.mock('@/shared/ui/primitives.public', () => ({
  Alert: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Badge: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
  Button: ({
    asChild,
    children,
  }: {
    asChild?: boolean;
    children?: React.ReactNode;
  }) => (asChild ? <>{children}</> : <button type='button'>{children}</button>),
}));

vi.mock('@/shared/ui/templates.public', () => ({
  SimpleSettingsList: () => <div data-testid='database-type-selector' />,
}));

vi.mock('../context/DatabaseContext', () => ({
  DatabaseProvider: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  useDatabaseConfig: () => ({
    dbType: 'mongodb',
    setDbType: mocks.setDbType,
  }),
  useDatabaseData: () => ({
    tableDetails: [{ name: 'users' }, { name: 'pages' }],
  }),
}));

vi.mock('./DatabaseOperationsTabs', () => ({
  DatabaseOperationsTabs: ({ defaultTab }: { defaultTab: string }) => (
    <div data-testid='database-operations-tabs'>{defaultTab}</div>
  ),
}));

vi.mock('./crud/ManagedMongoScopePanel', () => ({
  buildManagedMongoCrudHref: (application: string, source = 'local') =>
    `/admin/databases/engine?view=crud&application=${encodeURIComponent(
      application
    )}&source=${source}`,
  ManagedMongoScopePanel: ({
    activeApplication,
    activeSource,
  }: {
    activeApplication: string;
    activeSource: string;
  }) => (
    <div data-testid='managed-mongo-scope-panel'>
      {activeApplication}/{activeSource}
    </div>
  ),
}));

describe('DatabaseOperationsPanel', () => {
  it('preserves the selected Mongo source when switching managed applications', () => {
    render(
      <DatabaseOperationsPanel defaultTab='crud' application='studiq' source='cloud' />
    );

    expect(screen.getByText('studiq / cloud')).toBeInTheDocument();
    expect(screen.getByTestId('managed-mongo-scope-panel')).toHaveTextContent(
      'studiq/cloud'
    );
    expect(screen.getByRole('link', { name: 'Local' })).toHaveAttribute(
      'href',
      '/admin/databases/engine?view=crud&application=studiq&source=local'
    );
    expect(screen.getByRole('link', { name: 'Cloud' })).toHaveAttribute(
      'href',
      '/admin/databases/engine?view=crud&application=studiq&source=cloud'
    );
    expect(screen.getByRole('link', { name: 'GeminiTest App' })).toHaveAttribute(
      'href',
      '/admin/databases/engine?view=crud&application=geminitestapp&source=cloud'
    );
    expect(screen.getByRole('link', { name: 'Products' })).toHaveAttribute(
      'href',
      '/admin/databases/engine?view=crud&application=products&source=cloud'
    );
  });
});
