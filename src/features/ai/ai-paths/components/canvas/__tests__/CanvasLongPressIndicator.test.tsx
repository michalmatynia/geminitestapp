import { render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { CanvasLongPressIndicator } from '../CanvasLongPressIndicator';

describe('CanvasLongPressIndicator', () => {
  it('renders the overlay shell with the expected positioning classes', () => {
    const { container } = render(
      <CanvasLongPressIndicator indicator={{ x: 120, y: 240, progress: 0.25 }} />
    );

    const indicator = container.firstElementChild as HTMLDivElement | null;

    expect(indicator).toBeTruthy();
    expect(indicator?.className).toContain('absolute');
    expect(indicator?.className).toContain('pointer-events-none');
    expect(indicator?.className).toContain('rounded-full');
    expect(indicator?.className).toContain('border-2');
  });

  it('maps indicator coordinates and progress into inline position, scale, and opacity', () => {
    const { container, rerender } = render(
      <CanvasLongPressIndicator indicator={{ x: 120, y: 240, progress: 0.25 }} />
    );

    const indicator = (): HTMLDivElement | null => container.firstElementChild as HTMLDivElement | null;

    expect(indicator()?.style.left).toBe('120px');
    expect(indicator()?.style.top).toBe('240px');
    expect(indicator()?.style.transform).toBe('translate(-50%, -50%) scale(0.25)');
    expect(Number.parseFloat(indicator()?.style.opacity ?? '')).toBeCloseTo(0.75);

    rerender(<CanvasLongPressIndicator indicator={{ x: 320, y: 160, progress: 0.8 }} />);

    expect(indicator()?.style.left).toBe('320px');
    expect(indicator()?.style.top).toBe('160px');
    expect(indicator()?.style.transform).toBe('translate(-50%, -50%) scale(0.8)');
    expect(Number.parseFloat(indicator()?.style.opacity ?? '')).toBeCloseTo(0.2);
  });
});
