import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useCategoryTreeNodeRuntimeContext } from '@/features/products/components/settings/CategoryTreeNodeRuntimeContext';

function CategoryTreeNodeRuntimeConsumer(): React.JSX.Element {
  useCategoryTreeNodeRuntimeContext();
  return <div>ok</div>;
}

describe('CategoryTreeNodeRuntimeContext', () => {
  it('throws when used outside provider', () => {
    expect(() => render(<CategoryTreeNodeRuntimeConsumer />)).toThrow(
      'useCategoryTreeNodeRuntimeContext must be used within CategoryTreeNodeRuntimeProvider'
    );
  });
});
