/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { Palette } from 'lucide-react';
import { describe, expect, it } from 'vitest';

import { AdminCmsPageLayout } from '@/shared/ui/admin-cms-page-layout';

describe('AdminCmsPageLayout', () => {
  it('renders the shared cms page shell with breadcrumbs and heading', () => {
    render(
      <AdminCmsPageLayout
        title='Design Themes'
        current='Themes'
        description='Manage CMS themes.'
        icon={<Palette data-testid='layout-icon' className='size-4' />}
        headerActions={<button type='button'>Create Theme</button>}
      >
        <div data-testid='layout-body'>body</div>
      </AdminCmsPageLayout>
    );

    expect(screen.getByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/admin');
    expect(screen.getByRole('link', { name: 'CMS' })).toHaveAttribute('href', '/admin/cms');
    expect(screen.getByRole('heading', { name: 'Design Themes' })).toBeInTheDocument();
    expect(screen.getByTestId('layout-icon')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Theme' })).toBeInTheDocument();
    expect(screen.getByTestId('layout-body')).toBeInTheDocument();
  });
});
