import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { createStrictContext } from '@/shared/lib/react/createStrictContext';

type TestContextValue = {
  value: string;
};

const {
  Context: TestContext,
  useStrictContext: useTestContext,
  useOptionalContext: useOptionalTestContext,
} = createStrictContext<TestContextValue>({
  hookName: 'useTestContext',
  providerName: 'TestProvider',
});

function StrictConsumer(): React.JSX.Element {
  const context = useTestContext();
  return <div>{context.value}</div>;
}

function OptionalConsumer(): React.JSX.Element {
  const context = useOptionalTestContext();
  return <div>{context ? context.value : 'none'}</div>;
}

describe('createStrictContext', () => {
  it('throws a clear error outside of provider', () => {
    expect(() => render(<StrictConsumer />)).toThrow('useTestContext must be used within TestProvider');
  });

  it('returns context value inside provider', () => {
    const result = render(
      <TestContext.Provider value={{ value: 'ok' }}>
        <StrictConsumer />
      </TestContext.Provider>
    );

    expect(result.getByText('ok')).toBeTruthy();
  });

  it('returns null in optional hook outside provider', () => {
    const result = render(<OptionalConsumer />);
    expect(result.getByText('none')).toBeTruthy();
  });
});
