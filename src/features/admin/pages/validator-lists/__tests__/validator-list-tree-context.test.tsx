import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useValidatorListTreeContext } from '../ValidatorListTreeContext';

function ValidatorListTreeContextConsumer(): React.JSX.Element {
  useValidatorListTreeContext();
  return <div>ok</div>;
}

describe('ValidatorListTreeContext', () => {
  it('throws when used outside provider', () => {
    expect(() => render(<ValidatorListTreeContextConsumer />)).toThrow(
      'useValidatorListTreeContext must be used within ValidatorListTreeContext.Provider'
    );
  });
});
