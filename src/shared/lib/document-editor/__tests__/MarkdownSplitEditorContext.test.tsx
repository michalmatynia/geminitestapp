import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useMarkdownSplitEditorContext } from '@/shared/lib/document-editor/context/MarkdownSplitEditorContext';

function MarkdownSplitEditorContextConsumer(): React.JSX.Element {
  useMarkdownSplitEditorContext();
  return <div>ok</div>;
}

describe('MarkdownSplitEditorContext', () => {
  it('throws when MarkdownSplitEditor context is missing', () => {
    expect(() => render(<MarkdownSplitEditorContextConsumer />)).toThrow(
      'useMarkdownSplitEditorContext must be used within MarkdownSplitEditorProvider'
    );
  });
});
