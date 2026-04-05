/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  expectSharedPrimitivesShowcaseClasses,
  renderEmbeddedKangurPageContainer,
  renderSharedPrimitivesShowcase,
} from './primitives.test-helpers';

describe('Kangur shared primitives', () => {
  it('renders shared badge, summary, and empty-state styling tokens', () => {
    renderSharedPrimitivesShowcase();
    expectSharedPrimitivesShowcaseClasses();
  });

  it('renders the page container as a focusable div for embedded Kangur surfaces', () => {
    renderEmbeddedKangurPageContainer();

    const container = screen.getByText('Embedded Kangur');
    expect(container.tagName).toBe('DIV');
    expect(container).toHaveClass('kangur-page-container', 'w-full', 'min-w-0', 'mx-auto');
    expect(container).toHaveAttribute('id', 'embedded-kangur-main');
    expect(container).toHaveAttribute('tabindex', '-1');
  });
});
