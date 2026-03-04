import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useValidatorPatternTreeContext } from '../ValidatorPatternTreeContext';

function ValidatorPatternTreeContextConsumer(): React.JSX.Element {
  useValidatorPatternTreeContext();
  return <div>ok</div>;
}

describe('ValidatorPatternTreeContext', () => {
  it('throws when used outside provider', () => {
    expect(() => render(<ValidatorPatternTreeContextConsumer />)).toThrow(
      'useValidatorPatternTreeContext must be used within ValidatorPatternTreeContext.Provider'
    );
  });
});
