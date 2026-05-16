import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('apps/studiq-web KangurLoadingFallback', () => {
  it('does not render a second full-screen shell while Kangur layouts stream', async () => {
    const { default: KangurLoadingFallback } = await import('./KangurLoadingFallback');

    const { container } = render(<KangurLoadingFallback />);

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
