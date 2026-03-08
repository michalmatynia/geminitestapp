/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { expectNoAxeViolations } from '@/testing/accessibility/axe';

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { AdminKangurDocumentationPage } from '@/features/kangur/admin/AdminKangurDocumentationPage';

describe('AdminKangurDocumentationPage', () => {
  it('renders the standalone Kangur documentation center with accessible navigation and search semantics', () => {
    render(<AdminKangurDocumentationPage />);

    expect(screen.getByText('Kangur Documentation')).toBeInTheDocument();
    expect(screen.getByText('Kangur Documentation Index')).toBeInTheDocument();
    expect(screen.getAllByText('Kangur Overview').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: /skip to documentation content/i })).toHaveAttribute(
      'href',
      '#kangur-documentation-content'
    );
    expect(screen.getByRole('main', { name: /documentation workspace/i })).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: /search kangur documentation/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to kangur settings/i })).toHaveAttribute(
      'href',
      '/admin/kangur/settings'
    );
  });

  it('announces documentation search result changes for screen readers', () => {
    render(<AdminKangurDocumentationPage />);

    const searchInput = screen.getByRole('searchbox', { name: /search kangur documentation/i });

    fireEvent.change(searchInput, { target: { value: 'no matches expected' } });

    expect(screen.getByRole('status')).toHaveTextContent(
      'Showing 0 guides and 0 tooltip documents across 0 sections for "no matches expected".'
    );
    expect(screen.getByText('No Kangur guide matched the current search.')).toBeInTheDocument();
    expect(
      screen.getByText('No Kangur tooltip documentation matched the current search.')
    ).toBeInTheDocument();
  });

  it('moves focus to the documentation main region from the skip link', () => {
    render(<AdminKangurDocumentationPage />);

    fireEvent.click(screen.getByRole('link', { name: /skip to documentation content/i }));

    expect(screen.getByRole('main', { name: /documentation workspace/i })).toHaveFocus();
  });

  it('has no obvious accessibility violations', async () => {
    const { container } = render(<AdminKangurDocumentationPage />);

    await expectNoAxeViolations(container);
  });
});
