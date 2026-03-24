/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LESSONS_LIBRARY_COLUMN_CLASSNAME } from '@/features/kangur/ui/pages/lessons/Lessons.constants';

import { KangurSubjectGroupSection } from './KangurSubjectGroupSection';

const splitClasses = (className: string): string[] => className.trim().split(/\s+/);

describe('KangurSubjectGroupSection', () => {
  it('keeps the subject heading and lesson body on a centered shared column', () => {
    render(
      <KangurSubjectGroupSection ariaLabel='Arithmetic lessons' label='Arithmetic'>
        <div data-testid='subject-group-content'>Lesson body</div>
      </KangurSubjectGroupSection>
    );

    const section = screen.getByLabelText('Arithmetic lessons');
    expect(section).toHaveClass('flex', 'w-full', 'flex-col', 'items-center');
    expect(screen.getByText('Arithmetic')).toHaveClass('w-full', 'text-center');
    expect(screen.getByTestId('subject-group-content').parentElement).toHaveClass(
      ...splitClasses(LESSONS_LIBRARY_COLUMN_CLASSNAME)
    );
  });
});
