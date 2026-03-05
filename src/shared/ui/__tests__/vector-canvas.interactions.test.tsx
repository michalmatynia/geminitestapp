import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeAll, afterAll } from 'vitest';

import { VectorCanvas } from '@/shared/ui/vector-canvas';

describe('VectorCanvas interactions', () => {
  const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;

  beforeAll(() => {
    Element.prototype.getBoundingClientRect = vi.fn(() => ({
      width: 800,
      height: 600,
      top: 0,
      left: 0,
      bottom: 600,
      right: 800,
      x: 0,
      y: 0,
      toJSON: () => {},
    }));
  });

  afterAll(() => {
    Element.prototype.getBoundingClientRect = originalGetBoundingClientRect;
  });

  it('starts panning on left drag when select tool is active and selection is disabled', async () => {
    const { container } = render(
      <div style={{ width: 800, height: 600 }}>
        <VectorCanvas
          src='data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='
          tool='select'
          selectionEnabled={false}
          shapes={[]}
          activeShapeId={null}
          selectedPointIndex={null}
          onChange={vi.fn()}
          onSelectShape={vi.fn()}
          brushRadius={16}
          allowWithoutImage
        />
      </div>
    );

    const canvas = container.querySelector('canvas');
    expect(canvas).not.toBeNull();
    expect(canvas).not.toHaveClass('cursor-grabbing');

    fireEvent.mouseDown(canvas as HTMLCanvasElement, {
      button: 0,
      clientX: 120,
      clientY: 140,
    });

    await waitFor(() => {
      expect(canvas).toHaveClass('cursor-grabbing');
    });

    fireEvent.mouseUp(canvas as HTMLCanvasElement);

    await waitFor(() => {
      expect(canvas).not.toHaveClass('cursor-grabbing');
    });
  });

  it('toggles center guides overlay when showCenterGuides changes', () => {
    const { queryByTestId, rerender } = render(
      <div style={{ width: 800, height: 600 }}>
        <VectorCanvas
          src='data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='
          tool='select'
          selectionEnabled={false}
          showCenterGuides={false}
          shapes={[]}
          activeShapeId={null}
          selectedPointIndex={null}
          onChange={vi.fn()}
          onSelectShape={vi.fn()}
          brushRadius={16}
          allowWithoutImage
        />
      </div>
    );

    expect(queryByTestId('vector-canvas-center-guides')).toBeNull();

    rerender(
      <div style={{ width: 800, height: 600 }}>
        <VectorCanvas
          src='data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='
          tool='select'
          selectionEnabled={false}
          showCenterGuides
          shapes={[]}
          activeShapeId={null}
          selectedPointIndex={null}
          onChange={vi.fn()}
          onSelectShape={vi.fn()}
          brushRadius={16}
          allowWithoutImage
        />
      </div>
    );

    expect(queryByTestId('vector-canvas-center-guides')).not.toBeNull();
    expect(queryByTestId('vector-canvas-center-guides-vertical')).not.toBeNull();
    expect(queryByTestId('vector-canvas-center-guides-horizontal')).not.toBeNull();
  });

  it('captures wheel events to prevent parent scroll chaining while zooming', () => {
    const { container } = render(
      <div data-testid='wheel-parent' style={{ width: 800, height: 600 }}>
        <VectorCanvas
          src='data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='
          tool='select'
          selectionEnabled={false}
          shapes={[]}
          activeShapeId={null}
          selectedPointIndex={null}
          onChange={vi.fn()}
          onSelectShape={vi.fn()}
          brushRadius={16}
          allowWithoutImage
        />
      </div>
    );

    const wheelParent = container.querySelector('[data-testid="wheel-parent"]') as HTMLDivElement;
    const wheelParentListener = vi.fn();
    wheelParent.addEventListener('wheel', wheelParentListener);

    const canvasRoot = container.querySelector('[data-vector-canvas-root="true"]');
    expect(canvasRoot).not.toBeNull();

    const wheelEvent = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: 120,
      deltaMode: 0,
    });

    act(() => {
      canvasRoot?.dispatchEvent(wheelEvent);
    });

    expect(wheelEvent.defaultPrevented).toBe(true);
    expect(wheelParentListener).not.toHaveBeenCalled();
  });
});
