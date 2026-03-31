import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useMarkdownToolbarContext } from '@/shared/lib/document-editor/context/MarkdownToolbarContext';

function MarkdownToolbarContextConsumer(): React.JSX.Element {
  useMarkdownToolbarContext();
  return <div>ok</div>;
}

describe('MarkdownToolbarContext', () => {
  it('throws when MarkdownToolbar context is missing', () => {
    expect(() => render(<MarkdownToolbarContextConsumer />)).toThrow(
      'useMarkdownToolbarContext must be used within MarkdownToolbarProvider'
    );
  });
});
