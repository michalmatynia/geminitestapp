/**
 * @vitest-environment jsdom
 */

import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { KangurGrajmyWordmark } from '@/features/kangur/ui/components/KangurGrajmyWordmark';

describe('KangurGrajmyWordmark', () => {
  it('renders the Polish Grajmy wordmark as a standalone SVG path composition', () => {
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

  it('uses deterministic SVG IDs for gradients and filters', () => {
    const { container } = render(<KangurGrajmyWordmark />);
    const svg = container.querySelector('svg');

    expect(svg?.querySelector('#kangur-grajmy-wordmark-word-grad')).not.toBeNull();
    expect(svg?.querySelector('#kangur-grajmy-wordmark-shadow')).not.toBeNull();
  });

  it('renders the translated English play wordmark as SVG text', () => {
    const { container } = render(<KangurGrajmyWordmark label="Let's play!" locale='en' />);
    const svg = container.querySelector('svg');
    const text = svg?.querySelector('text');

    expect(svg).not.toBeNull();
    expect(text).not.toBeNull();
    expect(text).toHaveTextContent("Let's play!");
    expect(text).toHaveAttribute('font-size', '68');
    expect(text).not.toHaveAttribute('textLength');
    expect(text).not.toHaveAttribute('lengthAdjust');
  });

  it("renders the translated German play wordmark as SVG text", () => {
    const { container } = render(<KangurGrajmyWordmark label="Los geht's!" locale='de' />);
    const svg = container.querySelector('svg');
    const text = svg?.querySelector('text');

    expect(svg).not.toBeNull();
    expect(text).not.toBeNull();
    expect(text).toHaveTextContent("Los geht's!");
    expect(text).toHaveAttribute('font-size', '68');
    expect(text).not.toHaveAttribute('textLength');
    expect(text).not.toHaveAttribute('lengthAdjust');
  });
});
