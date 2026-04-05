// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const capturedDocumentEditorPropsRef = {
  current: null as Record<string, unknown> | null,
};

vi.mock('@/shared/lib/document-editor/public', () => ({
  DocumentWysiwygEditor: (props: Record<string, unknown>) => {
    capturedDocumentEditorPropsRef.current = props;
    return <div data-testid='mock-case-resolver-document-editor' />;
  },
}));

import { CaseResolverRichTextEditor } from '@/features/case-resolver/components/CaseResolverRichTextEditor';

describe('CaseResolverRichTextEditor', () => {
  beforeEach(() => {
    capturedDocumentEditorPropsRef.current = null;
  });

  it('routes through the shared text editor engine instance with branding enabled', async () => {
    const onChange = vi.fn();

    render(
      <CaseResolverRichTextEditor
        value='<p>Case resolver content</p>'
        onChange={onChange}
        placeholder='Describe the case'
        appearance='document-preview'
      />
    );

    expect(await screen.findByTestId('mock-case-resolver-document-editor')).toBeInTheDocument();
    expect(capturedDocumentEditorPropsRef.current).toMatchObject({
      engineInstance: 'case_resolver',
      showBrand: true,
      value: '<p>Case resolver content</p>',
      onChange,
      placeholder: 'Describe the case',
      appearance: 'document-preview',
    });
  });
});
