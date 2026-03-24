/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  GeometryAngleAnimation,
  GeometryAngleTypesAnimation,
  GeometryMovingPointAnimation,
  GeometryPerimeterOppositeSidesAnimation,
  GeometryPerimeterSidesAnimation,
  GeometryPerimeterSumAnimation,
  GeometryPerimeterTraceAnimation,
  GeometryPointSegmentAnimation,
  GeometryPolygonSidesAnimation,
  GeometryRightAngleAnimation,
  GeometryShapeBuildAnimation,
  GeometryShapeFillAnimation,
  GeometryShapesOrbitAnimation,
  GeometrySideHighlightAnimation,
  GeometrySymmetryAxesAnimation,
  GeometrySymmetryCheckAnimation,
  GeometrySymmetryFoldAnimation,
  GeometrySymmetryMirrorAnimation,
  GeometrySymmetryRotationAnimation,
  GeometryVerticesAnimation,
} from './GeometryLessonAnimations';

describe('GeometryLessonAnimations visuals', () => {
  it('renders upgraded geometry teaching surfaces with frames and atmosphere', () => {
    render(
      <>
        <GeometryPointSegmentAnimation />
        <GeometryVerticesAnimation />
        <GeometryAngleAnimation />
        <GeometryRightAngleAnimation />
        <GeometryMovingPointAnimation />
        <GeometrySideHighlightAnimation />
        <GeometryAngleTypesAnimation />
        <GeometryPerimeterTraceAnimation />
        <GeometryPerimeterOppositeSidesAnimation />
        <GeometryPerimeterSumAnimation />
        <GeometryShapeBuildAnimation />
        <GeometryShapeFillAnimation />
        <GeometryShapesOrbitAnimation />
        <GeometrySymmetryFoldAnimation />
        <GeometrySymmetryAxesAnimation />
        <GeometrySymmetryMirrorAnimation />
        <GeometrySymmetryRotationAnimation />
        <GeometrySymmetryCheckAnimation />
        <GeometryPerimeterSidesAnimation />
        <GeometryPolygonSidesAnimation />
      </>
    );

    [
      'geometry-point-segment',
      'geometry-vertices',
      'geometry-angle',
      'geometry-right-angle',
      'geometry-moving-point',
      'geometry-side-highlight',
      'geometry-angle-types',
      'geometry-perimeter-trace',
      'geometry-perimeter-opposite-sides',
      'geometry-perimeter-sum',
      'geometry-shape-build',
      'geometry-shape-fill',
      'geometry-shapes-orbit',
      'geometry-symmetry-fold',
      'geometry-symmetry-axes',
      'geometry-symmetry-mirror',
      'geometry-symmetry-rotation',
      'geometry-symmetry-check',
      'geometry-perimeter-sides',
      'geometry-polygon-sides',
    ].forEach((prefix) => {
      expect(screen.getByTestId(`${prefix}-animation`)).toBeInTheDocument();
      expect(screen.getByTestId(`${prefix}-atmosphere`)).toBeInTheDocument();
      expect(screen.getByTestId(`${prefix}-frame`)).toBeInTheDocument();
    });
  });
});
