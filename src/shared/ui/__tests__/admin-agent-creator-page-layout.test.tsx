/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { UserCircle2 } from 'lucide-react';
import { describe, expect, it } from 'vitest';

import { AdminAgentCreatorPageLayout } from '@/shared/ui/admin-agent-creator-page-layout';

describe('AdminAgentCreatorPageLayout', () => {
  it('renders the shared agent creator page shell with breadcrumbs and header content', () => {
    render(
      <AdminAgentCreatorPageLayout
        title='Personas'
        current='Personas'
        description='Manage agent personas.'
        icon={<UserCircle2 data-testid='layout-icon' className='size-4' />}
        headerActions={<button type='button'>New Persona</button>}
      >
        <div data-testid='layout-body'>body</div>
      </AdminAgentCreatorPageLayout>
    );

    expect(screen.getByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/admin');
    expect(screen.getByRole('link', { name: 'Agent Creator' })).toHaveAttribute(
      'href',
      '/admin/agentcreator'
    );
    expect(screen.getByRole('heading', { name: 'Personas' })).toBeInTheDocument();
    expect(screen.getByTestId('layout-icon')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New Persona' })).toBeInTheDocument();
    expect(screen.getByTestId('layout-body')).toBeInTheDocument();
  });
});
