import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { KangurDrawingUtilityActions } from './KangurDrawingUtilityActions';

describe('KangurDrawingUtilityActions', () => {
  it('renders shared history and export controls through one utility cluster', () => {
    const onRedo = vi.fn();
    const onUndo = vi.fn();
    const onExport = vi.fn();

    render(
      <KangurDrawingUtilityActions
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

  it('passes sizing, class names, and disabled state through to both sub-controls', () => {
    render(
      <KangurDrawingUtilityActions
        exportButtonClassName='export-button'
        exportClassName='export-cluster'
        exportDisabled
        exportLabel='Export PNG'
        historyButtonClassName='history-button'
        historyClassName='history-cluster'
        isCoarsePointer
        onExport={() => {}}
        onRedo={() => {}}
        onUndo={() => {}}
        redoDisabled
        redoLabel='Redo'
        size='sm'
        undoDisabled
        undoLabel='Undo'
      />
    );

    expect(screen.getByRole('button', { name: 'Undo' })).toHaveClass(
      'history-button'
    );
    expect(screen.getByRole('button', { name: 'Redo' })).toHaveClass(
      'history-button'
    );
    expect(screen.getByRole('button', { name: 'Export PNG' })).toHaveClass(
      'export-button'
    );
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Redo' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Export PNG' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Undo' }).parentElement).toHaveClass(
      'history-cluster'
    );
    expect(
      screen.getByRole('button', { name: 'Export PNG' }).parentElement
    ).toHaveClass('export-cluster');
  });
});
