/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ShapeIcon } from '@/features/kangur/ui/components/GeometryShapeRecognitionLesson';

describe('GeometryShapeRecognitionLesson visuals', () => {
  it('renders upgraded shape icons with atmosphere and frame hooks', () => {
    render(
      <>
        <ShapeIcon shape='circle' color='#38bdf8' />
        <ShapeIcon shape='square' color='#4ade80' />
        <ShapeIcon shape='triangle' color='#fbbf24' />
        <ShapeIcon shape='rectangle' color='#fb7185' />
        <ShapeIcon shape='oval' color='#a78bfa' />
        <ShapeIcon shape='diamond' color='#f97316' />
      </>
    );

    ['circle', 'square', 'triangle', 'rectangle', 'oval', 'diamond'].forEach((shape) => {
      const prefix = `geometry-shape-icon-${shape}`;
      expect(screen.getByTestId(`${prefix}-animation`)).toBeInTheDocument();
      expect(screen.getByTestId(`${prefix}-atmosphere`)).toBeInTheDocument();
      expect(screen.getByTestId(`${prefix}-frame`)).toBeInTheDocument();
    });
  });
});
