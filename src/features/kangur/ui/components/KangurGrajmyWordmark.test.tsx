/**
 * @vitest-environment jsdom
 */

import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { KangurGrajmyWordmark } from '@/features/kangur/ui/components/KangurGrajmyWordmark';

describe('KangurGrajmyWordmark', () => {
  it('renders the Grajmy wordmark as a standalone SVG path composition', () => {
    const { container } = render(<KangurGrajmyWordmark />);
    const svg = container.querySelector('svg');

    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute('viewBox', '0 0 560 164');
    expect(svg?.querySelector('text')).toBeNull();
    expect(svg?.querySelectorAll('path').length).toBeGreaterThan(6);
  });

  it('keeps the intended responsive sizing classes for the Grajmy header art', () => {
    const { container } = render(<KangurGrajmyWordmark />);
    const svg = container.querySelector('svg');

    expect(svg).toHaveClass('h-auto', 'w-full', 'max-w-[272px]', 'sm:max-w-[356px]');
  });
});
