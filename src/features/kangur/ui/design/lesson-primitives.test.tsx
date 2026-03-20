/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  KangurLessonCaption,
  KangurLessonInset,
  KangurLessonLead,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';

describe('Kangur lesson primitives', () => {
  it('renders lesson inset surfaces with shared accent styling', () => {
    render(
      <KangurLessonInset accent='teal' data-testid='lesson-inset'>
        Example inset
      </KangurLessonInset>
    );

    expect(screen.getByTestId('lesson-inset')).toHaveClass(
      'kangur-lesson-inset',
      'kangur-card-padding-sm',
      'kangur-border-accent-teal'
    );
  });

  it('renders shared lesson stack, lead, and caption typography', () => {
    render(
      <KangurLessonStack className='w-full' data-testid='lesson-stack' gap='sm'>
        <KangurLessonLead data-testid='lesson-lead'>Lead copy</KangurLessonLead>
        <KangurLessonCaption align='left' data-testid='lesson-caption'>
          Caption copy
        </KangurLessonCaption>
      </KangurLessonStack>
    );

    expect(screen.getByTestId('lesson-stack')).toHaveClass(
      'flex',
      'flex-col',
      'items-center',
      'kangur-stack-gap-sm',
      'w-full'
    );
    expect(screen.getByTestId('lesson-lead')).toHaveClass('text-center', '[color:var(--kangur-page-text)]');
    expect(screen.getByTestId('lesson-caption')).toHaveClass(
      'text-sm',
      'text-left',
      '[color:var(--kangur-page-muted-text)]'
    );
  });
});
