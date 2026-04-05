import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  PromptEngineValidationPageProvider,
  useOptionalPromptEngineValidationPageContext,
} from './PromptEngineValidationPageContext';

function Consumer(): React.JSX.Element {
  const context = useOptionalPromptEngineValidationPageContext();

  return <div>{context?.eyebrow ?? 'none'}</div>;
}

describe('PromptEngineValidationPageContext', () => {
  it('returns null outside provider', () => {
    const result = render(<Consumer />);
    expect(result.getByText('none')).toBeTruthy();
  });

  it('returns the provided value inside provider', () => {
    const result = render(
      <PromptEngineValidationPageProvider value={{ eyebrow: 'Validation' }}>
        <Consumer />
      </PromptEngineValidationPageProvider>
    );

    expect(result.getByText('Validation')).toBeTruthy();
  });
});
