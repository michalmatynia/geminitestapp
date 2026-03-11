/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AdminIntegrationsBreadcrumbs } from '@/shared/ui/admin-integrations-breadcrumbs';

describe('AdminIntegrationsBreadcrumbs', () => {
  it('renders the shared Admin to Integrations breadcrumb trail', () => {
    render(<AdminIntegrationsBreadcrumbs current='Add' />);

    expect(screen.getByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/admin');
    expect(screen.getByRole('link', { name: 'Integrations' })).toHaveAttribute(
      'href',
      '/admin/integrations'
    );
    expect(screen.getByText('Add')).toBeInTheDocument();
  });
});
