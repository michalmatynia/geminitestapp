/**
 * @vitest-environment jsdom
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import type { JSX } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PointerDragProvider, POINTER_DRAG_RETURN_DURATION_MS, POINTER_DRAG_SETTLE_DURATION_MS } from './PointerDragProvider';
import { PointerDropZone, PointerDraggableBall } from './AddingBallGame.Shared';
import type { BallItem } from './types';

const { mobileInteractionLockMock, mobileInteractionUnlockMock } = vi.hoisted(() => ({
  mobileInteractionLockMock: vi.fn(),
  mobileInteractionUnlockMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => true,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurMobileInteractionScrollLock', () => ({
  useKangurMobileInteractionScrollLock: () => ({
    lock: mobileInteractionLockMock,
    unlock: mobileInteractionUnlockMock,
  }),
}));

const TEST_BALL: BallItem = {
  id: 'ball-1',
  num: 1,
  color: '#0ea5e9',
};

const mockRect = (x: number, y: number, width: number, height: number): DOMRect =>
  ({
    left: x,
    right: x + width,
    top: y,
    bottom: y + height,
    width,
    height,
    x,
    y,
    toJSON: () => ({}),
  }) as DOMRect;

function Harness({
  onDrop,
}: {
  onDrop: (ballId: string, sourceZoneId: string, destinationZoneId: string) => void;
}): JSX.Element {
  return (
    <PointerDragProvider onDrop={onDrop}>
      <div>
        <PointerDropZone id='pool' items={[TEST_BALL]} label='Pula' checked={false} correct={false} />
        <PointerDropZone id='target' items={[]} label='Cel' checked={false} correct={false} />
      </div>
    </PointerDragProvider>
  );
}

describe('PointerDragProvider physics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('locks mobile scroll for the whole pointer-drag lifecycle and unlocks after a valid drop settles', () => {
    vi.useFakeTimers();
    const onDrop = vi.fn();

    render(<Harness onDrop={onDrop} />);

    const dragButton = screen.getByRole('button', { name: 'Piłka: 1' });
    const targetZone = screen.getByTestId('adding-ball-target');

    dragButton.getBoundingClientRect = () => mockRect(10, 10, 64, 64);
    targetZone.getBoundingClientRect = () => mockRect(200, 100, 160, 88);

    act(() => {
      fireEvent.pointerDown(dragButton, { clientX: 42, clientY: 42, button: 0 });
    });

    expect(mobileInteractionLockMock).toHaveBeenCalledTimes(1);
    expect(mobileInteractionUnlockMock).not.toHaveBeenCalled();

    act(() => {
      fireEvent(window, new PointerEvent('pointermove', { clientX: 260, clientY: 144 }));
    });
    act(() => {
      fireEvent(window, new PointerEvent('pointerup', { clientX: 260, clientY: 144 }));
    });

    expect(screen.getByTestId('adding-ball-drag-overlay')).toHaveAttribute('data-phase', 'settling');
    expect(mobileInteractionUnlockMock).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(POINTER_DRAG_SETTLE_DURATION_MS);
    });

    expect(onDrop).toHaveBeenCalledWith('ball-1', 'pool', 'target');
    expect(mobileInteractionUnlockMock).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('waits for the settle phase before committing a valid drop', () => {
    vi.useFakeTimers();
    const onDrop = vi.fn();

    render(<Harness onDrop={onDrop} />);

    const dragButton = screen.getByRole('button', { name: 'Piłka: 1' });
    const targetZone = screen.getByTestId('adding-ball-target');

    dragButton.getBoundingClientRect = () => mockRect(10, 10, 64, 64);
    targetZone.getBoundingClientRect = () => mockRect(200, 100, 160, 88);

    act(() => {
      fireEvent.pointerDown(dragButton, { clientX: 42, clientY: 42, button: 0 });
    });
    act(() => {
      fireEvent(window, new PointerEvent('pointermove', { clientX: 260, clientY: 144 }));
    });
    act(() => {
      fireEvent(window, new PointerEvent('pointerup', { clientX: 260, clientY: 144 }));
    });

    expect(screen.getByTestId('adding-ball-drag-overlay')).toHaveAttribute('data-phase', 'settling');
    expect(onDrop).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(POINTER_DRAG_SETTLE_DURATION_MS);
    });

    expect(onDrop).toHaveBeenCalledWith('ball-1', 'pool', 'target');
    expect(screen.queryByTestId('adding-ball-drag-overlay')).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it('returns to the origin and cancels when dropped outside a zone', () => {
    vi.useFakeTimers();
    const onDrop = vi.fn();

    render(<Harness onDrop={onDrop} />);

    const dragButton = screen.getByRole('button', { name: 'Piłka: 1' });
    dragButton.getBoundingClientRect = () => mockRect(10, 10, 64, 64);

    act(() => {
      fireEvent.pointerDown(dragButton, { clientX: 42, clientY: 42, button: 0 });
    });
    act(() => {
      fireEvent(window, new PointerEvent('pointermove', { clientX: 520, clientY: 320 }));
    });
    act(() => {
      fireEvent(window, new PointerEvent('pointerup', { clientX: 520, clientY: 320 }));
    });

    expect(screen.getByTestId('adding-ball-drag-overlay')).toHaveAttribute('data-phase', 'returning');
    expect(onDrop).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(POINTER_DRAG_RETURN_DURATION_MS);
    });

    expect(onDrop).not.toHaveBeenCalled();
    expect(screen.queryByTestId('adding-ball-drag-overlay')).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it('unlocks mobile scroll when a pointer drag is cancelled', () => {
    vi.useFakeTimers();
    const onDrop = vi.fn();

    render(<Harness onDrop={onDrop} />);

    const dragButton = screen.getByRole('button', { name: 'Piłka: 1' });
    dragButton.getBoundingClientRect = () => mockRect(10, 10, 64, 64);

    act(() => {
      fireEvent.pointerDown(dragButton, { clientX: 42, clientY: 42, button: 0 });
    });

    expect(mobileInteractionLockMock).toHaveBeenCalledTimes(1);

    act(() => {
      fireEvent(window, new PointerEvent('pointercancel', { clientX: 42, clientY: 42 }));
    });

    expect(onDrop).not.toHaveBeenCalled();
    expect(screen.queryByTestId('adding-ball-drag-overlay')).not.toBeInTheDocument();
    expect(mobileInteractionUnlockMock).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
