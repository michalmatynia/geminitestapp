// @vitest-environment jsdom

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { StudioCard } from './StudioCard';

describe('StudioCard', () => {
  it('renders the label, count, and children', () => {
    render(
      <StudioCard label='Layers' count={3}>
        <div>Card Content</div>
      </StudioCard>
    );

    expect(screen.getByText('Layers (3)')).toBeInTheDocument();
    expect(screen.getByText('Card Content')).toBeInTheDocument();
  });

  it('applies the provided runtime class name to the card shell', () => {
    const { container } = render(
      <StudioCard className='custom-studio-card'>
        <div>Card Content</div>
      </StudioCard>
    );

    expect(container.querySelector('.custom-studio-card')).not.toBeNull();
  });
});
