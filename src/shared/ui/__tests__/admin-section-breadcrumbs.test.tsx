/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AdminSectionBreadcrumbs } from '@/shared/ui/admin-section-breadcrumbs';

describe('AdminSectionBreadcrumbs', () => {
  it('renders the shared Admin -> section -> parent -> current breadcrumb trail', () => {
    render(
      <AdminSectionBreadcrumbs
        section={{ label: 'CMS', href: '/admin/cms' }}
        parent={{ label: 'Pages', href: '/admin/cms/pages' }}
        current='Edit'
      />
    );

    expect(screen.getByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/admin');
    expect(screen.getByRole('link', { name: 'CMS' })).toHaveAttribute('href', '/admin/cms');
    expect(screen.getByRole('link', { name: 'Pages' })).toHaveAttribute(
      'href',
      '/admin/cms/pages'
    );
    expect(screen.getByText('Edit')).toBeInTheDocument();
  });
});
