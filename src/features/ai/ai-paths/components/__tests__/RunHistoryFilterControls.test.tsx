import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/ui/primitives.public', () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>): React.JSX.Element => (
    <button {...props}>{children}</button>
  ),
  Hint: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }): React.JSX.Element => <div data-classname={className ?? ''}>{children}</div>,
  UI_CENTER_ROW_SPACED_CLASSNAME: 'ui-center-row-spaced',
}));

import { RunHistoryFilterControls } from '../RunHistoryFilterControls';

describe('RunHistoryFilterControls', () => {
  it('renders controls and calls callbacks for refresh, compare, and filter changes', () => {
    const onSetRunFilter = vi.fn();
    const onToggleCompareMode = vi.fn();
    const onRefresh = vi.fn();

    render(
      <RunHistoryFilterControls
        runFilter='failed'
        onSetRunFilter={onSetRunFilter}
        compareMode={false}
        onToggleCompareMode={onToggleCompareMode}
        isRefreshing={false}
        onRefresh={onRefresh}
      />
    );

    expect(screen.getByText('Run History')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Compare runs' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Active' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Failed' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dead-letter' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    fireEvent.click(screen.getByRole('button', { name: 'Compare runs' }));
    fireEvent.click(screen.getByRole('button', { name: 'Dead-letter' }));

    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(onToggleCompareMode).toHaveBeenCalledTimes(1);
    expect(onSetRunFilter).toHaveBeenCalledWith('dead');
  });

  it('shows active compare label and disables refresh while refreshing', () => {
    render(
      <RunHistoryFilterControls
        runFilter='all'
        onSetRunFilter={vi.fn()}
        compareMode
        onToggleCompareMode={vi.fn()}
        isRefreshing
        onRefresh={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Refreshing...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Exit compare' })).toBeInTheDocument();
  });
});
