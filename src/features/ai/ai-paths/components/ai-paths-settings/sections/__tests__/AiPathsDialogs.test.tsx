import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../node-config-dialog', () => ({
  NodeConfigDialog: (): React.JSX.Element => <div data-testid='node-config-dialog'>node</div>,
}));

vi.mock('../../../run-detail-dialog', () => ({
  RunDetailDialog: (): React.JSX.Element => <div data-testid='run-detail-dialog'>run</div>,
}));

vi.mock('../../../presets-dialog', () => ({
  PresetsDialog: (): React.JSX.Element => <div data-testid='presets-dialog'>presets</div>,
}));

vi.mock('../../../simulation-dialog', () => ({
  SimulationDialog: (): React.JSX.Element => <div data-testid='simulation-dialog'>simulation</div>,
}));

import { AiPathsDialogs } from '../AiPathsDialogs';

describe('AiPathsDialogs', () => {
  it('renders the dialog stack in the expected order', () => {
    const { container } = render(<AiPathsDialogs />);

    expect(screen.getByTestId('node-config-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('run-detail-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('presets-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('simulation-dialog')).toBeInTheDocument();
    expect(
      Array.from(container.querySelectorAll('[data-testid]')).map((node) =>
        node.getAttribute('data-testid')
      )
    ).toEqual([
      'node-config-dialog',
      'run-detail-dialog',
      'presets-dialog',
      'simulation-dialog',
    ]);
  });
});
