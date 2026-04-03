import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useCategoryFormContext } from './CategoryFormContext';

function CategoryFormContextConsumer(): React.JSX.Element {
  useCategoryFormContext();
  return <div>ok</div>;
}

describe('CategoryFormContext', () => {
  it('throws when used outside provider', () => {
    expect(() => render(<CategoryFormContextConsumer />)).toThrow(
      'useCategoryFormContext must be used within CategoryFormProvider'
    );
  });
});
