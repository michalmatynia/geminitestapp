import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/ui/navigation-and-layout.public', () => ({
  LoadingState: ({
    message,
    className,
    size,
  }: {
    message?: string;
    className?: string;
    size?: string;
  }) => (
    <div data-testid='loading-state' data-class-name={className} data-size={size}>
      {message}
    </div>
  ),
}));

import { IntegrationSelectionLoadingState } from './IntegrationSelectionLoadingState';

describe('IntegrationSelectionLoadingState', () => {
  it('renders inline-text variant with shared message', () => {
    render(
      <IntegrationSelectionLoadingState
        variant='inline-text'
        className='text-sm text-muted-foreground'
      />
    );

    const text = screen.getByText('Loading integrations...');
    expect(text.tagName).toBe('P');
    expect(text).toHaveClass('text-sm', 'text-muted-foreground');
  });

  it('renders loading-state variant with forwarded props', () => {
    render(
      <IntegrationSelectionLoadingState
        variant='loading-state'
        containerClassName='flex justify-center'
        className='py-4'
        size='sm'
      />
    );

    expect(screen.getByTestId('loading-state')).toHaveAttribute('data-class-name', 'py-4');
    expect(screen.getByTestId('loading-state')).toHaveAttribute('data-size', 'sm');
    expect(screen.getByTestId('loading-state').parentElement).toHaveClass('flex', 'justify-center');
    expect(screen.getByText('Loading integrations...')).toBeInTheDocument();
  });
});
