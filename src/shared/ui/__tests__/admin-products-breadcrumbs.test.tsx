/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AdminProductsBreadcrumbs } from '@/shared/ui/admin-products-breadcrumbs';

describe('AdminProductsBreadcrumbs', () => {
  it('renders the shared Admin to Products breadcrumb trail', () => {
    render(<AdminProductsBreadcrumbs current='Settings' />);

    expect(screen.getByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/admin');
    expect(screen.getByRole('link', { name: 'Products' })).toHaveAttribute(
      'href',
      '/admin/products'
    );
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });
});
