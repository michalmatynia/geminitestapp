/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    prefetch: _prefetch,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; prefetch?: boolean }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { KangurAdminContentShell } from '../KangurAdminContentShell';

describe('KangurAdminContentShell', () => {
  it('renders shared Kangur admin chrome with breadcrumbs, actions, refresh, and content', () => {
    const onRefresh = vi.fn();

    render(
      <KangurAdminContentShell
        title='Kangur Settings'
        description='Manage shared Kangur settings.'
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Kangur', href: '/admin/kangur' },
          { label: 'Settings' },
        ]}
        headerActions={<button type='button'>Save</button>}
        refresh={{ onRefresh, isRefreshing: false }}
      >
        <div>Shell body</div>
      </KangurAdminContentShell>
    );

    expect(screen.getByText('Kangur Settings')).toBeInTheDocument();
    expect(screen.getByText('Manage shared Kangur settings.')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toHaveTextContent(
      'Admin/Kangur/Settings'
    );
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    expect(screen.getByText('Shell body')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /refresh/i }));

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});
