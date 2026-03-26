'use client';

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { KangurManagedDrawingUtilityActions } from '@/features/kangur/ui/components/drawing-engine/KangurManagedDrawingUtilityActions';

describe('KangurManagedDrawingUtilityActions', () => {
  it('enables the shared controls when the drawing engine can use them', () => {
    const onExport = vi.fn();
    const onRedo = vi.fn();
    const onUndo = vi.fn();

    render(
      <KangurManagedDrawingUtilityActions
        canExport
        canRedo
        canUndo
        exportLabel='Export PNG'
        onExport={onExport}
        onRedo={onRedo}
        onUndo={onUndo}
        redoLabel='Redo'
        undoLabel='Undo'
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Redo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Export PNG' }));

    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(onRedo).toHaveBeenCalledTimes(1);
    expect(onExport).toHaveBeenCalledTimes(1);
  });

  it('derives disabled state from capability and board lock flags', () => {
    render(
      <KangurManagedDrawingUtilityActions
        canExport={false}
        canRedo
        canUndo={false}
        exportLabel='Export PNG'
        exportLocked
        historyLocked
        onExport={() => {}}
        onRedo={() => {}}
        onUndo={() => {}}
        redoLabel='Redo'
        undoLabel='Undo'
      />
    );

    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Redo' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Export PNG' })).toBeDisabled();
  });
});
