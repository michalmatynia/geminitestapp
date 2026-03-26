/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { lockMock, unlockMock } = vi.hoisted(() => ({
  lockMock: vi.fn(),
  unlockMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurMobileInteractionScrollLock', () => ({
  useKangurMobileInteractionScrollLock: () => ({
    lock: lockMock,
    unlock: unlockMock,
  }),
}));

import { useKangurCanvasTouchLock } from '@/features/kangur/ui/hooks/useKangurCanvasTouchLock';

function SvgTouchLockHarness({
  enabled = true,
  initialTouchAction,
}: {
  enabled?: boolean;
  initialTouchAction?: string;
}): React.JSX.Element {
  const svgRef = useRef<SVGSVGElement | null>(null);
  useKangurCanvasTouchLock(svgRef, { enabled });

  return (
    <svg
      ref={svgRef}
      aria-label='Touch lock surface'
      style={initialTouchAction ? { touchAction: initialTouchAction } : undefined}
      viewBox='0 0 360 140'
    />
  );
}

describe('useKangurCanvasTouchLock', () => {
  const originalInnerWidth = window.innerWidth;

  beforeEach(() => {
    lockMock.mockReset();
    unlockMock.mockReset();
    Object.defineProperty(window, 'innerWidth', {
      value: 390,
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      value: originalInnerWidth,
      configurable: true,
      writable: true,
    });
  });

  it('locks and unlocks scrolling for svg drawing surfaces', () => {
    render(<SvgTouchLockHarness />);

    const surface = screen.getByLabelText('Touch lock surface');
    expect(surface.style.touchAction).toBe('none');

    fireEvent.pointerDown(surface);
    fireEvent.pointerUp(surface);

    expect(lockMock).toHaveBeenCalledTimes(1);
    expect(unlockMock).toHaveBeenCalledTimes(1);
  });

  it('restores the previous touch action when the surface unmounts', () => {
    const view = render(<SvgTouchLockHarness initialTouchAction='pan-y' />);

    const surface = screen.getByLabelText('Touch lock surface');
    expect(surface.style.touchAction).toBe('none');

    fireEvent.pointerDown(surface);
    expect(lockMock).toHaveBeenCalledTimes(1);

    view.unmount();

    expect(unlockMock).toHaveBeenCalledTimes(1);
    expect(surface.style.touchAction).toBe('pan-y');
  });

  it('does nothing when disabled', () => {
    render(<SvgTouchLockHarness enabled={false} initialTouchAction='manipulation' />);

    const surface = screen.getByLabelText('Touch lock surface');
    expect(surface.style.touchAction).toBe('manipulation');

    fireEvent.pointerDown(surface);
    fireEvent.pointerUp(surface);

    expect(lockMock).not.toHaveBeenCalled();
    expect(unlockMock).not.toHaveBeenCalled();
  });
});
