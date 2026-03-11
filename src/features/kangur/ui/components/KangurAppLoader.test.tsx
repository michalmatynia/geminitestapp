import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { KangurAppLoader } from './KangurAppLoader';

describe('KangurAppLoader', () => {
  it('renders the larger classic loader card with accessible boot loader markers', () => {
    render(<KangurAppLoader visible />);

    const loader = screen.getByTestId('kangur-app-loader');
    const panel = screen.getByTestId('kangur-app-loader-panel');

    expect(loader).toHaveAttribute('aria-busy', 'true');
    expect(loader).toHaveAttribute('aria-live', 'polite');
    expect(panel).toHaveAttribute('data-loader-layout', 'expanded-card');
    expect(screen.getByTestId('kangur-app-loader-copy')).toBeInTheDocument();
    expect(screen.getByText('StudiQ')).toBeInTheDocument();
    expect(screen.getByText('Loading')).toBeInTheDocument();
  });

  it('does not render when hidden', () => {
    render(<KangurAppLoader visible={false} />);

    expect(screen.queryByTestId('kangur-app-loader')).not.toBeInTheDocument();
  });
});
