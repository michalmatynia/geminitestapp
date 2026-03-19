/**
 * @vitest-environment jsdom
 */

import { act, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { KangurDragDropContext } from './KangurDragDropContext';

let capturedDragStart: ((...args: unknown[]) => void) | null = null;
let capturedDragEnd: ((...args: unknown[]) => void) | null = null;

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
    onDragStart,
    onDragEnd,
  }: {
    children: React.ReactNode;
    onDragStart?: (...args: unknown[]) => void;
    onDragEnd?: (...args: unknown[]) => void;
  }) => {
    capturedDragStart = onDragStart || null;
    capturedDragEnd = onDragEnd || null;
    return <div>{children}</div>;
  },
}));

describe('KangurDragDropContext', () => {
  beforeEach(() => {
    lockMock.mockClear();
    unlockMock.mockClear();
    capturedDragStart = null;
    capturedDragEnd = null;
  });

  it('locks mobile scroll while dragging and unlocks after drop', () => {
    const customDragStart = vi.fn();
    const customDragEnd = vi.fn();

    render(
      <KangurDragDropContext onDragStart={customDragStart} onDragEnd={customDragEnd}>
        <div data-testid='child' />
      </KangurDragDropContext>
    );

    act(() => {
      capturedDragStart?.({});
    });

    expect(lockMock).toHaveBeenCalledTimes(1);
    expect(customDragStart).toHaveBeenCalledTimes(1);

    act(() => {
      capturedDragEnd?.({});
    });

    expect(unlockMock).toHaveBeenCalledTimes(1);
    expect(customDragEnd).toHaveBeenCalledTimes(1);
  });
});
