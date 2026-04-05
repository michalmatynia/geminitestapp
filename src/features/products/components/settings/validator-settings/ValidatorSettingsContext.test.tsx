import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useValidatorSettingsContext } from './ValidatorSettingsContext';

function ValidatorSettingsContextConsumer(): React.JSX.Element {
  useValidatorSettingsContext();
  return <div>ok</div>;
}

describe('ValidatorSettingsContext', () => {
  it('throws when used outside provider', () => {
    expect(() => render(<ValidatorSettingsContextConsumer />)).toThrow(
      'useValidatorSettingsContext must be used within ValidatorSettingsProvider'
    );
  });
});
