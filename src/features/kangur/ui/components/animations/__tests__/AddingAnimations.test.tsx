/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  AddingAbacusAnimation,
  AddingAssociativeAnimation,
  AddingColumnAnimation,
  AddingCommutativeAnimation,
  AddingCountOnAnimation,
  AddingCrossTenSvgAnimation,
  AddingDoublesAnimation,
  AddingMakeTenPairsAnimation,
  AddingNumberLineAnimation,
  AddingSvgAnimation,
  AddingTenFrameAnimation,
  AddingTensOnesAnimation,
  AddingTwoDigitAnimation,
  AddingZeroAnimation,
} from '../AddingAnimations';

describe('AddingAnimations visuals', () => {
  it('renders upgraded adding teaching surfaces with frames and atmosphere', () => {
    render(
      <>
        <AddingSvgAnimation />
        <AddingCrossTenSvgAnimation />
        <AddingNumberLineAnimation />
        <AddingTenFrameAnimation />
        <AddingTwoDigitAnimation />
        <AddingCommutativeAnimation />
        <AddingZeroAnimation />
        <AddingMakeTenPairsAnimation />
        <AddingDoublesAnimation />
        <AddingCountOnAnimation />
        <AddingTensOnesAnimation />
        <AddingColumnAnimation />
        <AddingAbacusAnimation />
        <AddingAssociativeAnimation />
      </>
    );

    [
      'adding-basics',
      'adding-cross-ten',
      'adding-number-line',
      'adding-ten-frame',
      'adding-two-digit',
      'adding-commutative',
      'adding-zero',
      'adding-make-ten',
      'adding-doubles',
      'adding-count-on',
      'adding-tens-ones',
      'adding-column',
      'adding-abacus',
      'adding-associative',
    ].forEach((prefix) => {
      expect(screen.getByTestId(`${prefix}-animation`)).toBeInTheDocument();
      expect(screen.getByTestId(`${prefix}-atmosphere`)).toBeInTheDocument();
      expect(screen.getByTestId(`${prefix}-frame`)).toBeInTheDocument();
    });
  });
});
