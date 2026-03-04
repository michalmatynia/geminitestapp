import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { usePromptExploderTreeNodeRuntimeContext } from '@/features/prompt-exploder/components/tree/PromptExploderTreeNodeRuntimeContext';

function PromptExploderTreeNodeRuntimeConsumer(): React.JSX.Element {
  usePromptExploderTreeNodeRuntimeContext();
  return <div>ok</div>;
}

describe('prompt-exploder runtime contexts', () => {
  it('throws when PromptExploderTreeNode runtime context is missing', () => {
    expect(() => render(<PromptExploderTreeNodeRuntimeConsumer />)).toThrow(
      'usePromptExploderTreeNodeRuntimeContext must be used within a PromptExploderTreeNodeRuntimeProvider'
    );
  });
});
