/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { FolderSearch } from 'lucide-react';
import { describe, expect, it } from 'vitest';

import { AdminCaseResolverPageLayout } from '@/shared/ui/admin-case-resolver-page-layout';

describe('AdminCaseResolverPageLayout', () => {
  it('renders the shared case resolver page shell with breadcrumbs and header content', () => {
    render(
      <AdminCaseResolverPageLayout
        title='Case Resolver Tags'
        current='Tags'
        description='Manage case tags.'
        icon={<FolderSearch data-testid='layout-icon' className='size-4' />}
        headerActions={<button type='button'>Add Tag</button>}
      >
        <div data-testid='layout-body'>body</div>
      </AdminCaseResolverPageLayout>
    );

    expect(screen.getByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/admin');
    expect(screen.getByRole('link', { name: 'Case Resolver' })).toHaveAttribute(
      'href',
      '/admin/case-resolver'
    );
    expect(screen.getByRole('heading', { name: 'Case Resolver Tags' })).toBeInTheDocument();
    expect(screen.getByTestId('layout-icon')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Tag' })).toBeInTheDocument();
    expect(screen.getByTestId('layout-body')).toBeInTheDocument();
  });
});
