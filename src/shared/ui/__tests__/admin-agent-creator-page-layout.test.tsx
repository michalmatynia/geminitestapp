/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { Brain } from 'lucide-react';
import { describe, expect, it } from 'vitest';

import { AdminAgentCreatorPageLayout } from '@/shared/ui/admin-agent-creator-page-layout';

describe('AdminAgentCreatorPageLayout', () => {
  it('renders the shared agent creator page shell with breadcrumbs, heading, and icon support', () => {
    render(
      <AdminAgentCreatorPageLayout
        title='Persona Memory'
        current='Memory'
        parent={{ label: 'Personas', href: '/admin/agentcreator/personas' }}
        description='Search persona memory records.'
        icon={<Brain data-testid='layout-icon' className='size-4' />}
        headerActions={<button type='button'>Refresh</button>}
      >
        <div data-testid='layout-body'>body</div>
      </AdminAgentCreatorPageLayout>
    );

    expect(screen.getByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/admin');
    expect(screen.getByRole('link', { name: 'Agent Creator' })).toHaveAttribute(
      'href',
      '/admin/agentcreator'
    );
    expect(screen.getByRole('link', { name: 'Personas' })).toHaveAttribute(
      'href',
      '/admin/agentcreator/personas'
    );
    expect(screen.getByRole('heading', { name: 'Persona Memory' })).toBeInTheDocument();
    expect(screen.getByTestId('layout-icon')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument();
    expect(screen.getByTestId('layout-body')).toBeInTheDocument();
  });
});
