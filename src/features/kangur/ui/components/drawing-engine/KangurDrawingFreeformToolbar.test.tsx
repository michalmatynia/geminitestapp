'use client';

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { KangurDrawingFreeformToolbar } from '@/features/kangur/ui/components/drawing-engine/KangurDrawingFreeformToolbar';

describe('KangurDrawingFreeformToolbar', () => {
  it('renders the shared freeform controls and wires callbacks', () => {
    const onSelectColor = vi.fn();
    const onSelectWidth = vi.fn();
    const onSelectPen = vi.fn();
    const onSelectEraser = vi.fn();
    const onUndo = vi.fn();
    const onRedo = vi.fn();
    const onClear = vi.fn();

    render(
      <KangurDrawingFreeformToolbar
        canRedo={false}
        canUndo
        clearLabel='Clear'
        eraserLabel='Eraser'
        isCoarsePointer={false}
        onClear={onClear}
        onRedo={onRedo}
        onUndo={onUndo}
        penLabel='Pen'
        redoLabel='Redo'
        toolActions={{
          selectColor: onSelectColor,
          selectEraser: onSelectEraser,
          selectPen: onSelectPen,
          selectWidth: onSelectWidth,
        }}
        toolState={{
          colors: ['#111111', '#2563eb'],
          isEraser: false,
          selectedColor: '#111111',
          selectedWidth: 4,
          strokeWidths: [2, 4, 8],
        }}
        undoLabel='Undo'
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Kolor #2563eb' }));
    fireEvent.click(screen.getByRole('button', { name: 'Grubość 8px' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pen' }));
    fireEvent.click(screen.getByRole('button', { name: 'Eraser' }));
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));

    expect(onSelectColor).toHaveBeenCalledWith('#2563eb');
    expect(onSelectWidth).toHaveBeenCalledWith(8);
    expect(onSelectPen).toHaveBeenCalledTimes(1);
    expect(onSelectEraser).toHaveBeenCalledTimes(1);
    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Redo' })).toBeDisabled();
  });

  it('keeps coarse-pointer sizing on shared toolbar controls', () => {
    render(
      <KangurDrawingFreeformToolbar
        canRedo
        canUndo
        clearLabel='Clear'
        eraserLabel='Eraser'
        isCoarsePointer
        onClear={() => {}}
        onRedo={() => {}}
        onUndo={() => {}}
        penLabel='Pen'
        redoLabel='Redo'
        toolActions={{
          selectColor: () => {},
          selectEraser: () => {},
          selectPen: () => {},
          selectWidth: () => {},
        }}
        toolState={{
          colors: ['#2563eb'],
          isEraser: false,
          selectedColor: '#2563eb',
          selectedWidth: 4,
          strokeWidths: [4],
        }}
        undoLabel='Undo'
      />
    );

    expect(screen.getByRole('button', { name: 'Kolor #2563eb' })).toHaveClass('h-11', 'w-11');
    expect(screen.getByRole('button', { name: 'Pen' })).toHaveClass('h-11', 'w-11');
    expect(screen.getByRole('button', { name: 'Undo' })).toHaveClass('h-11', 'w-11');
  });
});
