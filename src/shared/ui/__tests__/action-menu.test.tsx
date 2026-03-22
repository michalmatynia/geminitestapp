/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ActionMenu } from '@/shared/ui/ActionMenu';

const dropdownMenuContentSpy = vi.fn();

vi.mock('@/shared/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode; asChild?: boolean }) => (
    <div>{children}</div>
  ),
  DropdownMenuContent: ({
    children,
    align,
    className,
  }: {
    children: React.ReactNode;
    align?: string;
    className?: string;
  }) => {
    dropdownMenuContentSpy({ align, className });
    return <div data-testid='action-menu-content'>{children}</div>;
  },
}));

describe('ActionMenu', () => {
  it('renders the default trigger label and forwards dropdown alignment', () => {
    render(
      <ActionMenu align='start' className='menu-shell'>
        <button type='button'>Archive</button>
      </ActionMenu>
    );

    expect(screen.getByRole('button', { name: 'Open actions menu' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Archive' })).toBeInTheDocument();
    expect(dropdownMenuContentSpy).toHaveBeenCalledWith({
      align: 'start',
      className: 'menu-shell',
    });
  });
});
