/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AdminSettingsBreadcrumbs } from '@/shared/ui/admin-settings-breadcrumbs';

describe('AdminSettingsBreadcrumbs', () => {
  it('renders the shared Admin to Settings breadcrumb trail', () => {
    render(<AdminSettingsBreadcrumbs current='Typography' />);

    expect(screen.getByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/admin');
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute(
      'href',
      '/admin/settings'
    );
    expect(screen.getByText('Typography')).toBeInTheDocument();
  });
});
