/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AdminFilemakerBreadcrumbs } from '@/shared/ui/admin-filemaker-breadcrumbs';

describe('AdminFilemakerBreadcrumbs', () => {
  it('renders the shared Admin to Filemaker breadcrumb trail', () => {
    render(
      <AdminFilemakerBreadcrumbs
        parent={{ label: 'Emails', href: '/admin/filemaker/emails' }}
        current='Edit'
      />
    );

    expect(screen.getByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/admin');
    expect(screen.getByRole('link', { name: 'Filemaker' })).toHaveAttribute(
      'href',
      '/admin/filemaker'
    );
    expect(screen.getByRole('link', { name: 'Emails' })).toHaveAttribute(
      'href',
      '/admin/filemaker/emails'
    );
    expect(screen.getByText('Edit')).toBeInTheDocument();
  });
});
