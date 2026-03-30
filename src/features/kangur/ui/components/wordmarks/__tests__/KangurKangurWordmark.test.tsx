/**
 * @vitest-environment jsdom
 */

import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { KangurKangurWordmark } from '../KangurKangurWordmark';

describe('KangurKangurWordmark', () => {
  it('renders the Polish Kangur wordmark as a standalone SVG path composition', () => {
    const { container } = render(<KangurKangurWordmark />);
    const svg = container.querySelector('svg');

    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute('viewBox', '0 0 560 164');
    expect(svg?.querySelector('text')).toBeNull();
    expect(svg?.querySelectorAll('path').length).toBeGreaterThan(6);
  });

  it('keeps the intended responsive sizing classes for the Kangur header art', () => {
    const { container } = render(<KangurKangurWordmark />);
    const svg = container.querySelector('svg');

    expect(svg).toHaveClass('h-auto', 'w-full', 'max-w-[272px]', 'sm:max-w-[356px]');
  });

  it('uses deterministic SVG IDs for gradients and filters', () => {
    const { container } = render(<KangurKangurWordmark />);
    const svg = container.querySelector('svg');

    expect(svg?.querySelector('#kangur-kangur-wordmark-word-grad')).not.toBeNull();
    expect(svg?.querySelector('#kangur-kangur-wordmark-shadow')).not.toBeNull();
  });

  it('renders the translated English Kangur wordmark as SVG text', () => {
    const { container } = render(<KangurKangurWordmark label='Math Kangaroo' locale='en' />);
    const svg = container.querySelector('svg');
    const text = svg?.querySelector('text');

    expect(svg).not.toBeNull();
    expect(text).not.toBeNull();
    expect(text).toHaveTextContent('Math Kangaroo');
    expect(text).toHaveAttribute('font-size', '68');
    expect(text).not.toHaveAttribute('textLength');
    expect(text).not.toHaveAttribute('lengthAdjust');
  });

  it('renders the translated German Kangur wordmark as SVG text', () => {
    const { container } = render(<KangurKangurWordmark label='Mathe-Kanguru' locale='de' />);
    const svg = container.querySelector('svg');
    const text = svg?.querySelector('text');

    expect(svg).not.toBeNull();
    expect(text).not.toBeNull();
    expect(text).toHaveTextContent('Mathe-Kanguru');
    expect(text).toHaveAttribute('font-size', '68');
    expect(text).not.toHaveAttribute('textLength');
    expect(text).not.toHaveAttribute('lengthAdjust');
  });
});
