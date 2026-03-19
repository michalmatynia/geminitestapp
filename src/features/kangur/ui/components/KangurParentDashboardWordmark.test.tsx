/**
 * @vitest-environment jsdom
 */

import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { KangurParentDashboardWordmark } from '@/features/kangur/ui/components/KangurParentDashboardWordmark';

describe('KangurParentDashboardWordmark', () => {
  it('renders the Polish parent dashboard wordmark as SVG text', () => {
    const { container } = render(<KangurParentDashboardWordmark />);
    const svg = container.querySelector('svg');
    const text = svg?.querySelector('text');

    expect(svg).not.toBeNull();
    expect(text).not.toBeNull();
    expect(text).toHaveTextContent('Panel rodzica');
    expect(text).toHaveAttribute('font-size', '68');
    expect(text).not.toHaveAttribute('textLength');
    expect(text).not.toHaveAttribute('lengthAdjust');
  });

  it('renders the translated German parent dashboard wordmark as SVG text', () => {
    const { container } = render(
      <KangurParentDashboardWordmark label='Elterndashboard' locale='de' />
    );
    const svg = container.querySelector('svg');
    const text = svg?.querySelector('text');

    expect(svg).not.toBeNull();
    expect(text).not.toBeNull();
    expect(text).toHaveTextContent('Elterndashboard');
    expect(text).toHaveAttribute('font-size', '68');
  });
});
