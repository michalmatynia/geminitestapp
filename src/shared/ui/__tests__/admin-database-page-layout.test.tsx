/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { Database } from 'lucide-react';
import { describe, expect, it } from 'vitest';

import { AdminDatabasePageLayout } from '@/shared/ui/admin-database-page-layout';

describe('AdminDatabasePageLayout', () => {
  it('renders the shared database page shell with breadcrumbs and header content', () => {
    render(
      <AdminDatabasePageLayout
        title='Database Engine'
        current='Engine'
        description='Manage database routing and backups.'
        icon={<Database data-testid='layout-icon' className='size-4' />}
        headerActions={<button type='button'>Save Configuration</button>}
      >
        <div data-testid='layout-body'>body</div>
      </AdminDatabasePageLayout>
    );

    expect(screen.getByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/admin');
    expect(screen.getByRole('link', { name: 'Databases' })).toHaveAttribute(
      'href',
      '/admin/databases/engine'
    );
    expect(screen.getByRole('heading', { name: 'Database Engine' })).toBeInTheDocument();
    expect(screen.getByTestId('layout-icon')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save Configuration' })).toBeInTheDocument();
    expect(screen.getByTestId('layout-body')).toBeInTheDocument();
  });
});
