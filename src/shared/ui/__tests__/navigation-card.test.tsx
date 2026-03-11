/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { NavigationCard, NavigationCardGrid } from '@/shared/ui/navigation-card';

describe('NavigationCard', () => {
  it('renders a link card with title, description, and optional adornments', () => {
    render(
      <NavigationCardGrid className='md:grid-cols-2' data-testid='nav-grid'>
        <NavigationCard
          href='/admin/example'
          title='Example'
          description='Shared navigation card.'
          leading={<span data-testid='nav-leading'>L</span>}
          trailing={<span data-testid='nav-trailing'>T</span>}
        />
      </NavigationCardGrid>
    );

    expect(screen.getByTestId('nav-grid')).toHaveClass('grid', 'gap-4', 'md:grid-cols-2');

    const link = screen.getByRole('link', { name: /example/i });
    expect(link).toHaveAttribute('href', '/admin/example');
    expect(screen.getByText('Shared navigation card.')).toBeInTheDocument();
    expect(screen.getByTestId('nav-leading')).toBeInTheDocument();
    expect(screen.getByTestId('nav-trailing')).toBeInTheDocument();
  });
});
