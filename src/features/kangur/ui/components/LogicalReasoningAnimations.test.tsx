/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  DeductionFlowAnimation,
  EliminationGridAnimation,
  IfThenArrowAnimation,
  InductionGatherAnimation,
  QuantifierScopeAnimation,
} from './LogicalReasoningAnimations';

describe('LogicalReasoningAnimations visuals', () => {
  it('renders upgraded logical reasoning teaching surfaces with frames and atmosphere', () => {
    render(
      <>
        <DeductionFlowAnimation />
        <InductionGatherAnimation />
        <IfThenArrowAnimation />
        <QuantifierScopeAnimation />
        <EliminationGridAnimation />
      </>
    );

    [
      'logical-reasoning-deduction',
      'logical-reasoning-induction',
      'logical-reasoning-if-then',
      'logical-reasoning-quantifiers',
      'logical-reasoning-elimination',
    ].forEach((prefix) => {
      expect(screen.getByTestId(`${prefix}-animation`)).toBeInTheDocument();
      expect(screen.getByTestId(`${prefix}-atmosphere`)).toBeInTheDocument();
      expect(screen.getByTestId(`${prefix}-frame`)).toBeInTheDocument();
    });
  });
});
