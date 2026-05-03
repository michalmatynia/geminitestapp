// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LiveScripterPreview } from './LiveScripterPreview';

const frame = {
  dataUrl: 'data:image/png;base64,ZmFrZQ==',
  width: 1280,
  height: 800,
} as const;

class MockImage {
  onload: (() => void) | null = null;

  set src(_value: string) {
    this.onload?.();
  }
}

describe('LiveScripterPreview', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      clearRect: vi.fn(),
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    vi.stubGlobal('Image', MockImage);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('captures preview wheel events in drive mode without bubbling to the page', () => {
    const onDriveScroll = vi.fn();
    const pageWheelListener = vi.fn();
    const { container } = render(
      <div>
        <LiveScripterPreview
          frame={frame}
          pickedElement={null}
          mode='drive'
          status='live'
          onDriveClick={vi.fn()}
          onPickAt={vi.fn()}
          onDriveScroll={onDriveScroll}
        />
      </div>
    );

    const pageShell = container.firstElementChild as HTMLDivElement;
    pageShell.addEventListener('wheel', pageWheelListener);

    const canvas = screen.getByLabelText('Live website preview');
    const event = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaX: 12,
      deltaY: 240,
    });

    const dispatchResult = canvas.dispatchEvent(event);

    expect(dispatchResult).toBe(false);
    expect(event.defaultPrevented).toBe(true);
    expect(onDriveScroll).toHaveBeenCalledWith(12, 240);
    expect(pageWheelListener).not.toHaveBeenCalled();
  });

  it('leaves wheel events alone in pick mode', () => {
    const onDriveScroll = vi.fn();
    const pageWheelListener = vi.fn();
    const { container } = render(
      <div>
        <LiveScripterPreview
          frame={frame}
          pickedElement={null}
          mode='pick'
          status='live'
          onDriveClick={vi.fn()}
          onPickAt={vi.fn()}
          onDriveScroll={onDriveScroll}
        />
      </div>
    );

    const pageShell = container.firstElementChild as HTMLDivElement;
    pageShell.addEventListener('wheel', pageWheelListener);

    const canvas = screen.getByLabelText('Live website preview');
    const event = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: 180,
    });

    const dispatchResult = canvas.dispatchEvent(event);

    expect(dispatchResult).toBe(true);
    expect(event.defaultPrevented).toBe(false);
    expect(onDriveScroll).not.toHaveBeenCalled();
    expect(pageWheelListener).toHaveBeenCalledTimes(1);
  });
});
