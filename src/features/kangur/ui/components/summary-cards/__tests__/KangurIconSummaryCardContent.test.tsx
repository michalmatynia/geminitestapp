/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { KangurIconSummaryCardContent } from '../KangurIconSummaryCardContent';

describe('KangurIconSummaryCardContent', () => {
  it('renders the shared icon, title, description, aside, and footer slots', () => {
    render(
      <KangurIconSummaryCardContent
        aside={<div data-testid='icon-summary-aside'>aside</div>}
        asideClassName='items-end'
        className='w-full'
        description='Opis karty'
        footer={<div data-testid='icon-summary-footer'>footer</div>}
        footerClassName='text-xs'
        icon={<div data-testid='icon-summary-icon'>icon</div>}
        title='Nagłówek'
      />
    );

    expect(screen.getByTestId('icon-summary-icon')).toBeInTheDocument();
    expect(screen.getByText('Nagłówek')).toHaveClass(
      'text-base',
      'font-extrabold',
      '[color:var(--kangur-page-text)]'
    );
    expect(screen.getByText('Opis karty')).toHaveClass(
      'text-sm',
      '[color:var(--kangur-page-muted-text)]'
    );
    expect(screen.getByTestId('icon-summary-aside').parentElement).toHaveClass('items-end');
    expect(screen.getByTestId('icon-summary-footer').parentElement).toHaveClass('mt-2', 'text-xs');
  });
});
