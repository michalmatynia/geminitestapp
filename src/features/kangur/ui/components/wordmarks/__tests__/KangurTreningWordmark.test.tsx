/**
 * @vitest-environment jsdom
 */

import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { KangurTreningWordmark } from '../KangurTreningWordmark';

describe('KangurTreningWordmark', () => {
  it('renders the Polish Trening wordmark as a standalone SVG path composition', () => {
    const { container } = render(<KangurTreningWordmark />);
    const svg = container.querySelector('svg');

    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute('viewBox', '0 0 560 164');
    expect(svg?.querySelector('text')).toBeNull();
    expect(svg?.querySelectorAll('path').length).toBeGreaterThan(6);
  });

  it('keeps the intended responsive sizing classes for the Trening header art', () => {
    const { container } = render(<KangurTreningWordmark />);
    const svg = container.querySelector('svg');

    expect(svg).toHaveClass('h-auto', 'w-full', 'max-w-[272px]', 'sm:max-w-[356px]');
  });

  it('uses deterministic SVG IDs for gradients and filters', () => {
    const { container } = render(<KangurTreningWordmark />);
    const svg = container.querySelector('svg');

    expect(svg?.querySelector('#kangur-trening-wordmark-word-grad')).not.toBeNull();
    expect(svg?.querySelector('#kangur-trening-wordmark-shadow')).not.toBeNull();
  });

  it('renders the translated English training wordmark as SVG text', () => {
    const { container } = render(<KangurTreningWordmark label='Training' locale='en' />);
    const svg = container.querySelector('svg');
    const text = svg?.querySelector('text');

    expect(svg).not.toBeNull();
    expect(text).not.toBeNull();
    expect(text).toHaveTextContent('Training');
    expect(text).toHaveAttribute('font-size', '68');
    expect(text).not.toHaveAttribute('textLength');
    expect(text).not.toHaveAttribute('lengthAdjust');
  });

  it('renders the translated German training wordmark as SVG text', () => {
    const { container } = render(<KangurTreningWordmark label='Training' locale='de' />);
    const svg = container.querySelector('svg');
    const text = svg?.querySelector('text');

    expect(svg).not.toBeNull();
    expect(text).not.toBeNull();
    expect(text).toHaveTextContent('Training');
    expect(text).toHaveAttribute('font-size', '68');
    expect(text).not.toHaveAttribute('textLength');
    expect(text).not.toHaveAttribute('lengthAdjust');
  });
});
