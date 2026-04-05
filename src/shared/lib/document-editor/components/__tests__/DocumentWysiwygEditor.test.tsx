// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getTextEditorProfileKey } from '@/shared/lib/text-editor-engine/settings';
import { DocumentWysiwygEditor } from '@/shared/lib/document-editor/components/DocumentWysiwygEditor';

import type { RichTextEditorProps } from '@/shared/lib/document-editor/components/RichTextEditorTypes';

const settingsMapRef = {
  current: new Map<string, string>(),
};

const refetchMock = vi.fn();
const richTextEditorMock = vi.fn<(props: RichTextEditorProps) => React.JSX.Element>();
let capturedRichTextEditorProps: RichTextEditorProps | null = null;

vi.mock('@/shared/providers/SettingsStoreProvider', () => ({
  useSettingsStore: () => ({
    map: settingsMapRef.current,
    isLoading: false,
    isFetching: false,
    error: null,
    get: (key: string): string | undefined => settingsMapRef.current.get(key),
    getBoolean: (_key: string, fallback: boolean = false): boolean => fallback,
    getNumber: (_key: string, fallback?: number): number | undefined => fallback,
    refetch: refetchMock,
  }),
}));

vi.mock('@/shared/lib/document-editor/components/RichTextEditor', () => ({
  RichTextEditor: (props: RichTextEditorProps): React.JSX.Element => {
    capturedRichTextEditorProps = props;
    return richTextEditorMock(props);
  },
}));

describe('DocumentWysiwygEditor', () => {
  beforeEach(() => {
    settingsMapRef.current = new Map<string, string>();
    capturedRichTextEditorProps = null;
    refetchMock.mockReset();
    richTextEditorMock.mockReset();
    richTextEditorMock.mockImplementation(
      (props: RichTextEditorProps): React.JSX.Element => (
        <div
          data-testid='rich-text-editor'
          data-allow-font-family={String(props.allowFontFamily)}
          data-allow-image={String(props.allowImage)}
          data-allow-table={String(props.allowTable)}
          data-allow-task-list={String(props.allowTaskList)}
          data-allow-text-align={String(props.allowTextAlign)}
          data-enable-advanced-tools={String(props.enableAdvancedTools)}
        />
      )
    );
  });

  it('uses the default engine profile and renders the settings brand link', () => {
    render(
      <DocumentWysiwygEditor
        value='<p>Mail</p>'
        onChange={vi.fn()}
        engineInstance='filemaker_email'
        showBrand
      />
    );

    expect(capturedRichTextEditorProps).not.toBeNull();
    expect(capturedRichTextEditorProps?.allowFontFamily).toBe(true);
    expect(capturedRichTextEditorProps?.allowTextAlign).toBe(true);
    expect(capturedRichTextEditorProps?.enableAdvancedTools).toBe(true);
    expect(capturedRichTextEditorProps?.allowImage).toBe(true);
    expect(capturedRichTextEditorProps?.allowTable).toBe(true);
    expect(capturedRichTextEditorProps?.allowTaskList).toBe(true);
    expect(capturedRichTextEditorProps?.surfaceOptions?.className).toContain('min-h-[250px]');
    expect(capturedRichTextEditorProps?.surfaceOptions?.editorContentClassName).not.toContain(
      'Times_New_Roman'
    );

    expect(
      screen.getByRole('link', {
        name: 'Open Filemaker Email text editor settings',
      })
    ).toHaveAttribute(
      'href',
      '/admin/settings/text-editors#text-editor-instance-filemaker_email'
    );
  });

  it('resolves a stored engine profile and forwards brand overrides', () => {
    settingsMapRef.current.set(
      getTextEditorProfileKey('notes_app'),
      JSON.stringify({
        appearance: 'document-preview',
        allowFontFamily: true,
        allowTextAlign: true,
        enableAdvancedTools: true,
        allowImage: false,
        allowTable: false,
        allowTaskList: false,
      })
    );

    render(
      <DocumentWysiwygEditor
        value='<p>Note</p>'
        onChange={vi.fn()}
        engineInstance='notes_app'
        showBrand
        brandClassName='brand-override'
        brandHref='/admin/settings/text-editors#notes-custom'
      />
    );

    expect(capturedRichTextEditorProps).not.toBeNull();
    expect(capturedRichTextEditorProps?.allowFontFamily).toBe(true);
    expect(capturedRichTextEditorProps?.allowTextAlign).toBe(true);
    expect(capturedRichTextEditorProps?.enableAdvancedTools).toBe(true);
    expect(capturedRichTextEditorProps?.allowImage).toBe(false);
    expect(capturedRichTextEditorProps?.allowTable).toBe(false);
    expect(capturedRichTextEditorProps?.allowTaskList).toBe(false);
    expect(capturedRichTextEditorProps?.surfaceOptions?.className).toContain('min-h-[300px]');
    expect(capturedRichTextEditorProps?.surfaceOptions?.editorContentClassName).toContain(
      'Times_New_Roman'
    );

    const link = screen.getByRole('link', {
      name: 'Open Notes App text editor settings',
    });

    expect(link).toHaveAttribute('href', '/admin/settings/text-editors#notes-custom');
    expect(link).toHaveClass('brand-override');
  });

  it('lets local props override the engine profile and hide the brand link when disabled', () => {
    settingsMapRef.current.set(
      getTextEditorProfileKey('case_resolver'),
      JSON.stringify({
        appearance: 'document-preview',
        allowFontFamily: false,
        allowTextAlign: false,
        enableAdvancedTools: false,
        allowImage: false,
        allowTable: false,
        allowTaskList: false,
      })
    );

    render(
      <DocumentWysiwygEditor
        value='<p>Case</p>'
        onChange={vi.fn()}
        engineInstance='case_resolver'
        appearance='default'
        allowFontFamily
        allowTextAlign
        enableAdvancedTools
        allowImage
        allowTable
        allowTaskList
      />
    );

    expect(capturedRichTextEditorProps).not.toBeNull();
    expect(capturedRichTextEditorProps?.allowFontFamily).toBe(true);
    expect(capturedRichTextEditorProps?.allowTextAlign).toBe(true);
    expect(capturedRichTextEditorProps?.enableAdvancedTools).toBe(true);
    expect(capturedRichTextEditorProps?.allowImage).toBe(true);
    expect(capturedRichTextEditorProps?.allowTable).toBe(true);
    expect(capturedRichTextEditorProps?.allowTaskList).toBe(true);
    expect(capturedRichTextEditorProps?.surfaceOptions?.className).toContain('min-h-[250px]');
    expect(capturedRichTextEditorProps?.surfaceOptions?.editorContentClassName).not.toContain(
      'Times_New_Roman'
    );
    expect(
      screen.queryByRole('link', {
        name: 'Open Case Resolver text editor settings',
      })
    ).not.toBeInTheDocument();
  });
});
