/**
 * @vitest-environment jsdom
 */

import { act, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { KangurDragDropContext, renderKangurDragPreview } from './KangurDragDropContext';

let capturedDragStart: ((...args: unknown[]) => void) | null = null;
let capturedDragEnd: ((...args: unknown[]) => void) | null = null;
let capturedBeforeDragStart: ((...args: unknown[]) => void) | null = null;

const lockMock = vi.fn();
const unlockMock = vi.fn();

vi.mock('@/features/kangur/ui/hooks/useKangurMobileInteractionScrollLock', () => {
  return {
    useKangurMobileInteractionScrollLock: () => ({
      lock: lockMock,
      unlock: unlockMock,
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
    capturedBeforeDragStart = null;
    capturedDragStart = null;
    capturedDragEnd = null;
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
