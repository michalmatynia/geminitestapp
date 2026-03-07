/**
 * @vitest-environment jsdom
 */

import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { KangurHomeLogo } from '@/features/kangur/ui/components/KangurHomeLogo';

describe('KangurHomeLogo', () => {
  it('uses the cropped SVG viewBox so the logo stays tightly framed in the nav pill', () => {
    const { container } = render(<KangurHomeLogo />);
    const svg = container.querySelector('svg');

    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute('viewBox', '20 24 710 182');
  });

  it('keeps the intended responsive logo sizing classes', () => {
    const { container } = render(<KangurHomeLogo />);
    const svg = container.querySelector('svg');

    expect(svg).toHaveClass('h-[24px]', 'w-auto', 'sm:h-[28px]');
  });
});
