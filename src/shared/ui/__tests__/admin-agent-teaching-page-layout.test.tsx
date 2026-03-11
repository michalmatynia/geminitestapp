/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { GraduationCap } from 'lucide-react';
import { describe, expect, it } from 'vitest';

import { AdminAgentTeachingPageLayout } from '@/shared/ui/admin-agent-teaching-page-layout';

describe('AdminAgentTeachingPageLayout', () => {
  it('renders the shared learner agents page shell with breadcrumbs and header content', () => {
    render(
      <AdminAgentTeachingPageLayout
        title='Embedding School'
        current='Collections'
        description='Manage learner collections.'
        icon={<GraduationCap data-testid='layout-icon' className='size-4' />}
        headerActions={<button type='button'>New Collection</button>}
      >
        <div data-testid='layout-body'>body</div>
      </AdminAgentTeachingPageLayout>
    );

    expect(screen.getByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/admin');
    expect(screen.getByRole('link', { name: 'Learner Agents' })).toHaveAttribute(
      'href',
      '/admin/agentcreator/teaching'
    );
    expect(screen.getByRole('heading', { name: 'Embedding School' })).toBeInTheDocument();
    expect(screen.getByTestId('layout-icon')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New Collection' })).toBeInTheDocument();
    expect(screen.getByTestId('layout-body')).toBeInTheDocument();
  });
});
