import { fireEvent, render, screen } from '@testing-library/react';

import { KangurTracingLessonFooter } from '@/features/kangur/ui/components/drawing-engine/KangurTracingLessonFooter';

describe('KangurTracingLessonFooter', () => {
  it('renders the idle prompt and check action before validation', () => {
    const onCheck = vi.fn();

    render(
      <KangurTracingLessonFooter
        checkLabel='Check'
        clearLabel='Clear'
        feedback={null}
        idlePrompt='Click check when you finish tracing.'
        isCoarsePointer={false}
        isLastRound={false}
        nextLabel='Next'
        onCheck={onCheck}
        onClear={() => {}}
        onNext={() => {}}
        restartLabel='Restart'
      />
    );

    expect(screen.getByText('Click check when you finish tracing.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    expect(onCheck).toHaveBeenCalledTimes(1);
  });

  it('renders success feedback with the restart action on the last round', () => {
    const onNext = vi.fn();

    render(
      <KangurTracingLessonFooter
        checkLabel='Check'
        clearLabel='Clear'
        feedback={{ kind: 'success', text: 'Nicely traced.' }}
        idlePrompt='Idle'
        isCoarsePointer
        isLastRound
        nextLabel='Next'
        onCheck={() => {}}
        onClear={() => {}}
        onNext={onNext}
        restartLabel='Restart'
      />
    );

    expect(screen.getByRole('status')).toHaveTextContent('Nicely traced.');
    fireEvent.click(screen.getByRole('button', { name: 'Restart' }));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('renders shared utility actions inside the footer controls', () => {
    render(
      <KangurTracingLessonFooter
        checkLabel='Check'
        clearLabel='Clear'
        feedback={null}
        idlePrompt='Idle'
        isCoarsePointer={false}
        isLastRound={false}
        nextLabel='Next'
        onCheck={() => {}}
        onClear={() => {}}
        onNext={() => {}}
        restartLabel='Restart'
        utilityActions={
          <>
            <button type='button'>Undo</button>
            <button type='button'>Export PNG</button>
          </>
        }
      />
    );

    expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export PNG' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear' })).toBeInTheDocument();
  });
});
