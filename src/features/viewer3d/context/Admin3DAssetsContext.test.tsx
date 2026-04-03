import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  Admin3DAssetsProvider,
  useAdmin3DAssetsContext,
} from './Admin3DAssetsContext';

vi.mock('../hooks/useAdmin3DAssetsState', () => ({
  useAdmin3DAssetsState: () => ({
    query: 'chair',
    setQuery: vi.fn(),
    assets: [],
    isLoading: false,
  }),
}));

function Consumer(): React.JSX.Element {
  const context = useAdmin3DAssetsContext() as { query?: string };
  return <div>{context.query ?? 'none'}</div>;
}

describe('Admin3DAssetsContext', () => {
  it('throws outside provider', () => {
    expect(() => render(<Consumer />)).toThrow(
      'useAdmin3DAssetsContext must be used within an Admin3DAssetsProvider'
    );
  });

  it('returns the provider state inside provider', () => {
    render(
      <Admin3DAssetsProvider>
        <Consumer />
      </Admin3DAssetsProvider>
    );

    expect(screen.getByText('chair')).toBeInTheDocument();
  });
});
