'use client';

import { createRef } from 'react';
import { render, screen } from '@testing-library/react';

import { KangurDrawingPracticeBoard } from '@/features/kangur/ui/components/drawing-engine/KangurDrawingPracticeBoard';

describe('KangurDrawingPracticeBoard', () => {
  it('renders the shared board shell with help text, middle content, actions, and feedback', () => {
    render(
      <KangurDrawingPracticeBoard
        accent='emerald'
        actionRow={<div data-testid='drawing-actions'>actions</div>}
        afterCanvas={<div data-testid='drawing-overlay'>overlay</div>}
        ariaDescribedBy='drawing-help'
        ariaKeyShortcuts='Enter Space'
        ariaLabel='Shared geometry board'
        boardClassName='rounded-[26px]'
        boardDataTestId='drawing-board'
        canvasDataTestId='drawing-canvas'
        canvasRef={createRef<HTMLCanvasElement>()}
        canvasStyle={{ background: 'white' }}
        feedback={{ kind: 'info', text: 'Keep drawing.' }}
        feedbackTestId='drawing-feedback'
        height={220}
        helpId='drawing-help'
        helpTestId='drawing-help-text'
        helpText='Use arrows to move the cursor.'
        isCoarsePointer
        isPointerDrawing
        middleContent={<div data-testid='drawing-middle'>middle</div>}
        onPointerDown={() => {}}
        onPointerMove={() => {}}
        onPointerUp={() => {}}
        width={320}
      />
    );

    expect(screen.getByTestId('drawing-board')).toHaveClass('rounded-[26px]');
    expect(screen.getByTestId('drawing-canvas')).toHaveAttribute('aria-keyshortcuts', 'Enter Space');
    expect(screen.getByTestId('drawing-help-text')).toHaveTextContent(
      'Use arrows to move the cursor.'
    );
    expect(screen.getByTestId('drawing-middle')).toHaveTextContent('middle');
    expect(screen.getByTestId('drawing-actions')).toHaveTextContent('actions');
    expect(screen.getByTestId('drawing-feedback')).toHaveTextContent('Keep drawing.');
  });

  it('supports rendering feedback before the shared action row', () => {
    render(
      <KangurDrawingPracticeBoard
        accent='amber'
        actionRow={<div data-testid='drawing-actions'>actions</div>}
        ariaLabel='Ordered board'
        canvasRef={createRef<HTMLCanvasElement>()}
        feedback={{ kind: 'success', text: 'Nice.' }}
        feedbackBeforeActions
        feedbackTestId='drawing-feedback'
        height={220}
        helpId='drawing-help'
        helpText='Help'
        isCoarsePointer={false}
        isPointerDrawing={false}
        onPointerDown={() => {}}
        onPointerMove={() => {}}
        onPointerUp={() => {}}
        width={320}
      />
    );

    const feedback = screen.getByTestId('drawing-feedback');
    const actions = screen.getByTestId('drawing-actions');

    expect(
      feedback.compareDocumentPosition(actions) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });
});
