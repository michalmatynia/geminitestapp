import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { createStrictContext } from './createStrictContext';

describe('createStrictContext', () => {
  it('returns a strict hook and optional hook for the same context', () => {
    const { Context, useValue, useOptionalValue } = createStrictContext<{ label: string }>({
      displayName: 'TestContext',
      errorMessage: 'missing context',
    });

    function Consumer(): React.JSX.Element {
      const strictValue = useValue();
      const optionalValue = useOptionalValue();
      return <div>{`${strictValue.label}:${optionalValue?.label ?? 'none'}`}</div>;
    }

    render(
      <Context.Provider value={{ label: 'hello' }}>
        <Consumer />
      </Context.Provider>
    );

    expect(screen.getByText('hello:hello')).toBeInTheDocument();
  });

  it('throws the configured error when the strict hook is used outside the provider', () => {
    const { useValue } = createStrictContext<{ label: string }>({
      displayName: 'TestContext',
      errorMessage: 'missing context',
    });

    function Consumer(): React.JSX.Element {
      useValue();
      return <div>Never rendered</div>;
    }

    expect(() => render(<Consumer />)).toThrow(/missing context/i);
  });
});
