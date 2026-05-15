// @vitest-environment jsdom

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FilemakerGoalAutomationPanel } from './FilemakerGoalAutomationPanel';

describe('FilemakerGoalAutomationPanel', () => {
  it('renders evaluator options without empty Select item values', () => {
    render(<FilemakerGoalAutomationPanel />);

    expect(screen.getByText('Evaluator')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Run' })).toBeDisabled();
  });
});
