/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => true,
}));

import LessonActivityStage from '@/features/kangur/ui/components/LessonActivityStage';
import { KangurLessonNavigationProvider } from '@/features/kangur/ui/context/KangurLessonNavigationContext';

describe('LessonActivityStage touch mode', () => {
  it('uses a larger touch-friendly secret lesson pill on coarse pointers', () => {
    render(
      <KangurLessonNavigationProvider
        onBack={vi.fn()}
        secretLessonPill={{ isUnlocked: true, onOpen: vi.fn() }}
      >
        <LessonActivityStage accent='indigo' icon='🕐' onBack={vi.fn()} title='Ćwiczenie'>
          <div>Gra</div>
        </LessonActivityStage>
      </KangurLessonNavigationProvider>
    );

    expect(screen.getByTestId('lesson-activity-secret-indicator')).toHaveClass(
      'h-11',
      'min-w-[56px]',
      'touch-manipulation',
      'select-none'
    );
    expect(screen.getByTestId('lesson-activity-back-button')).toHaveClass('min-h-11', 'min-w-11');
  });
});
