/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { KangurLessonInset } from '@/features/kangur/ui/design/lesson-primitives';

describe('Kangur lesson primitives', () => {
  it('renders lesson inset surfaces with shared accent styling', () => {
    render(
      <KangurLessonInset accent='teal' data-testid='lesson-inset'>
        Example inset
      </KangurLessonInset>
    );

    expect(screen.getByTestId('lesson-inset')).toHaveClass('rounded-[18px]', 'border-teal-100/90');
  });
});
