/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ExamNavigation } from '@/features/kangur/ui/components/ExamNavigation';

describe('ExamNavigation', () => {
  it('uses touch-friendly previous and next controls', () => {
    const onPrev = vi.fn();
    const onNext = vi.fn();
    const onPrintPanel = vi.fn();

    render(
      <ExamNavigation
        prevDisabled={false}
        nextDisabled={false}
        prevLabel='Poprzednie pytanie'
        nextLabel='Następne pytanie'
        onPrev={onPrev}
        onNext={onNext}
        onPrintPanel={onPrintPanel}
        printLabel='Drukuj panel'
        progressLabel='2 / 10'
      />
    );

    const prevButton = screen.getByRole('button', { name: 'Poprzednie pytanie' });
    const nextButton = screen.getByRole('button', { name: 'Następne pytanie' });
    const printButton = screen.getByRole('button', { name: 'Drukuj panel' });
    const navigation = screen.getByRole('navigation', { name: 'Nawigacja w teście Kangur' });

    expect(prevButton).toHaveClass('touch-manipulation', 'select-none', 'min-h-11', 'min-w-[3rem]');
    expect(nextButton).toHaveClass('touch-manipulation', 'select-none', 'min-h-11', 'min-w-[3rem]');
    expect(
      Array.from(navigation.querySelectorAll('button')).map((button) => button.getAttribute('aria-label'))
    ).toEqual(['Poprzednie pytanie', 'Następne pytanie', 'Drukuj panel']);

    fireEvent.click(prevButton);
    fireEvent.click(nextButton);
    fireEvent.click(printButton);

    expect(onPrev).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onPrintPanel).toHaveBeenCalledTimes(1);
  });
});
