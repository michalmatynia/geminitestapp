/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { NotebookPen } from 'lucide-react';
import { describe, expect, it } from 'vitest';

import { AdminNotesPageLayout } from '@/shared/ui/admin-notes-page-layout';

describe('AdminNotesPageLayout', () => {
  it('renders the shared notes page shell with breadcrumbs and header content', () => {
    render(
      <AdminNotesPageLayout
        title='Notebooks'
        current='Notebooks'
        description='Manage note notebooks.'
        icon={<NotebookPen data-testid='layout-icon' className='size-4' />}
        headerActions={<button type='button'>Create Notebook</button>}
      >
        <div data-testid='layout-body'>body</div>
      </AdminNotesPageLayout>
    );

    expect(screen.getByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/admin');
    expect(screen.getByRole('link', { name: 'Notes' })).toHaveAttribute('href', '/admin/notes');
    expect(screen.getByRole('heading', { name: 'Notebooks' })).toBeInTheDocument();
    expect(screen.getByTestId('layout-icon')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Notebook' })).toBeInTheDocument();
    expect(screen.getByTestId('layout-body')).toBeInTheDocument();
  });
});
