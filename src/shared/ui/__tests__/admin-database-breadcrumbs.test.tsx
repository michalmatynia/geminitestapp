/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AdminDatabaseBreadcrumbs } from '@/shared/ui/admin-database-breadcrumbs';

describe('AdminDatabaseBreadcrumbs', () => {
  it('renders the shared Admin to Databases breadcrumb trail', () => {
    render(<AdminDatabaseBreadcrumbs current='Preview' />);

    expect(screen.getByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/admin');
    expect(screen.getByRole('link', { name: 'Databases' })).toHaveAttribute(
      'href',
      '/admin/databases/engine'
    );
    expect(screen.getByText('Preview')).toBeInTheDocument();
  });
});
