/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AdminCmsBreadcrumbs } from '@/shared/ui/admin-cms-breadcrumbs';

describe('AdminCmsBreadcrumbs', () => {
  it('renders the shared Admin to CMS breadcrumb trail', () => {
    render(<AdminCmsBreadcrumbs current='Slugs' />);

    expect(screen.getByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/admin');
    expect(screen.getByRole('link', { name: 'CMS' })).toHaveAttribute('href', '/admin/cms');
    expect(screen.getByText('Slugs')).toBeInTheDocument();
  });
});
