/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import KangurAnimatedOptionCard from '@/features/kangur/ui/components/KangurAnimatedOptionCard';

describe('KangurAnimatedOptionCard', () => {
  it('renders a shared motion wrapper and option-card button props', () => {
    render(
      <KangurAnimatedOptionCard
        accent='amber'
        aria-label='Wybór opcji'
        buttonClassName='rounded-[28px] px-4 py-4'
        data-testid='animated-option-card'
        emphasis='accent'
        onClick={() => undefined}
        wrapperClassName='w-full'
        wrapperRole='listitem'
      >
        <span>Opcja A</span>
      </KangurAnimatedOptionCard>
    );

    expect(screen.getByRole('listitem')).toHaveClass('w-full');
    expect(screen.getByTestId('animated-option-card')).toHaveClass(
      'soft-card',
      'border',
      'rounded-[28px]'
    );
    expect(screen.getByRole('button', { name: 'Wybór opcji' })).toHaveTextContent('Opcja A');
  });
});
