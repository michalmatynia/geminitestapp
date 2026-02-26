import { fireEvent, render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { VectorCanvas } from '@/shared/ui/vector-canvas';

describe('VectorCanvas interactions', () => {
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
});
