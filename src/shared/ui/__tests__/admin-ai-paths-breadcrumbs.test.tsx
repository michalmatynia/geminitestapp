/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AdminAiPathsBreadcrumbs } from '@/shared/ui/admin-ai-paths-breadcrumbs';

describe('AdminAiPathsBreadcrumbs', () => {
  it('renders the shared Admin to AI Paths breadcrumb trail', () => {
    render(
      <AdminAiPathsBreadcrumbs
        parent={{ label: 'Queue', href: '/admin/ai-paths/queue' }}
        current='All Runs'
      />
    );

    expect(screen.getByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/admin');
    expect(screen.getByRole('link', { name: 'AI Paths' })).toHaveAttribute(
      'href',
      '/admin/ai-paths'
    );
    expect(screen.getByRole('link', { name: 'Queue' })).toHaveAttribute(
      'href',
      '/admin/ai-paths/queue'
    );
    expect(screen.getByText('All Runs')).toBeInTheDocument();
  });
});
