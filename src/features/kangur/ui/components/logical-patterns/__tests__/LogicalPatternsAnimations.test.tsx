/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  ArithmeticReverseAnimation,
  ArithmeticStepAnimation,
  FibonacciSumAnimation,
  GeometricDotsAnimation,
  GeometricGrowthAnimation,
  PatternCycleAnimation,
  PatternMissingAnimation,
  PatternUnitAnimation,
  RuleChecklistAnimation,
  RuleCheckAnimation,
} from '@/features/kangur/ui/components/LogicalPatternsAnimations';

describe('LogicalPatternsAnimations visuals', () => {
  it('renders upgraded logical patterns teaching surfaces with frames and atmosphere', () => {
    render(
      <>
        <PatternUnitAnimation />
        <ArithmeticStepAnimation />
        <GeometricGrowthAnimation />
        <FibonacciSumAnimation />
        <RuleCheckAnimation />
        <PatternMissingAnimation />
        <ArithmeticReverseAnimation />
        <GeometricDotsAnimation />
        <PatternCycleAnimation />
        <RuleChecklistAnimation />
      </>
    );

    [
      'logical-patterns-unit',
      'logical-patterns-arithmetic-step',
      'logical-patterns-geometric-growth',
      'logical-patterns-fibonacci',
      'logical-patterns-rule-check',
      'logical-patterns-missing',
      'logical-patterns-arithmetic-reverse',
      'logical-patterns-geometric-dots',
      'logical-patterns-cycle',
      'logical-patterns-checklist',
    ].forEach((prefix) => {
      expect(screen.getByTestId(`${prefix}-animation`)).toBeInTheDocument();
      expect(screen.getByTestId(`${prefix}-atmosphere`)).toBeInTheDocument();
      expect(screen.getByTestId(`${prefix}-frame`)).toBeInTheDocument();
    });
  });
});
