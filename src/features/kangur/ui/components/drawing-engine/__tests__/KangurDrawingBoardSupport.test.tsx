'use client';

import { render, screen } from '@testing-library/react';

import {
  KangurDrawingFeedbackMessage,
  KangurDrawingInputHelpText,
} from '@/features/kangur/ui/components/drawing-engine/KangurDrawingBoardSupport';

describe('KangurDrawingBoardSupport', () => {
  it('renders input help with coarse-pointer visibility rules', () => {
    const { rerender } = render(
      <KangurDrawingInputHelpText
        id='drawing-help'
        isCoarsePointer
        testId='drawing-help'
      >
        Use arrows to move.
      </KangurDrawingInputHelpText>
    );

    expect(screen.getByTestId('drawing-help')).toHaveClass('block');
    expect(screen.getByTestId('drawing-help')).toHaveTextContent('Use arrows to move.');

    rerender(
      <KangurDrawingInputHelpText
        id='drawing-help'
        isCoarsePointer={false}
        testId='drawing-help'
      >
        Use arrows to move.
      </KangurDrawingInputHelpText>
    );

    expect(screen.getByTestId('drawing-help')).toHaveClass('hidden', 'sm:block');
  });

  it('renders feedback with the correct status tone', () => {
    const { rerender } = render(
      <KangurDrawingFeedbackMessage
        feedback={{ kind: 'success', text: 'Nice drawing.' }}
        testId='drawing-feedback'
      />
    );

    expect(screen.getByTestId('drawing-feedback')).toHaveClass('text-emerald-600');
    expect(screen.getByTestId('drawing-feedback')).toHaveTextContent('Nice drawing.');

    rerender(
      <KangurDrawingFeedbackMessage
        feedback={{ kind: 'error', text: 'Try again.' }}
        testId='drawing-feedback'
      />
    );
    expect(screen.getByTestId('drawing-feedback')).toHaveClass('text-rose-600');

    rerender(
      <KangurDrawingFeedbackMessage
        feedback={{ kind: 'info', text: 'Keep going.' }}
        testId='drawing-feedback'
      />
    );
    expect(screen.getByTestId('drawing-feedback')).toHaveClass('text-amber-600');
  });
});
