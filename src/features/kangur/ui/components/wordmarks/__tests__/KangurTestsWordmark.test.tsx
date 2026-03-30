/**
 * @vitest-environment jsdom
 */

import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { KangurTestsWordmark } from '../KangurTestsWordmark';

describe('KangurTestsWordmark', () => {
  it('renders the Polish tests wordmark as SVG text', () => {
    const { container } = render(<KangurTestsWordmark />);
    const svg = container.querySelector('svg');
    const text = svg?.querySelector('text');

    expect(svg).not.toBeNull();
    expect(text).not.toBeNull();
    expect(text).toHaveTextContent('Testy');
    expect(text).toHaveAttribute('font-size', '68');
    expect(text).not.toHaveAttribute('textLength');
    expect(text).not.toHaveAttribute('lengthAdjust');
  });

  it('renders the translated German tests wordmark as SVG text', () => {
    const { container } = render(<KangurTestsWordmark label='Prüfungen' locale='de' />);
    const svg = container.querySelector('svg');
    const text = svg?.querySelector('text');

    expect(svg).not.toBeNull();
    expect(text).not.toBeNull();
    expect(text).toHaveTextContent('Prüfungen');
    expect(text).toHaveAttribute('font-size', '68');
  });

  it('renders the Ukrainian tests wordmark as SVG text', () => {
    const { container } = render(<KangurTestsWordmark locale='uk' />);
    const svg = container.querySelector('svg');
    const text = svg?.querySelector('text');

    expect(svg).not.toBeNull();
    expect(text).not.toBeNull();
    expect(text).toHaveTextContent('Тести');
    expect(text).toHaveAttribute('font-size', '68');
  });
});
