/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { PlugZap } from 'lucide-react';
import { describe, expect, it } from 'vitest';

import { AdminIntegrationsPageLayout } from '@/shared/ui/admin-integrations-page-layout';

describe('AdminIntegrationsPageLayout', () => {
  it('renders the shared integrations page shell with breadcrumbs, heading, and icon support', () => {
    render(
      <AdminIntegrationsPageLayout
        title='Add Integrations'
        current='Add'
        description='Connect external services.'
        icon={<PlugZap data-testid='layout-icon' className='size-4' />}
        headerActions={<button type='button'>Refresh</button>}
      >
        <div data-testid='layout-body'>body</div>
      </AdminIntegrationsPageLayout>
    );

    expect(screen.getByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/admin');
    expect(screen.getByRole('link', { name: 'Integrations' })).toHaveAttribute(
      'href',
      '/admin/integrations'
    );
    expect(screen.getByRole('heading', { name: 'Add Integrations' })).toBeInTheDocument();
    expect(screen.getByTestId('layout-icon')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument();
    expect(screen.getByTestId('layout-body')).toBeInTheDocument();
  });
});
