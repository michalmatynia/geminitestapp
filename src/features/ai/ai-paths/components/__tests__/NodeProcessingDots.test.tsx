import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { NodeProcessingDots } from '../NodeProcessingDots';

describe('NodeProcessingDots', () => {
  it('renders nothing when inactive', () => {
    const { container } = render(<NodeProcessingDots active={false} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders three animated dots with staggered delays when active', () => {
    const { container } = render(<NodeProcessingDots active />);

    const wrapper = container.firstElementChild as HTMLSpanElement | null;
    expect(wrapper).not.toBeNull();
    expect(wrapper?.tagName).toBe('SPAN');
    expect(wrapper?.className).toContain('inline-flex');
    expect(wrapper?.className).toContain('gap-[3px]');

    const dots = Array.from(wrapper?.children ?? []) as HTMLSpanElement[];
    expect(dots).toHaveLength(3);

    expect(dots.map((dot) => dot.className)).toEqual([
      expect.stringContaining('rounded-full bg-sky-400'),
      expect.stringContaining('rounded-full bg-sky-400'),
      expect.stringContaining('rounded-full bg-sky-400'),
    ]);

    expect(dots.map((dot) => dot.style.animation)).toEqual([
      'ai-paths-dot-bounce 1.2s ease-in-out infinite',
      'ai-paths-dot-bounce 1.2s ease-in-out infinite',
      'ai-paths-dot-bounce 1.2s ease-in-out infinite',
    ]);
    expect(dots.map((dot) => dot.style.animationDelay)).toEqual(['0s', '0.2s', '0.4s']);
  });
});
