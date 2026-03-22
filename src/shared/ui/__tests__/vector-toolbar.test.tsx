// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { VectorToolbar } from '@/shared/ui/vector-canvas.rendering';

describe('VectorToolbar', () => {
  it('renders tool and action controls directly and preserves the toolbar contract', () => {
    const onSelectTool = vi.fn();
    const onUndo = vi.fn();
    const onClose = vi.fn();
    const onDetach = vi.fn();
    const onClear = vi.fn();

    const { container, rerender } = render(
      <VectorToolbar
        tool='select'
        onSelectTool={onSelectTool}
        onUndo={onUndo}
        onClose={onClose}
        onDetach={onDetach}
        onClear={onClear}
        disableUndo
        className='toolbar-shell'
      />
    );

    const toolbar = container.firstElementChild as HTMLDivElement | null;
    expect(toolbar).not.toBeNull();
    expect(toolbar?.className).toContain('toolbar-shell');

    const selectButton = screen.getByRole('button', { name: 'Select tool' });
    const polygonButton = screen.getByRole('button', { name: 'Polygon tool' });
    const undoButton = screen.getByRole('button', { name: 'Undo last point' });
    const closeButton = screen.getByRole('button', { name: 'Close polygon' });
    const detachButton = screen.getByRole('button', { name: 'Detach polygon' });
    const clearButton = screen.getByRole('button', { name: 'Clear shapes' });

    expect(selectButton).toHaveAttribute('aria-pressed', 'true');
    expect(undoButton).toBeDisabled();

    fireEvent.click(polygonButton);
    fireEvent.click(closeButton);
    fireEvent.click(detachButton);
    fireEvent.click(clearButton);
    fireEvent.click(undoButton);

    expect(onSelectTool).toHaveBeenCalledWith('polygon');
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onDetach).toHaveBeenCalledTimes(1);
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(onUndo).not.toHaveBeenCalled();

    rerender(
      <VectorToolbar
        tool='polygon'
        onSelectTool={onSelectTool}
        className='toolbar-shell'
      />
    );

    expect(screen.getByRole('button', { name: 'Polygon tool' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.queryByRole('button', { name: 'Undo last point' })).toBeNull();
    expect(toolbar?.querySelector('.bg-border')).toBeNull();
  });
});
