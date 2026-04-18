import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { kangurServerShellMock } = vi.hoisted(() => ({
  kangurServerShellMock: vi.fn(() => <div data-testid='kangur-server-shell'>Loading StudiQ</div>),
}));

vi.mock('@/features/kangur/ui/components/KangurServerShell', () => ({
  KangurServerShell: kangurServerShellMock,
}));

describe('apps/studiq-web KangurLoadingFallback', () => {
  it('renders the branded StudiQ server shell', async () => {
    const { default: KangurLoadingFallback } = await import('./KangurLoadingFallback');

    render(<KangurLoadingFallback />);

    expect(kangurServerShellMock).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('kangur-server-shell')).toBeInTheDocument();
    expect(screen.getByText('Loading StudiQ')).toBeInTheDocument();
  });
});
