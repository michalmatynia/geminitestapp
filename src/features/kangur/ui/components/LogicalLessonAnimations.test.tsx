/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  ClassificationCategoryBinsAnimation,
  ClassificationCriteriaAxesAnimation,
  ClassificationCriteriaSwitchAnimation,
  ClassificationHiddenRuleAnimation,
  ClassificationOddOneOutAnimation,
  ClassificationOddOneOutPatternAnimation,
  ClassificationParityAnimation,
  ClassificationRecapSequenceAnimation,
  ClassificationSortByColorAnimation,
  ClassificationSortByShapeAnimation,
  ClassificationSortBySizeAnimation,
  ClassificationTwoCriteriaGridAnimation,
  ClassificationVennOverlapAnimation,
  ClassificationVennUnionAnimation,
} from './LogicalLessonAnimations';

describe('LogicalLessonAnimations visuals', () => {
  it('renders upgraded logical classification teaching surfaces with frames and atmosphere', () => {
    render(
      <>
        <ClassificationSortByColorAnimation />
        <ClassificationSortBySizeAnimation />
        <ClassificationSortByShapeAnimation />
        <ClassificationCategoryBinsAnimation />
        <ClassificationParityAnimation />
        <ClassificationTwoCriteriaGridAnimation />
        <ClassificationVennOverlapAnimation />
        <ClassificationOddOneOutAnimation />
        <ClassificationOddOneOutPatternAnimation />
        <ClassificationHiddenRuleAnimation />
        <ClassificationRecapSequenceAnimation />
        <ClassificationCriteriaAxesAnimation />
        <ClassificationCriteriaSwitchAnimation />
        <ClassificationVennUnionAnimation />
      </>
    );

    [
      'logical-classification-color',
      'logical-classification-size',
      'logical-classification-shape',
      'logical-classification-category',
      'logical-classification-parity',
      'logical-classification-grid',
      'logical-classification-venn-overlap',
      'logical-classification-odd',
      'logical-classification-pattern',
      'logical-classification-hidden-rule',
      'logical-classification-recap',
      'logical-classification-axes',
      'logical-classification-switch',
      'logical-classification-venn-union',
    ].forEach((prefix) => {
      expect(screen.getByTestId(`${prefix}-animation`)).toBeInTheDocument();
      expect(screen.getByTestId(`${prefix}-atmosphere`)).toBeInTheDocument();
      expect(screen.getByTestId(`${prefix}-frame`)).toBeInTheDocument();
    });
  });
});
