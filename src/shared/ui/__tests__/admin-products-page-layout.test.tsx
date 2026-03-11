/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { Factory } from 'lucide-react';
import { describe, expect, it } from 'vitest';

import { AdminProductsPageLayout } from '@/shared/ui/admin-products-page-layout';

describe('AdminProductsPageLayout', () => {
  it('renders the shared products page shell with breadcrumbs, heading, and icon support', () => {
    render(
      <AdminProductsPageLayout
        title='Producers'
        current='Producers'
        description='Manage producers.'
        icon={<Factory data-testid='layout-icon' className='size-4' />}
        headerActions={<button type='button'>Add Producer</button>}
      >
        <div data-testid='layout-body'>body</div>
      </AdminProductsPageLayout>
    );

    expect(screen.getByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/admin');
    expect(screen.getByRole('link', { name: 'Products' })).toHaveAttribute(
      'href',
      '/admin/products'
    );
    expect(screen.getByRole('heading', { name: 'Producers' })).toBeInTheDocument();
    expect(screen.getByTestId('layout-icon')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Producer' })).toBeInTheDocument();
    expect(screen.getByTestId('layout-body')).toBeInTheDocument();
  });
});
