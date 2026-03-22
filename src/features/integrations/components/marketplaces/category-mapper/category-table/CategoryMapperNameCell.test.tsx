/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/ui', () => ({
  Button: ({
    children,
    onClick,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }) => (
    <button type='button' onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('lucide-react', () => ({
  ChevronDown: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid='icon-down' {...props} />,
  ChevronRight: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid='icon-right' {...props} />
  ),
  Check: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid='icon-check' {...props} />,
}));

import { CategoryMapperNameCell } from './CategoryMapperNameCell';

describe('CategoryMapperNameCell', () => {
  it('passes expand props directly into the button and toggles when clicked', () => {
    const onToggleExpand = vi.fn();

    render(
      <CategoryMapperNameCell
        name='Algebra'
        depth={2}
        canExpand
        isExpanded={false}
        onToggleExpand={onToggleExpand}
        isMapped={false}
        hasPendingChange={false}
      />
    );

    expect(screen.getByText('Algebra')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Expand category' })).toBeInTheDocument();
    expect(screen.getByTestId('icon-right')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Expand category' }));

    expect(onToggleExpand).toHaveBeenCalledTimes(1);
  });

  it('renders mapped and expanded state without the runtime provider', () => {
    render(
      <CategoryMapperNameCell
        name='Geometry'
        depth={1}
        canExpand
        isExpanded
        onToggleExpand={vi.fn()}
        isMapped
        hasPendingChange
      />
    );

    expect(screen.getByRole('button', { name: 'Collapse category' })).toBeInTheDocument();
    expect(screen.getByTestId('icon-down')).toBeInTheDocument();
    expect(screen.getByTestId('icon-check')).toBeInTheDocument();
  });
});
