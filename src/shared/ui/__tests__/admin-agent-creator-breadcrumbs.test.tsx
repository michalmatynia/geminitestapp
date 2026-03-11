/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AdminAgentCreatorBreadcrumbs } from '@/shared/ui/admin-agent-creator-breadcrumbs';

describe('AdminAgentCreatorBreadcrumbs', () => {
  it('renders the shared Admin to Agent Creator breadcrumb trail', () => {
    render(<AdminAgentCreatorBreadcrumbs current='Runs' />);

    expect(screen.getByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/admin');
    expect(screen.getByRole('link', { name: 'Agent Creator' })).toHaveAttribute(
      'href',
      '/admin/agentcreator'
    );
    expect(screen.getByText('Runs')).toBeInTheDocument();
  });
});
