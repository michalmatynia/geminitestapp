'use client';

import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useKangurKeyboardPointDrawing } from '@/features/kangur/ui/components/drawing-engine/useKangurKeyboardPointDrawing';

function KeyboardDrawingHarness({
  disabled = false,
  onEscape,
}: {
  disabled?: boolean;
  onEscape?: () => void;
}): React.JSX.Element {
  const [strokes, setStrokes] = useState<{ x: number; y: number }[][]>([]);
  const [infoClearedCount, setInfoClearedCount] = useState(0);
  const {
    handleCanvasKeyDown,
    keyboardCursor,
    keyboardDrawing,
    keyboardStatus,
    resetKeyboard,
  } = useKangurKeyboardPointDrawing({
    clearedStatus: 'cleared',
    disabled,
    finishedStatus: 'finished',
    height: 220,
    initialCursor: { x: 100, y: 100 },
    onBeforeKeyboardAction: () => {
      setInfoClearedCount((count) => count + 1);
    },
    onEscape,
    readyStatus: 'ready',
    setStrokes,
    startedStatus: 'started',
    step: 20,
    width: 320,
  });

  return (
    <div>
      <canvas aria-label='keyboard drawing canvas' onKeyDown={handleCanvasKeyDown} tabIndex={0} />
      <button onClick={() => resetKeyboard('board cleared')}>Reset</button>
      <div data-testid='status'>{keyboardStatus}</div>
      <div data-testid='cursor'>{`${keyboardCursor.x},${keyboardCursor.y}`}</div>
      <div data-testid='drawing'>{keyboardDrawing ? 'yes' : 'no'}</div>
      <div data-testid='strokes'>{JSON.stringify(strokes)}</div>
      <div data-testid='info-clear-count'>{infoClearedCount}</div>
    </div>
  );
}

describe('useKangurKeyboardPointDrawing', () => {
  it('toggles keyboard drawing, moves the cursor, and appends points into the active stroke', () => {
    render(<KeyboardDrawingHarness />);

    const canvas = screen.getByLabelText('keyboard drawing canvas');

    expect(screen.getByTestId('status')).toHaveTextContent('ready');
    expect(screen.getByTestId('cursor')).toHaveTextContent('100,100');

    fireEvent.keyDown(canvas, { key: 'Enter' });
    fireEvent.keyDown(canvas, { key: 'ArrowRight' });
    fireEvent.keyDown(canvas, { key: 'ArrowDown' });
    fireEvent.keyDown(canvas, { key: 'Enter' });

    expect(screen.getByTestId('status')).toHaveTextContent('finished');
    expect(screen.getByTestId('cursor')).toHaveTextContent('120,120');
    expect(screen.getByTestId('drawing')).toHaveTextContent('no');
    expect(screen.getByTestId('strokes')).toHaveTextContent(
      '[[' +
        '{"x":100,"y":100},' +
        '{"x":120,"y":100},' +
        '{"x":120,"y":120},' +
        '{"x":120,"y":120}' +
      ']]'
    );
    expect(screen.getByTestId('info-clear-count')).toHaveTextContent('4');
  });

  it('clears and resets on escape, and ignores keys while disabled', () => {
    const onEscape = vi.fn();
    const { unmount } = render(<KeyboardDrawingHarness onEscape={onEscape} />);

    const canvas = screen.getByLabelText('keyboard drawing canvas');

    fireEvent.keyDown(canvas, { key: 'ArrowLeft' });
    fireEvent.keyDown(canvas, { key: 'Escape' });

    expect(onEscape).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('status')).toHaveTextContent('cleared');
    expect(screen.getByTestId('cursor')).toHaveTextContent('100,100');
    expect(screen.getByTestId('drawing')).toHaveTextContent('no');

    unmount();
    render(<KeyboardDrawingHarness disabled />);
    fireEvent.keyDown(screen.getByLabelText('keyboard drawing canvas'), { key: 'ArrowRight' });

    expect(screen.getByTestId('status')).toHaveTextContent('ready');
    expect(screen.getByTestId('cursor')).toHaveTextContent('100,100');
    expect(screen.getByTestId('info-clear-count')).toHaveTextContent('0');
  });
});
