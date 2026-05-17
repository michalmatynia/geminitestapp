/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/dynamic', () => ({
  default: () =>
    function MockKangurFeatureRouteShellClientBoundary(props: {
      skipInitialClientBootLoader?: boolean;
    }) {
      return (
        <div
          data-testid='kangur-feature-route-shell-client-loader'
          data-skip-initial-client-boot-loader={String(
            props.skipInitialClientBootLoader ?? false
          )}
        >
          deferred route shell boundary
        </div>
      );
    },
}));

import { KangurFeatureRouteShellClientLoader } from './KangurFeatureRouteShellClientLoader';

describe('KangurFeatureRouteShellClientLoader', () => {
  it('renders the deferred route shell client boundary through next/dynamic', () => {
    render(<KangurFeatureRouteShellClientLoader />);

    expect(
      screen.getByTestId('kangur-feature-route-shell-client-loader')
    ).toHaveTextContent('deferred route shell boundary');
  });

  it('passes the server first-paint loader handoff flag into the deferred boundary', () => {
    render(<KangurFeatureRouteShellClientLoader skipInitialClientBootLoader />);

    expect(screen.getByTestId('kangur-feature-route-shell-client-loader')).toHaveAttribute(
      'data-skip-initial-client-boot-loader',
      'true'
    );
  });
});
