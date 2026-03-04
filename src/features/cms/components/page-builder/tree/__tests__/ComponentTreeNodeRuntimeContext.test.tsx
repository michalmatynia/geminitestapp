import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useComponentTreeNodeRuntimeContext } from '../ComponentTreeNodeRuntimeContext';

function ComponentTreeNodeRuntimeConsumer(): React.JSX.Element {
  useComponentTreeNodeRuntimeContext();
  return <div>ok</div>;
}

describe('ComponentTreeNodeRuntimeContext', () => {
  it('throws when used outside provider', () => {
    expect(() => render(<ComponentTreeNodeRuntimeConsumer />)).toThrow(
      'useComponentTreeNodeRuntimeContext must be used within ComponentTreeNodeRuntimeProvider'
    );
  });
});
