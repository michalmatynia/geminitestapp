/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { Globe } from 'lucide-react';
import { describe, expect, it } from 'vitest';

import { AdminWidePageLayout } from '@/shared/ui/admin-wide-page-layout';

describe('AdminWidePageLayout', () => {
  it('renders the shared full-width admin page shell', () => {
    render(
      <AdminWidePageLayout
        title='Content Zones'
        description='Manage CMS zones.'
        icon={<Globe data-testid='layout-icon' className='size-4' />}
        headerActions={<button type='button'>Add Zone</button>}
      >
        <div data-testid='layout-body'>body</div>
      </AdminWidePageLayout>
    );

    expect(screen.getByRole('heading', { name: 'Content Zones' })).toBeInTheDocument();
    expect(screen.getByText('Manage CMS zones.')).toBeInTheDocument();
    expect(screen.getByTestId('layout-icon')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Zone' })).toBeInTheDocument();
    expect(screen.getByTestId('layout-body')).toBeInTheDocument();
  });
});
