import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { createStrictViewContext } from './createStrictViewContext';

describe('createStrictViewContext', () => {
  it('provides a strict hook and renders children', () => {
    const { Provider, useValue } = createStrictViewContext<{ label: string }>({
      providerName: 'TestProvider',
      errorMessage: 'missing provider',
    });

    function Consumer(): React.JSX.Element {
      const value = useValue();
      return <div>{value.label}</div>;
    }

    render(
      <Provider value={{ label: 'Hello' }}>
        <Consumer />
      </Provider>
    );

    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('throws the configured error outside the provider', () => {
    const { useValue } = createStrictViewContext<{ label: string }>({
      providerName: 'TestProvider',
      errorMessage: 'missing provider',
    });

    function Consumer(): React.JSX.Element {
      useValue();
      return <div>Never rendered</div>;
    }

    expect(() => render(<Consumer />)).toThrow(/missing provider/i);
  });
});
