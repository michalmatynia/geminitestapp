'use client';

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useKangurFreeformDrawingTools } from '@/features/kangur/ui/components/drawing-engine/useKangurFreeformDrawingTools';

function FreeformToolsHarness({
  isCoarsePointer = false,
}: {
  isCoarsePointer?: boolean;
}): React.JSX.Element {
  const tools = useKangurFreeformDrawingTools({
    config: {
      colors: ['#111111', '#2563eb'],
      strokeWidths: [2, 4, 8],
    },
    isCoarsePointer,
  });

  return (
    <div>
      <button type='button' onClick={() => tools.selectColor('#2563eb')}>
        Color
      </button>
      <button type='button' onClick={() => tools.selectWidth(tools.strokeWidths[2] ?? 8)}>
        Width
      </button>
      <button type='button' onClick={tools.selectPen}>
        Pen
      </button>
      <button type='button' onClick={tools.selectEraser}>
        Eraser
      </button>
      <div data-testid='tool'>{tools.activeTool}</div>
      <div data-testid='color'>{tools.selectedColor}</div>
      <div data-testid='width'>{String(tools.selectedWidth)}</div>
      <div data-testid='stroke-width'>{String(tools.strokeMeta.width)}</div>
      <div data-testid='eraser'>{tools.isEraser ? 'yes' : 'no'}</div>
      <div data-testid='resolved-widths'>{tools.strokeWidths.join(',')}</div>
    </div>
  );
}

describe('useKangurFreeformDrawingTools', () => {
  it('switches back to pen when selecting colors or widths', () => {
    render(<FreeformToolsHarness />);

    fireEvent.click(screen.getByRole('button', { name: 'Eraser' }));
    expect(screen.getByTestId('tool')).toHaveTextContent('eraser');
    expect(screen.getByTestId('stroke-width')).toHaveTextContent('12');

    fireEvent.click(screen.getByRole('button', { name: 'Color' }));
    expect(screen.getByTestId('tool')).toHaveTextContent('pen');
    expect(screen.getByTestId('color')).toHaveTextContent('#2563eb');
    expect(screen.getByTestId('stroke-width')).toHaveTextContent('4');

    fireEvent.click(screen.getByRole('button', { name: 'Eraser' }));
    fireEvent.click(screen.getByRole('button', { name: 'Width' }));
    expect(screen.getByTestId('tool')).toHaveTextContent('pen');
    expect(screen.getByTestId('width')).toHaveTextContent('8');
    expect(screen.getByTestId('stroke-width')).toHaveTextContent('8');
  });

  it('expands stroke widths for coarse pointers and preserves the preferred width', () => {
    render(<FreeformToolsHarness isCoarsePointer />);

    expect(screen.getByTestId('resolved-widths')).toHaveTextContent('4,6,10');
    expect(screen.getByTestId('width')).toHaveTextContent('6');
  });
});
