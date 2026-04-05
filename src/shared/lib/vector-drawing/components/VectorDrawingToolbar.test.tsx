/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getDocumentationTooltipMock,
  useOptionalVectorDrawingStateMock,
  useOptionalVectorDrawingActionsMock,
} = vi.hoisted(() => ({
  getDocumentationTooltipMock: vi.fn(),
  useOptionalVectorDrawingStateMock: vi.fn(),
  useOptionalVectorDrawingActionsMock: vi.fn(),
}));

vi.mock('@/shared/contracts/documentation', () => ({
  DOCUMENTATION_MODULE_IDS: {
    vectorDrawing: 'vector-drawing',
  },
}));

vi.mock('@/shared/lib/documentation/tooltips', () => ({
  getDocumentationTooltip: (...args: unknown[]) => getDocumentationTooltipMock(...args),
}));

vi.mock('@/shared/ui', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type='button' onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
  Tooltip: ({
    content,
    children,
  }: {
    content: React.ReactNode;
    children: React.ReactNode;
  }) => <div data-tooltip={String(content)}>{children}</div>,
}));

vi.mock('../context/VectorDrawingContext', () => ({
  useOptionalVectorDrawingState: () => useOptionalVectorDrawingStateMock(),
  useOptionalVectorDrawingActions: () => useOptionalVectorDrawingActionsMock(),
}));

import { VectorDrawingToolbar } from './VectorDrawingToolbar';

describe('VectorDrawingToolbar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getDocumentationTooltipMock.mockReturnValue(null);
  });

  it('renders an empty placeholder without a resolved tool or selection handler', () => {
    useOptionalVectorDrawingStateMock.mockReturnValue(null);
    useOptionalVectorDrawingActionsMock.mockReturnValue(null);

    const { container } = render(<VectorDrawingToolbar />);

    expect(container.firstChild).toBeInstanceOf(HTMLDivElement);
    expect(screen.queryByRole('button', { name: 'Select (V)' })).not.toBeInTheDocument();
  });

  it('hydrates from context, renders actions, and fires the matching handlers', () => {
    const setTool = vi.fn();
    const onUndo = vi.fn();
    const onRedo = vi.fn();
    const onClear = vi.fn();
    const onCloseShape = vi.fn();
    const onDetach = vi.fn();
    const onSmooth = vi.fn();
    const onSimplify = vi.fn();

    useOptionalVectorDrawingStateMock.mockReturnValue({
      tool: 'polygon',
      disableUndo: false,
      disableRedo: true,
      disableClear: false,
      disableClose: false,
      disableDetach: false,
      disableSmooth: false,
      disableSimplify: false,
    });
    useOptionalVectorDrawingActionsMock.mockReturnValue({
      setTool,
      onUndo,
      onRedo,
      onClear,
      onCloseShape,
      onDetach,
      onSmooth,
      onSimplify,
    });

    render(<VectorDrawingToolbar variant='min' showSelectTool={false} className='toolbar-shell' />);

    fireEvent.click(screen.getByRole('button', { name: 'Pen' }));
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear shapes' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close polygon' }));
    fireEvent.click(screen.getByRole('button', { name: 'Detach polygon' }));
    fireEvent.click(screen.getByRole('button', { name: 'Smooth path' }));
    fireEvent.click(screen.getByRole('button', { name: 'Simplify path' }));

    expect(setTool).toHaveBeenCalledWith('polygon');
    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(onRedo).not.toHaveBeenCalled();
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(onCloseShape).toHaveBeenCalledTimes(1);
    expect(onDetach).toHaveBeenCalledTimes(1);
    expect(onSmooth).toHaveBeenCalledTimes(1);
    expect(onSimplify).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Redo' })).toBeDisabled();
  });
});
