/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ProductRouteLoadingFallback } from './ProductRouteLoadingFallback';

describe('ProductRouteLoadingFallback', () => {
  it('renders a dedicated product loading skeleton', () => {
    render(<ProductRouteLoadingFallback />);

    expect(screen.getByTestId('product-route-loading-fallback')).toHaveAttribute(
      'aria-label',
      'Loading product page'
    );
    expect(screen.getByTestId('product-route-loading-fallback-content')).toBeInTheDocument();
  });
});
