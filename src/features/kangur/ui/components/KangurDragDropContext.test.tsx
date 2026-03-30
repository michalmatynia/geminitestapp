/**
 * @vitest-environment jsdom
 */

import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { KangurDragDropContext, renderKangurDragPreview } from './KangurDragDropContext';

let capturedDragStart: ((...args: unknown[]) => void) | null = null;
let capturedDragEnd: ((...args: unknown[]) => void) | null = null;
let capturedBeforeDragStart: ((...args: unknown[]) => void) | null = null;

const lockMock = vi.fn();
const unlockMock = vi.fn();
let isInteractionLocked = false;

vi.mock('@/features/kangur/ui/hooks/useKangurMobileInteractionScrollLock', () => {
  return {
    useKangurMobileInteractionScrollLock: () => ({
      lock: () => {
        if (isInteractionLocked) {
          return;
        }
        isInteractionLocked = true;
        lockMock();
      },
      unlock: () => {
        if (!isInteractionLocked) {
          return;
        }
        isInteractionLocked = false;
        unlockMock();
      },
    }),
  };
});

vi.mock('@hello-pangea/dnd', () => ({
  DragDropContext: ({
    children,
    onBeforeDragStart,
    onDragStart,
    onDragEnd,
  }: {
    children: React.ReactNode;
    onBeforeDragStart?: (...args: unknown[]) => void;
    onDragStart?: (...args: unknown[]) => void;
    onDragEnd?: (...args: unknown[]) => void;
  }) => {
    capturedBeforeDragStart = onBeforeDragStart || null;
    capturedDragStart = onDragStart || null;
    capturedDragEnd = onDragEnd || null;
    return <div>{children}</div>;
  },
}));

describe('KangurDragDropContext', () => {
  beforeEach(() => {
    lockMock.mockClear();
    unlockMock.mockClear();
    isInteractionLocked = false;
    capturedBeforeDragStart = null;
    capturedDragStart = null;
    capturedDragEnd = null;
  });

  it('locks mobile scroll on touch press against a drag handle before drag start fires', () => {
    render(
      <KangurDragDropContext>
        <button data-rfd-drag-handle-draggable-id='token-1' type='button'>
          Drag handle
        </button>
      </KangurDragDropContext>
    );

    const didDispatch = fireEvent.touchStart(screen.getByRole('button', { name: 'Drag handle' }));

    expect(didDispatch).toBe(false);
    expect(lockMock).toHaveBeenCalledTimes(1);

    fireEvent.touchEnd(document);

    expect(unlockMock).toHaveBeenCalledTimes(1);
  });

  it('does not lock mobile scroll for touches outside drag handles', () => {
    render(
      <KangurDragDropContext>
        <button type='button'>Regular button</button>
      </KangurDragDropContext>
    );

    const didDispatch = fireEvent.touchStart(screen.getByRole('button', { name: 'Regular button' }));
    fireEvent.touchEnd(document);

    expect(didDispatch).toBe(true);
    expect(lockMock).not.toHaveBeenCalled();
    expect(unlockMock).not.toHaveBeenCalled();
  });

  it('locks mobile scroll for touch pointer presses on drag handles', () => {
    render(
      <KangurDragDropContext>
        <button data-rfd-drag-handle-draggable-id='token-2' type='button'>
          Pointer drag handle
        </button>
      </KangurDragDropContext>
    );

    const didDispatch = fireEvent.pointerDown(screen.getByRole('button', { name: 'Pointer drag handle' }), {
      pointerType: 'touch',
    });

    expect(didDispatch).toBe(false);
    expect(lockMock).toHaveBeenCalledTimes(1);

    fireEvent.pointerUp(document, { pointerType: 'touch' });

    expect(unlockMock).toHaveBeenCalledTimes(1);
  });

  it('unlocks mobile scroll when a touch interaction is cancelled', () => {
    render(
      <KangurDragDropContext>
        <button data-rfd-drag-handle-draggable-id='token-4' type='button'>
          Cancelled drag handle
        </button>
      </KangurDragDropContext>
    );

    fireEvent.touchStart(screen.getByRole('button', { name: 'Cancelled drag handle' }));
    expect(lockMock).toHaveBeenCalledTimes(1);

    fireEvent.touchCancel(document);
    expect(unlockMock).toHaveBeenCalledTimes(1);
  });

  it('unlocks mobile scroll on unmount after an active touch interaction', () => {
    const { unmount } = render(
      <KangurDragDropContext>
        <button data-rfd-drag-handle-draggable-id='token-5' type='button'>
          Unmounted drag handle
        </button>
      </KangurDragDropContext>
    );

    fireEvent.touchStart(screen.getByRole('button', { name: 'Unmounted drag handle' }));
    expect(lockMock).toHaveBeenCalledTimes(1);

    unmount();
    expect(unlockMock).toHaveBeenCalledTimes(1);
  });

  it('does not lock mobile scroll for mouse pointer presses on drag handles', () => {
    render(
      <KangurDragDropContext>
        <button data-rfd-drag-handle-draggable-id='token-3' type='button'>
          Mouse drag handle
        </button>
      </KangurDragDropContext>
    );

    const didDispatch = fireEvent.pointerDown(screen.getByRole('button', { name: 'Mouse drag handle' }), {
      pointerType: 'mouse',
    });
    fireEvent.pointerUp(document, { pointerType: 'mouse' });

    expect(didDispatch).toBe(true);
    expect(lockMock).not.toHaveBeenCalled();
    expect(unlockMock).not.toHaveBeenCalled();
  });

  it('locks mobile scroll before dragging begins and unlocks after drop', () => {
    const customBeforeDragStart = vi.fn();
    const customDragStart = vi.fn();
    const customDragEnd = vi.fn();

    render(
      <KangurDragDropContext
        onBeforeDragStart={customBeforeDragStart}
        onDragStart={customDragStart}
        onDragEnd={customDragEnd}
      >
        <div data-testid='child' />
      </KangurDragDropContext>
    );

    act(() => {
      capturedBeforeDragStart?.({});
    });

    expect(lockMock).toHaveBeenCalledTimes(1);
    expect(customBeforeDragStart).toHaveBeenCalledTimes(1);

    act(() => {
      capturedDragStart?.({});
    });

    expect(customDragStart).toHaveBeenCalledTimes(1);

    act(() => {
      capturedDragEnd?.({});
    });

    expect(unlockMock).toHaveBeenCalledTimes(1);
    expect(customDragEnd).toHaveBeenCalledTimes(1);
  });

  it('renders a drag preview into document.body only while dragging', () => {
    const PreviewHarness = ({ isDragging }: { isDragging: boolean }) =>
      renderKangurDragPreview(<div>drag-preview</div>, isDragging);

    const { container, rerender } = render(<PreviewHarness isDragging={false} />);

    expect(within(container).getByText('drag-preview')).toBeInTheDocument();

    rerender(<PreviewHarness isDragging />);

    expect(within(container).queryByText('drag-preview')).not.toBeInTheDocument();
    expect(within(document.body).getByText('drag-preview')).toBeInTheDocument();
  });
});
