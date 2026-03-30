/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  ReactActivityToggleAnimation,
  ReactFragmentGroupAnimation,
  ReactFragmentKeyListAnimation,
  ReactProfilerMultiBoundaryAnimation,
  ReactProfilerTimingAnimation,
  ReactStrictModeCycleAnimation,
  ReactStrictModeDoubleRenderAnimation,
  ReactSuspenseFallbackAnimation,
  ReactSuspenseNestedRevealAnimation,
} from '../WebDevelopmentAnimations';

describe('WebDevelopmentAnimations visuals', () => {
  it('renders upgraded web development teaching surfaces with frames and atmosphere', () => {
    render(
      <>
        <ReactSuspenseFallbackAnimation />
        <ReactSuspenseNestedRevealAnimation />
        <ReactActivityToggleAnimation />
        <ReactFragmentGroupAnimation />
        <ReactProfilerTimingAnimation />
        <ReactStrictModeCycleAnimation />
        <ReactStrictModeDoubleRenderAnimation />
        <ReactFragmentKeyListAnimation />
        <ReactProfilerMultiBoundaryAnimation />
      </>
    );

    [
      'webdev-suspense-fallback',
      'webdev-suspense-nested',
      'webdev-activity-toggle',
      'webdev-fragment-group',
      'webdev-profiler-timing',
      'webdev-strictmode-cycle',
      'webdev-strictmode-double-render',
      'webdev-fragment-key-list',
      'webdev-profiler-multi-boundary',
    ].forEach((prefix) => {
      expect(screen.getByTestId(`${prefix}-animation`)).toBeInTheDocument();
      expect(screen.getByTestId(`${prefix}-atmosphere`)).toBeInTheDocument();
      expect(screen.getByTestId(`${prefix}-frame`)).toBeInTheDocument();
    });
  });
});
