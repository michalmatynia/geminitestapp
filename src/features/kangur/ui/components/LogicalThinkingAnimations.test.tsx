/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  LogicalAnalogyMapAnimation,
  LogicalAnalogiesAnimation,
  LogicalClassificationAnimation,
  LogicalClassificationKeyAnimation,
  LogicalPatternAnimation,
  LogicalPatternGrowthAnimation,
  LogicalReasoningAnimation,
  LogicalSummaryAnimation,
  LogicalThinkingIntroAnimation,
  LogicalThinkingStepsAnimation,
} from './LogicalThinkingAnimations';

describe('LogicalThinkingAnimations visuals', () => {
  it('renders upgraded logical thinking teaching surfaces with frames and atmosphere', () => {
    render(
      <>
        <LogicalThinkingIntroAnimation />
        <LogicalThinkingStepsAnimation />
        <LogicalPatternAnimation />
        <LogicalPatternGrowthAnimation />
        <LogicalClassificationAnimation />
        <LogicalClassificationKeyAnimation />
        <LogicalReasoningAnimation />
        <LogicalAnalogiesAnimation />
        <LogicalAnalogyMapAnimation />
        <LogicalSummaryAnimation />
      </>
    );

    [
      'logical-thinking-intro',
      'logical-thinking-steps',
      'logical-thinking-pattern',
      'logical-thinking-growth',
      'logical-thinking-classification',
      'logical-thinking-key',
      'logical-thinking-reasoning',
      'logical-thinking-analogies',
      'logical-thinking-analogy-map',
      'logical-thinking-summary',
    ].forEach((prefix) => {
      expect(screen.getByTestId(`${prefix}-animation`)).toBeInTheDocument();
      expect(screen.getByTestId(`${prefix}-atmosphere`)).toBeInTheDocument();
      expect(screen.getByTestId(`${prefix}-frame`)).toBeInTheDocument();
    });
  });
});
