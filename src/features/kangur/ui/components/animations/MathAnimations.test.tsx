/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  DivisionEqualGroupsAnimation,
  DivisionInverseAnimation,
  DivisionRemainderAnimation,
  MultiplicationArrayAnimation,
  MultiplicationCommutativeAnimation,
  MultiplicationDoubleDoubleAnimation,
  MultiplicationFiveRhythmAnimation,
  MultiplicationGamePreviewAnimation,
  MultiplicationGroupsAnimation,
  MultiplicationIntroPatternAnimation,
  MultiplicationSkipCountAnimation,
  MultiplicationTenShiftAnimation,
} from './MathAnimations';

describe('MathAnimations visuals', () => {
  it('renders upgraded multiplication and division teaching surfaces with frames and atmosphere', () => {
    render(
      <>
        <DivisionEqualGroupsAnimation />
        <DivisionInverseAnimation />
        <DivisionRemainderAnimation />
        <MultiplicationGroupsAnimation />
        <MultiplicationArrayAnimation />
        <MultiplicationCommutativeAnimation />
        <MultiplicationIntroPatternAnimation />
        <MultiplicationSkipCountAnimation />
        <MultiplicationDoubleDoubleAnimation />
        <MultiplicationFiveRhythmAnimation />
        <MultiplicationTenShiftAnimation />
        <MultiplicationGamePreviewAnimation />
      </>
    );

    [
      'division-equal-groups',
      'division-inverse',
      'division-remainder',
      'multiplication-groups',
      'multiplication-array',
      'multiplication-commutative',
      'multiplication-intro-pattern',
      'multiplication-skip-count',
      'multiplication-double-double',
      'multiplication-five-rhythm',
      'multiplication-ten-shift',
      'multiplication-game-preview',
    ].forEach((prefix) => {
      expect(screen.getByTestId(`${prefix}-animation`)).toBeInTheDocument();
      expect(screen.getByTestId(`${prefix}-atmosphere`)).toBeInTheDocument();
      expect(screen.getByTestId(`${prefix}-frame`)).toBeInTheDocument();
    });
  });
});
