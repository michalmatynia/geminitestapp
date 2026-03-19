import { render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { CanvasSelectionMarquee } from '../CanvasSelectionMarquee';

describe('CanvasSelectionMarquee', () => {
  it('renders the marquee shell with the expected visual classes', () => {
    const { container } = render(
      <CanvasSelectionMarquee rect={{ left: 24, top: 48, width: 160, height: 96 }} />
    );

    const marquee = container.firstElementChild as HTMLDivElement | null;

    expect(marquee).toBeTruthy();
    expect(marquee?.className).toContain('absolute');
    expect(marquee?.className).toContain('pointer-events-none');
    expect(marquee?.className).toContain('border-blue-500');
    expect(marquee?.className).toContain('bg-blue-500/10');
  });

  it('maps the selection rect into inline position and size styles', () => {
    const { container, rerender } = render(
      <CanvasSelectionMarquee rect={{ left: 24, top: 48, width: 160, height: 96 }} />
    );

    const marquee = (): HTMLDivElement | null => container.firstElementChild as HTMLDivElement | null;

    expect(marquee()?.style.left).toBe('24px');
    expect(marquee()?.style.top).toBe('48px');
    expect(marquee()?.style.width).toBe('160px');
    expect(marquee()?.style.height).toBe('96px');

    rerender(<CanvasSelectionMarquee rect={{ left: 12, top: 18, width: 320, height: 144 }} />);

    expect(marquee()?.style.left).toBe('12px');
    expect(marquee()?.style.top).toBe('18px');
    expect(marquee()?.style.width).toBe('320px');
    expect(marquee()?.style.height).toBe('144px');
  });
});
