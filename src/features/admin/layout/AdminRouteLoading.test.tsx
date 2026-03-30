// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AdminRouteLoading } from './AdminRouteLoading';

describe('AdminRouteLoading', () => {
  it('renders a shell-preserving admin page loading skeleton', () => {
    render(<AdminRouteLoading />);

    expect(screen.getByTestId('admin-route-loading')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Loading admin page' })).toBeInTheDocument();
  });
});
