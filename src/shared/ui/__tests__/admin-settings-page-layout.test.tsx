/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { Settings } from 'lucide-react';
import { describe, expect, it } from 'vitest';

import { AdminSettingsPageLayout } from '@/shared/ui/admin-settings-page-layout';

describe('AdminSettingsPageLayout', () => {
  it('renders the shared settings page shell with breadcrumbs and header content', () => {
    render(
      <AdminSettingsPageLayout
        title='Notifications'
        current='Notifications'
        description='Configure notifications.'
        icon={<Settings data-testid='layout-icon' className='size-4' />}
        headerActions={<button type='button'>Save</button>}
      >
        <div data-testid='layout-body'>body</div>
      </AdminSettingsPageLayout>
    );

    expect(screen.getByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/admin');
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute(
      'href',
      '/admin/settings'
    );
    expect(screen.getByRole('heading', { name: 'Notifications' })).toBeInTheDocument();
    expect(screen.getByTestId('layout-icon')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    expect(screen.getByTestId('layout-body')).toBeInTheDocument();
  });
});
