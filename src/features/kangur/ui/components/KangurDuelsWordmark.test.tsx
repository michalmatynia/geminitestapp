/**
 * @vitest-environment jsdom
 */

import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { KangurDuelsWordmark } from '@/features/kangur/ui/components/wordmarks/KangurDuelsWordmark';

describe('KangurDuelsWordmark', () => {
  it('renders the Polish duels wordmark as SVG text', () => {
    const { container } = render(<KangurDuelsWordmark />);
    const svg = container.querySelector('svg');
    const text = svg?.querySelector('text');

    expect(svg).not.toBeNull();
    expect(text).not.toBeNull();
    expect(text).toHaveTextContent('Lobby pojedynkow');
    expect(text).toHaveAttribute('font-size', '68');
    expect(text).not.toHaveAttribute('textLength');
    expect(text).not.toHaveAttribute('lengthAdjust');
  });

  it('renders the translated German duels wordmark as SVG text', () => {
    const { container } = render(<KangurDuelsWordmark label='Duell-Lobby' locale='de' />);
    const svg = container.querySelector('svg');
    const text = svg?.querySelector('text');

    expect(svg).not.toBeNull();
    expect(text).not.toBeNull();
    expect(text).toHaveTextContent('Duell-Lobby');
    expect(text).toHaveAttribute('font-size', '68');
  });

  it('renders the Ukrainian duels wordmark as SVG text', () => {
    const { container } = render(<KangurDuelsWordmark locale='uk' />);
    const svg = container.querySelector('svg');
    const text = svg?.querySelector('text');

    expect(svg).not.toBeNull();
    expect(text).not.toBeNull();
    expect(text).toHaveTextContent('Лобі дуелей');
    expect(text).toHaveAttribute('font-size', '68');
  });
});
