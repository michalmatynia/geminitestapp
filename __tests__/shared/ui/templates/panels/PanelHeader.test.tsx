import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PanelHeader } from '@/shared/ui/templates/panels/PanelHeader';

describe('PanelHeader', () => {
  it('renders title', () => {
    render(<PanelHeader title="Test Panel" isLoading={false} />);
    expect(screen.getByText('Test Panel')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(
      <PanelHeader 
        title="Test" 
        description="Test description"
        isLoading={false}
      />
    );
    expect(screen.getByText('Test description')).toBeInTheDocument();
  });

  it('renders refresh button when refreshable is true', () => {
    render(
      <PanelHeader 
        title="Test" 
        refreshable={true}
        isLoading={false}
      />
    );
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('renders action buttons', () => {
    const actions = [
      { key: 'edit', label: 'Edit', onClick: vi.fn() },
      { key: 'delete', label: 'Delete', onClick: vi.fn() },
    ];
    render(
      <PanelHeader 
        title="Test"
        actions={actions}
        isLoading={false}
        refreshable={false}
      />
    );
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('disables refresh button when isRefreshing is true', () => {
    render(
      <PanelHeader 
        title="Test"
        refreshable={true}
        isRefreshing={true}
        isLoading={false}
      />
    );
    const refreshButton = screen.getAllByRole('button')[0];
    expect(refreshButton).toBeDisabled();
  });

  it('renders icon when provided', () => {
    render(
      <PanelHeader 
        title="Test"
        icon={<span data-testid="icon">📊</span>}
        isLoading={false}
      />
    );
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });
});
