import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MarkdownSplitEditor } from '@/features/document-editor/components/MarkdownSplitEditor';

const clipboardWriteTextMock = vi.fn<() => Promise<void>>();

const createRect = (): DOMRect =>
  ({
    x: 100,
    y: 0,
    width: 900,
    height: 400,
    top: 0,
    left: 100,
    right: 1000,
    bottom: 400,
    toJSON: () => ({}),
  }) as DOMRect;

describe('MarkdownSplitEditor', () => {
  beforeEach(() => {
    clipboardWriteTextMock.mockReset();
    clipboardWriteTextMock.mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: clipboardWriteTextMock },
    });
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(createRect);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('resizes the editor panel from the keyboard splitter control', async () => {
    render(
      <MarkdownSplitEditor
        value='Hello'
        showPreview
        debounceMs={0}
        renderPreviewHtml={(value: string): string => `<p>${value}</p>`}
      />
    );

    const textarea = screen.getByRole('textbox');
    const editorPane = textarea.parentElement;
    const splitter = screen.getByRole('button', { name: 'Resize markdown editor panels' });

    expect(editorPane).not.toBeNull();

    await waitFor(() => expect(editorPane).toHaveStyle({ width: '450px' }));

    fireEvent.keyDown(splitter, { key: 'ArrowRight' });
    await waitFor(() => expect(editorPane).toHaveStyle({ width: '474px' }));

    fireEvent.keyDown(splitter, { key: 'ArrowLeft' });
    await waitFor(() => expect(editorPane).toHaveStyle({ width: '450px' }));
  });

  it('copies preview code blocks via delegated click handling', async () => {
    render(
      <MarkdownSplitEditor
        value='Code'
        showPreview
        debounceMs={0}
        renderPreviewHtml={(): string =>
          '<div><button type="button" data-copy-code="true">Copy</button><code>const example = 1;</code></div>'
        }
      />
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Copy' }));

    await waitFor(() => {
      expect(clipboardWriteTextMock).toHaveBeenCalledWith('const example = 1;');
    });
  });

  it('forwards preview image clicks', async () => {
    const onPreviewImageClick = vi.fn();

    render(
      <MarkdownSplitEditor
        value='Image'
        showPreview
        debounceMs={0}
        onPreviewImageClick={onPreviewImageClick}
        renderPreviewHtml={(): string =>
          '<img src="https://example.com/preview.png" alt="Preview image" />'
        }
      />
    );

    fireEvent.click(await screen.findByRole('img', { name: 'Preview image' }));

    await waitFor(() => {
      expect(onPreviewImageClick).toHaveBeenCalledWith('https://example.com/preview.png');
    });
  });
});
