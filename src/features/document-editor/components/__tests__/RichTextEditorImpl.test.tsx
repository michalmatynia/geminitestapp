import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import RichTextEditorImpl from '@/features/document-editor/components/RichTextEditorImpl';

type UseEditorConfig = {
  onUpdate?: ((payload: { editor: { getHTML: () => string; isFocused: boolean } }) => void) | undefined;
};

let capturedUseEditorConfig: UseEditorConfig | null = null;

vi.mock('@/shared/hooks/ui/usePrompt', () => ({
  usePrompt: () => ({
    prompt: vi.fn(),
    PromptInputModal: () => null,
  }),
}));

vi.mock('@tiptap/react', () => ({
  useEditor: (config: UseEditorConfig) => {
    capturedUseEditorConfig = config;
    return null;
  },
  EditorContent: () => null,
}));

vi.mock('@tiptap/starter-kit', () => ({
  default: {
    configure: () => ({}),
  },
}));

vi.mock('@tiptap/extension-link', () => ({
  default: {
    configure: () => ({}),
  },
}));

vi.mock('@tiptap/extension-image', () => ({
  default: {
    configure: () => ({}),
  },
}));

vi.mock('@tiptap/extension-table', () => ({
  Table: {
    configure: () => ({}),
  },
}));

vi.mock('@tiptap/extension-table-cell', () => ({
  TableCell: {},
}));

vi.mock('@tiptap/extension-table-header', () => ({
  TableHeader: {},
}));

vi.mock('@tiptap/extension-table-row', () => ({
  TableRow: {},
}));

vi.mock('@tiptap/extension-task-item', () => ({
  default: {
    configure: () => ({}),
  },
}));

vi.mock('@tiptap/extension-task-list', () => ({
  default: {},
}));

describe('RichTextEditorImpl mount update guard', () => {
  beforeEach(() => {
    capturedUseEditorConfig = null;
  });

  it('ignores non-focused initialization updates', () => {
    const onChange = vi.fn();
    render(
      <RichTextEditorImpl
        value='<p>Initial</p>'
        onChange={onChange}
      />
    );

    expect(capturedUseEditorConfig?.onUpdate).toBeDefined();

    let html = '<p>Initial normalized</p>';
    let isFocused = false;
    const editor = {
      getHTML: () => html,
      get isFocused() {
        return isFocused;
      },
    };

    capturedUseEditorConfig?.onUpdate?.({ editor });
    expect(onChange).not.toHaveBeenCalled();

    html = '<p>Initial normalized twice</p>';
    capturedUseEditorConfig?.onUpdate?.({ editor });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('accepts updates once a focused edit has occurred', () => {
    const onChange = vi.fn();
    render(
      <RichTextEditorImpl
        value='<p>Initial</p>'
        onChange={onChange}
      />
    );

    expect(capturedUseEditorConfig?.onUpdate).toBeDefined();

    let html = '<p>User edit</p>';
    let isFocused = true;
    const editor = {
      getHTML: () => html,
      get isFocused() {
        return isFocused;
      },
    };

    capturedUseEditorConfig?.onUpdate?.({ editor });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenNthCalledWith(1, '<p>User edit</p>');

    html = '<p>Blur sync</p>';
    isFocused = false;
    capturedUseEditorConfig?.onUpdate?.({ editor });
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange).toHaveBeenNthCalledWith(2, '<p>Blur sync</p>');
  });
});
