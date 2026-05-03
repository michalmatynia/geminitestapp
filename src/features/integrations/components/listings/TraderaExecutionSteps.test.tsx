/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TraderaExecutionSteps } from './TraderaExecutionSteps';

describe('TraderaExecutionSteps', () => {
  it('renders each step id alongside the human label', () => {
    render(
      <TraderaExecutionSteps
        live
        liveStatus='running'
        steps={[
          {
            id: 'auth_check',
            label: 'Validate Tradera session',
            status: 'success',
            message: 'Stored Tradera session was accepted.',
          },
          {
            id: 'publish_verify',
            label: 'Verify published listing',
            status: 'running',
            message: 'Waiting for Tradera publish verification.',
          },
        ]}
      />
    );

    expect(screen.getByText('auth_check')).toBeInTheDocument();
    expect(screen.getByText('Validate Tradera session')).toBeInTheDocument();
    expect(screen.getByText('publish_verify')).toBeInTheDocument();
    expect(screen.getByText('Verify published listing')).toBeInTheDocument();
    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('renders long duplicate-ignore step messages with truncated title summaries', () => {
    render(
      <TraderaExecutionSteps
        steps={[
          {
            id: 'duplicate_check',
            label: 'Search for duplicate listings',
            status: 'success',
            message:
              'Duplicate search ignored 5 non-exact title match(es); deep inspection only runs on exact title matches. Ignored titles: Katanas, Katana Sword, Japanese Blades, +2 more.',
          },
          {
            id: 'deep_duplicate_check',
            label: 'Inspect duplicate candidates',
            status: 'skipped',
            message: 'Skipped because only non-exact title matches were found.',
          },
        ]}
      />
    );

    expect(screen.getByText('duplicate_check')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Duplicate search ignored 5 non-exact title match(es); deep inspection only runs on exact title matches. Ignored titles: Katanas, Katana Sword, Japanese Blades, +2 more.'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('deep_duplicate_check')).toBeInTheDocument();
    expect(
      screen.getByText('Skipped because only non-exact title matches were found.')
    ).toBeInTheDocument();
  });
});
