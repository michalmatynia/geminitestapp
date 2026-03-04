import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useNotesAppTreeNodeRuntimeContext } from '@/features/notesapp/components/tree/NotesAppTreeNodeRuntimeContext';

function NotesAppTreeNodeRuntimeConsumer(): React.JSX.Element {
  useNotesAppTreeNodeRuntimeContext();
  return <div>ok</div>;
}

describe('notesapp runtime contexts', () => {
  it('throws when NotesAppTreeNode runtime context is missing', () => {
    expect(() => render(<NotesAppTreeNodeRuntimeConsumer />)).toThrow(
      'useNotesAppTreeNodeRuntimeContext must be used within a NotesAppTreeNodeRuntimeProvider'
    );
  });
});
