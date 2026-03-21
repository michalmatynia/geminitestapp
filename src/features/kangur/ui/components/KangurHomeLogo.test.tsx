/**
 * @vitest-environment jsdom
 */

import { render } from '@/__tests__/test-utils';
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

  it('uses deterministic SVG IDs so hydration does not depend on hook ordering', () => {
    const { container } = render(<KangurHomeLogo idPrefix='loader logo' />);
    const svg = container.querySelector('svg');

    expect(svg?.querySelector('#loader-logo-word-grad')).not.toBeNull();
    expect(svg?.querySelector('#loader-logo-shadow')).not.toBeNull();
    expect(svg?.querySelector('g')).toHaveAttribute('filter', 'url(#loader-logo-shadow)');
  });
});
