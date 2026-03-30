'use client';

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { KangurDrawingHistoryActions } from '@/features/kangur/ui/components/drawing-engine/KangurDrawingHistoryActions';

describe('KangurDrawingHistoryActions', () => {
  it('renders undo and redo actions and wires them independently', () => {
    const onUndo = vi.fn();
    const onRedo = vi.fn();

    render(
      <KangurDrawingHistoryActions
        onRedo={onRedo}
        onUndo={onUndo}
        redoLabel='Redo'
        undoLabel='Undo'
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Redo' }));

    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(onRedo).toHaveBeenCalledTimes(1);
  });

  it('applies coarse-pointer sizing and disabled states', () => {
    render(
      <KangurDrawingHistoryActions
        buttonClassName='w-full sm:flex-1'
        isCoarsePointer
        onRedo={() => {}}
        onUndo={() => {}}
        redoDisabled
        redoLabel='Redo'
        undoDisabled
        undoLabel='Undo'
      />
    );

    expect(screen.getByRole('button', { name: 'Undo' })).toHaveClass('min-h-11');
    expect(screen.getByRole('button', { name: 'Redo' })).toHaveClass('min-h-11');
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Redo' })).toBeDisabled();
  });

  it('supports icon-only rendering while keeping accessible labels', () => {
    render(
      <KangurDrawingHistoryActions
        display='icon'
        onRedo={() => {}}
        onUndo={() => {}}
        redoLabel='Redo'
        undoLabel='Undo'
        variant='ghost'
      />
    );

    expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Redo' })).toBeInTheDocument();
    expect(screen.getAllByText(/Undo|Redo/)).toHaveLength(2);
  });
});
