/**
 * @vitest-environment jsdom
 */

import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { KangurLessonsWordmark } from '@/features/kangur/ui/components/wordmarks/KangurLessonsWordmark';

describe('KangurLessonsWordmark', () => {
  it('renders the Polish Lekcje wordmark as standalone SVG paths', () => {
    const { container } = render(<KangurLessonsWordmark />);
    const svg = container.querySelector('svg');

    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute('viewBox', '0 0 560 164');
    expect(svg?.querySelector('text')).toBeNull();
    expect(svg?.querySelectorAll('path').length).toBeGreaterThan(6);
  });

  it('keeps the intended responsive sizing classes for the lessons header art', () => {
    const { container } = render(<KangurLessonsWordmark />);
    const svg = container.querySelector('svg');

    expect(svg).toHaveClass('h-auto', 'w-full', 'max-w-[272px]', 'sm:max-w-[356px]');
  });

  it('uses deterministic SVG IDs for gradients and filters', () => {
    const { container } = render(<KangurLessonsWordmark />);
    const svg = container.querySelector('svg');

    expect(svg?.querySelector('#kangur-lessons-wordmark-word-grad')).not.toBeNull();
    expect(svg?.querySelector('#kangur-lessons-wordmark-shadow')).not.toBeNull();
  });

  it('renders the translated English lessons wordmark as SVG text', () => {
    const { container } = render(<KangurLessonsWordmark label='Lessons' locale='en' />);
    const svg = container.querySelector('svg');
    const text = svg?.querySelector('text');

    expect(svg).not.toBeNull();
    expect(text).not.toBeNull();
    expect(text).toHaveTextContent('Lessons');
    expect(text).toHaveAttribute('font-size', '68');
    expect(text).not.toHaveAttribute('textLength');
    expect(text).not.toHaveAttribute('lengthAdjust');
  });

  it('renders the translated German lessons wordmark as SVG text', () => {
    const { container } = render(<KangurLessonsWordmark label='Lektionen' locale='de' />);
    const svg = container.querySelector('svg');
    const text = svg?.querySelector('text');

    expect(svg).not.toBeNull();
    expect(text).not.toBeNull();
    expect(text).toHaveTextContent('Lektionen');
    expect(text).toHaveAttribute('font-size', '68');
    expect(text).not.toHaveAttribute('textLength');
    expect(text).not.toHaveAttribute('lengthAdjust');
  });
});
