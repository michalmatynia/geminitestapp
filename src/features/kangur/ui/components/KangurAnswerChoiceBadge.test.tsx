/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@/__tests__/test-utils';
import { describe, expect, it } from 'vitest';

import { KangurAnswerChoiceBadge } from '@/features/kangur/ui/components/KangurAnswerChoiceBadge';

describe('KangurAnswerChoiceBadge', () => {
  it('renders the shared circular answer badge in both supported sizes', () => {
    const { rerender } = render(
      <KangurAnswerChoiceBadge className='bg-indigo-100'>A</KangurAnswerChoiceBadge>
    );

    expect(screen.getByText('A')).toHaveClass(
      'rounded-full',
      'font-extrabold',
      'h-7',
      'w-7',
      'text-sm'
    );

    rerender(
      <KangurAnswerChoiceBadge className='bg-slate-100' size='xs'>
        B
      </KangurAnswerChoiceBadge>
    );

    expect(screen.getByText('B')).toHaveClass(
      'rounded-full',
      'font-extrabold',
      'h-7',
      'w-7',
      'text-xs'
    );
  });
});
