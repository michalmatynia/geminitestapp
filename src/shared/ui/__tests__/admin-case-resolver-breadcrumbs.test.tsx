/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AdminCaseResolverBreadcrumbs } from '@/shared/ui/admin-case-resolver-breadcrumbs';

describe('AdminCaseResolverBreadcrumbs', () => {
  it('renders the shared Admin to Case Resolver breadcrumb trail', () => {
    render(<AdminCaseResolverBreadcrumbs current='Preferences' />);

    expect(screen.getByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/admin');
    expect(screen.getByRole('link', { name: 'Case Resolver' })).toHaveAttribute(
      'href',
      '/admin/case-resolver'
    );
    expect(screen.getByText('Preferences')).toBeInTheDocument();
  });
});
