/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  SubtractingAbacusAnimation,
  SubtractingDifferenceBarAnimation,
  SubtractingNumberLineAnimation,
  SubtractingSvgAnimation,
  SubtractingTenFrameAnimation,
} from '@/features/kangur/ui/components/SubtractingLesson';

describe('SubtractingLesson visuals', () => {
  it('renders upgraded subtracting teaching surfaces with frames and atmosphere', () => {
    render(
      <>
        <SubtractingSvgAnimation ariaLabel='Subtracting dots' />
        <SubtractingNumberLineAnimation ariaLabel='Subtracting number line' />
        <SubtractingTenFrameAnimation ariaLabel='Subtracting ten frame' />
        <SubtractingDifferenceBarAnimation
          ariaLabel='Subtracting difference bar'
          differenceLabel='difference 5'
        />
        <SubtractingAbacusAnimation
          ariaLabel='Subtracting abacus'
          tensLabel='Tens'
          onesLabel='Ones'
          startLabel='Start'
          subtractLabel='Subtract'
          resultLabel='Result'
        />
      </>
    );

    [
      'subtracting-basics-motion',
      'subtracting-number-line',
      'subtracting-ten-frame',
      'subtracting-difference-bar',
      'subtracting-abacus',
    ].forEach((prefix) => {
      expect(screen.getByTestId(`${prefix}-animation`)).toBeInTheDocument();
      expect(screen.getByTestId(`${prefix}-atmosphere`)).toBeInTheDocument();
      expect(screen.getByTestId(`${prefix}-frame`)).toBeInTheDocument();
    });

    expect(
      screen
        .getByTestId('subtracting-basics-motion-animation')
        .querySelectorAll('ellipse[data-kangur-soft-oval="true"]').length
    ).toBe(3);
  });
});
