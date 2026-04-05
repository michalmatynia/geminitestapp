// @vitest-environment jsdom

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { RunningIndicator } from '../job-queue-running-indicator';

describe('RunningIndicator', () => {
  it('renders the default running label', () => {
    render(<RunningIndicator />);

    expect(screen.getByText('Running')).toBeInTheDocument();
  });

  it('renders a custom label', () => {
    render(<RunningIndicator label='Queued' />);

    expect(screen.getByText('Queued')).toBeInTheDocument();
  });
});
