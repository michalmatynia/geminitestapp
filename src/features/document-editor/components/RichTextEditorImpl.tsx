'use client';

import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { Table } from '@tiptap/extension-table';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableRow } from '@tiptap/extension-table-row';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import { EditorContent, useEditor, type Editor, type AnyExtension } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  CheckSquare,
  Code,
  Eraser,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Minus,
  Pilcrow,
  Quote,
  Redo,
  Strikethrough,
  Underline,
  Table as TableIcon,
  Undo,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';

import { usePrompt } from '@/shared/hooks/ui/usePrompt';
import { InsetPanel, SelectSimple } from '@/shared/ui';
import { cn } from '@/shared/utils';

import {
  fontFamilyMark,
  underlineMark,
  inlineTextAlignMark,
  textAlignExtension,
} from './rich-text/RichTextEditorExtensions';
import { ToolbarButton, ToolbarVariantContext } from './rich-text/RichTextEditorToolbar';

import type {
  HeadingLevel,
  TextAlignOption,
  RichTextEditorFontOption,
  RichTextEditorProps,
} from './RichTextEditorTypes';

const defaultFontFamilyOptions: RichTextEditorFontOption[] = [
  { value: '"Times New Roman", Georgia, serif', label: 'Times' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: '"Trebuchet MS", sans-serif', label: 'Trebuchet' },
  { value: '"Helvetica Neue", Arial, sans-serif', label: 'Helvetica' },
  { value: '"Courier New", monospace', label: 'Courier' },
];

const sanitizeContent = (value: string | null | undefined): string => {
  if (!value) return '';
  if (typeof value !== 'string') return '';
  if (typeof document === 'undefined') return value;
  const root = document.createElement('div');
  root.innerHTML = value;
  return root.innerHTML;
};

export default function RichTextEditorImpl(props: RichTextEditorProps): React.JSX.Element {
  const {
    value,
    onChange,
    disabled = false,
    placeholder,
    variant = 'compact',
    headingLevels = [2],
    allowImage = false,
    allowTable = false,
    allowTaskList = false,
    allowFontFamily = false,
    allowTextAlign = false,
    enableAdvancedTools = false,
    fontFamilyOptions,
    loadingLabel = 'Loading editor...',
    containerClassName,
    toolbarClassName,
    surfaceOptions,
  } = props;
  const { prompt, PromptInputModal } = usePrompt();
  const lastValueRef = useRef(value);
  const hasAcceptedFocusedUpdateRef = useRef(false);
  const headingLevelsSignature = headingLevels.join(',');
  const normalizedFontFamilyOptions = useMemo<RichTextEditorFontOption[]>(() => {
    if (fontFamilyOptions && fontFamilyOptions.length > 0) {
      return fontFamilyOptions;
    }
    return defaultFontFamilyOptions;
  }, [fontFamilyOptions]);

  const normalizedHeadingLevels = useMemo<HeadingLevel[]>(() => {
    const normalized = headingLevels
      .filter((level): level is HeadingLevel => level === 1 || level === 2 || level === 3)
      .filter((level, index, list) => list.indexOf(level) === index)
      .sort((left, right) => left - right);
    return normalized.length > 0 ? normalized : [2];
  }, [headingLevelsSignature]);

  const extensions = useMemo(() => {
    const activeExtensions: AnyExtension[] = [
      StarterKit.configure({
        heading: { levels: normalizedHeadingLevels },
        link: false,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-300 underline hover:text-blue-200',
        },
      }),
      underlineMark,
    ];

    if (allowFontFamily) {
      activeExtensions.push(fontFamilyMark);
    }

    if (allowTextAlign) {
      activeExtensions.push(textAlignExtension);
      activeExtensions.push(inlineTextAlignMark);
    }

    if (allowImage) {
      activeExtensions.push(
        Image.configure({
          HTMLAttributes: {
            class: 'max-w-full rounded-lg',
          },
        })
      );
    }

    if (allowTaskList) {
      activeExtensions.push(TaskList);
      activeExtensions.push(
        TaskItem.configure({
          nested: true,
        })
      );
    }

    if (allowTable) {
      activeExtensions.push(
        Table.configure({
          resizable: true,
        }),
        TableRow,
        TableCell,
        TableHeader
      );
    }

    return activeExtensions;
  }, [
    allowFontFamily,
    allowImage,
    allowTable,
    allowTaskList,
    allowTextAlign,
    normalizedHeadingLevels,
  ]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions,
    content: sanitizeContent(value),
    editable: !disabled,
    editorProps: {
      attributes: {
        class:
          variant === 'full'
            ? 'prose prose-invert max-w-none min-h-[250px] px-4 py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background'
            : 'prose prose-invert max-w-none min-h-[220px] px-4 py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      },
    },
    onUpdate: ({ editor: instance }: { editor: Editor }): void => {
      const next = instance.getHTML();
      if (next === lastValueRef.current) return;
      // Ignore pre-focus normalization churn from editor mount so we don't mark
      // untouched drafts as dirty before the user actually edits content.
      if (!instance.isFocused && !hasAcceptedFocusedUpdateRef.current) {
        lastValueRef.current = next;
        return;
      }
      if (instance.isFocused) {
        hasAcceptedFocusedUpdateRef.current = true;
      }
      lastValueRef.current = next;
      onChange(next);
    },
  });

  useEffect((): void => {
    if (!editor) return;
    if (value === lastValueRef.current) return;
    const sanitized = sanitizeContent(value);
    if (sanitized === editor.getHTML()) {
      lastValueRef.current = value;
      return;
    }
    lastValueRef.current = value;
    editor.commands.setContent(sanitized, { emitUpdate: false });
  }, [editor, value]);

  useEffect((): void => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [editor, disabled]);

  const addLink = useCallback((): void => {
    if (!editor) return;
    void prompt({
      title: 'Insert Link',
      label: 'URL',
      placeholder: 'https://...',
      required: true,
      onConfirm: (href: string) => {
        editor.chain().focus().setLink({ href }).run();
      },
    });
  }, [editor, prompt]);

  const addImage = useCallback((): void => {
    if (!editor || !allowImage) return;
    void prompt({
      title: 'Insert Image',
      label: 'Image URL',
      placeholder: 'https://...',
      required: true,
      onConfirm: (src: string) => {
        editor.chain().focus().setImage({ src }).run();
      },
    });
  }, [editor, allowImage, prompt]);

  const addTable = useCallback((): void => {
    if (!editor || !allowTable) return;
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }, [allowTable, editor]);

  const setTextAlign = useCallback(
    (nextValue: TextAlignOption): void => {
      if (!allowTextAlign || !editor) return;
      editor.chain().focus().run();
      const { from, to, empty } = editor.state.selection;
      if (empty) return;

      let hasAlignableBlock = false;
      let hasPartiallySelectedBlock = false;
      editor.state.doc.nodesBetween(from, to, (node, position): void => {
        if (node.type.name !== 'paragraph' && node.type.name !== 'heading') return;
        const contentStart = position + 1;
        const contentEnd = position + node.nodeSize - 1;
        const intersectsSelection = to > contentStart && from < contentEnd;
        if (!intersectsSelection) return;
        hasAlignableBlock = true;
        if (from > contentStart || to < contentEnd) {
          hasPartiallySelectedBlock = true;
        }
      });

      if (hasAlignableBlock && hasPartiallySelectedBlock) {
        if (nextValue === 'left') {
          editor.chain().focus().unsetMark('inlineTextAlignStyle').run();
          return;
        }
        editor
          .chain()
          .focus()
          .unsetMark('inlineTextAlignStyle')
          .setMark('inlineTextAlignStyle', { textAlign: nextValue })
          .run();
        return;
      }

      const transaction = editor.state.tr;
      let changed = false;
      editor.state.doc.nodesBetween(from, to, (node, position): void => {
        if (node.type.name !== 'paragraph' && node.type.name !== 'heading') return;
        const currentAlign =
          typeof node.attrs['textAlign'] === 'string' ? node.attrs['textAlign'] : 'left';
        if (currentAlign === nextValue) return;
        changed = true;
        transaction.setNodeMarkup(position, undefined, {
          ...node.attrs,
          textAlign: nextValue,
        });
      });
      if (!changed) return;
      editor.view.dispatch(transaction.scrollIntoView());
    },
    [allowTextAlign, editor]
  );

  const isTextAlignActive = useCallback(
    (alignment: TextAlignOption): boolean => {
      if (!allowTextAlign || !editor) return false;
      return (
        editor.isActive('inlineTextAlignStyle', { textAlign: alignment }) ||
        editor.isActive('paragraph', { textAlign: alignment }) ||
        editor.isActive('heading', { textAlign: alignment })
      );
    },
    [allowTextAlign, editor]
  );

  const activeFontFamilyValue = useMemo((): string => {
    if (!allowFontFamily || !editor) return '__default__';
    const attributes = editor.getAttributes('fontFamilyStyle');
    const value = typeof attributes['fontFamily'] === 'string' ? attributes['fontFamily'] : '';
    return value.trim() || '__default__';
  }, [allowFontFamily, editor, value]);

  const fontFamilySelectOptions = useMemo(
    () => [{ value: '__default__', label: 'Font' }, ...normalizedFontFamilyOptions],
    [normalizedFontFamilyOptions]
  );
  const surfaceClassName = surfaceOptions?.className;
  const editorContentClassName = surfaceOptions?.editorContentClassName;
  const surfaceStyle = surfaceOptions?.style;

  if (!editor) {
    return (
      <InsetPanel
        radius='compact'
        padding='sm'
        className={cn('text-xs text-gray-400', surfaceClassName)}
        style={surfaceStyle}
      >
        {loadingLabel}
      </InsetPanel>
    );
  }

  const FontFamilySelect = (): React.JSX.Element | null => {
    const toolbarVariant = React.useContext(ToolbarVariantContext);
    if (!allowFontFamily) return null;

    return (
      <SelectSimple
        size='sm'
        className='w-auto shrink-0'
        value={activeFontFamilyValue}
        onValueChange={(nextValue: string): void => {
          if (nextValue === '__default__') {
            editor.chain().focus().unsetMark('fontFamilyStyle').run();
            return;
          }
          editor.chain().focus().setMark('fontFamilyStyle', { fontFamily: nextValue }).run();
        }}
        options={fontFamilySelectOptions}
        placeholder='Font'
        triggerClassName={cn(
          toolbarVariant === 'full'
            ? 'h-8 w-[168px] min-w-[168px] border-border/60 bg-gray-800 text-xs text-gray-100'
            : 'h-7 w-[136px] min-w-[136px] border-border/60 bg-card/60 text-xs text-gray-100'
        )}
        contentClassName='border-border bg-card text-white'
        ariaLabel='Select font family'
       title='Font'/>
    );
  };

  return (
    <div className={cn('space-y-2', containerClassName)}>
      <div
        className={cn(
          variant === 'full'
            ? 'flex flex-wrap items-center gap-1 rounded-lg border bg-gray-900 px-3 py-2'
            : 'flex flex-wrap gap-1 rounded border border-border/60 bg-card/40 p-2',
          toolbarClassName
        )}
      >
        <ToolbarVariantContext.Provider value={variant}>
          <ToolbarButton
            title='Undo'
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
          >
            <Undo className='size-4' />
          </ToolbarButton>
          <ToolbarButton
            title='Redo'
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
          >
            <Redo className='size-4' />
          </ToolbarButton>

          <ToolbarButton
            title='Bold'
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive('bold')}
          >
            <Bold className='size-4' />
          </ToolbarButton>
          <ToolbarButton
            title='Italic'
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive('italic')}
          >
            <Italic className='size-4' />
          </ToolbarButton>
          <ToolbarButton
            title='Underline'
            onClick={() => editor.chain().focus().toggleMark('underlineStyle').run()}
            isActive={editor.isActive('underlineStyle')}
          >
            <Underline className='size-4' />
          </ToolbarButton>
          <ToolbarButton
            title='Strikethrough'
            onClick={() => editor.chain().focus().toggleStrike().run()}
            isActive={editor.isActive('strike')}
          >
            <Strikethrough className='size-4' />
          </ToolbarButton>
          <ToolbarButton
            title='Code'
            onClick={() => editor.chain().focus().toggleCode().run()}
            isActive={editor.isActive('code')}
          >
            <Code className='size-4' />
          </ToolbarButton>

          {normalizedHeadingLevels.includes(1) ? (
            <ToolbarButton
              title='Heading 1'
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              isActive={editor.isActive('heading', { level: 1 })}
            >
              <Heading1 className='size-4' />
            </ToolbarButton>
          ) : null}
          {enableAdvancedTools ? (
            <ToolbarButton
              title='Paragraph'
              onClick={() => editor.chain().focus().setParagraph().run()}
              isActive={editor.isActive('paragraph')}
            >
              <Pilcrow className='size-4' />
            </ToolbarButton>
          ) : null}
          {normalizedHeadingLevels.includes(2) ? (
            <ToolbarButton
              title='Heading 2'
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              isActive={editor.isActive('heading', { level: 2 })}
            >
              <Heading2 className='size-4' />
            </ToolbarButton>
          ) : null}
          {normalizedHeadingLevels.includes(3) ? (
            <ToolbarButton
              title='Heading 3'
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              isActive={editor.isActive('heading', { level: 3 })}
            >
              <Heading3 className='size-4' />
            </ToolbarButton>
          ) : null}

          <ToolbarButton
            title='Bullet list'
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive('bulletList')}
          >
            <List className='size-4' />
          </ToolbarButton>
          <ToolbarButton
            title='Numbered list'
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive('orderedList')}
          >
            <ListOrdered className='size-4' />
          </ToolbarButton>
          {allowTaskList ? (
            <ToolbarButton
              title='Task list'
              onClick={() => editor.chain().focus().toggleTaskList().run()}
              isActive={editor.isActive('taskList')}
            >
              <CheckSquare className='size-4' />
            </ToolbarButton>
          ) : null}

          <ToolbarButton
            title='Quote'
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            isActive={editor.isActive('blockquote')}
          >
            <Quote className='size-4' />
          </ToolbarButton>

          {variant === 'full' ? (
            <>
              <ToolbarButton
                title='Horizontal rule'
                onClick={() => editor.chain().focus().setHorizontalRule().run()}
              >
                <Minus className='size-4' />
              </ToolbarButton>
              <ToolbarButton
                title='Code block'
                onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                isActive={editor.isActive('codeBlock')}
              >
                <Code className='size-4' />
              </ToolbarButton>
            </>
          ) : null}

          <ToolbarButton title='Link' onClick={addLink} isActive={editor.isActive('link')}>
            <LinkIcon className='size-4' />
          </ToolbarButton>
          {allowImage ? (
            <ToolbarButton title='Insert image' onClick={addImage}>
              <ImageIcon className='size-4' />
            </ToolbarButton>
          ) : null}
          {allowTable ? (
            <ToolbarButton title='Insert table' onClick={addTable}>
              <TableIcon className='size-4' />
            </ToolbarButton>
          ) : null}
          <FontFamilySelect />
          {allowTextAlign ? (
            <>
              <ToolbarButton
                title='Align left'
                onClick={() => setTextAlign('left')}
                isActive={isTextAlignActive('left')}
              >
                <AlignLeft className='size-4' />
              </ToolbarButton>
              <ToolbarButton
                title='Align right'
                onClick={() => setTextAlign('right')}
                isActive={isTextAlignActive('right')}
              >
                <AlignRight className='size-4' />
              </ToolbarButton>
              <ToolbarButton
                title='Align center'
                onClick={() => setTextAlign('center')}
                isActive={isTextAlignActive('center')}
              >
                <AlignCenter className='size-4' />
              </ToolbarButton>
              <ToolbarButton
                title='Justify'
                onClick={() => setTextAlign('justify')}
                isActive={isTextAlignActive('justify')}
              >
                <AlignJustify className='size-4' />
              </ToolbarButton>
            </>
          ) : null}
          {enableAdvancedTools ? (
            <ToolbarButton
              title='Clear formatting'
              onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
            >
              <Eraser className='size-4' />
            </ToolbarButton>
          ) : null}
        </ToolbarVariantContext.Provider>
      </div>

      <div
        className={cn(
          variant === 'full'
            ? 'w-full min-h-[250px] rounded-lg border border-border/60'
            : 'rounded border border-border/60 bg-card/20',
          surfaceClassName
        )}
        style={surfaceStyle}
      >
        <EditorContent
          editor={editor}
          className={cn(
            variant === 'full'
              ? '[&_.ProseMirror]:min-h-[250px] [&_.ProseMirror]:outline-none [&_.ProseMirror_p]:my-2 [&_.ProseMirror_h1]:text-2xl [&_.ProseMirror_h1]:font-bold [&_.ProseMirror_h1]:my-3 [&_.ProseMirror_h2]:text-xl [&_.ProseMirror_h2]:font-semibold [&_.ProseMirror_h2]:my-2 [&_.ProseMirror_h3]:text-lg [&_.ProseMirror_h3]:font-medium [&_.ProseMirror_h3]:my-2 [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:ml-6 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:ml-6 [&_.ProseMirror_blockquote]:border-l-4 [&_.ProseMirror_blockquote]:border-border/60 [&_.ProseMirror_blockquote]:pl-4 [&_.ProseMirror_blockquote]:italic [&_.ProseMirror_code]:bg-gray-800 [&_.ProseMirror_code]:px-1 [&_.ProseMirror_code]:rounded [&_.ProseMirror_pre]:bg-gray-800 [&_.ProseMirror_pre]:p-3 [&_.ProseMirror_pre]:rounded [&_.ProseMirror_pre]:overflow-x-auto [&_.ProseMirror_a]:text-blue-400 [&_.ProseMirror_a]:underline [&_.ProseMirror_img]:max-w-full [&_.ProseMirror_img]:rounded-lg [&_.ProseMirror_table]:border-collapse [&_.ProseMirror_table]:w-full [&_.ProseMirror_th]:border [&_.ProseMirror_th]:border-border/60 [&_.ProseMirror_th]:p-2 [&_.ProseMirror_th]:bg-gray-800 [&_.ProseMirror_td]:border [&_.ProseMirror_td]:border-border/60 [&_.ProseMirror_td]:p-2 [&_.ProseMirror_hr]:border-border/60 [&_.ProseMirror_hr]:my-4 [&_ul[data-type=taskList]]:list-none [&_ul[data-type=taskList]]:ml-0 [&_ul[data-type=taskList]_li]:flex [&_ul[data-type=taskList]_li]:items-start [&_ul[data-type=taskList]_li]:gap-2 [&_ul[data-type=taskList]_input]:mt-1'
              : '[&_.ProseMirror]:min-h-[220px] [&_.ProseMirror]:outline-none [&_.ProseMirror_p]:my-2 [&_.ProseMirror_ul]:ml-6 [&_.ProseMirror_ol]:ml-6 [&_.ProseMirror_blockquote]:border-l-2 [&_.ProseMirror_blockquote]:border-border/70 [&_.ProseMirror_blockquote]:pl-3 [&_.ProseMirror_h2]:text-lg [&_.ProseMirror_h2]:font-semibold',
            editorContentClassName
          )}
        />
        {!value.trim() && placeholder ? (
          <div className='pointer-events-none -mt-16 px-4 pb-4 text-xs text-gray-500'>
            {placeholder}
          </div>
        ) : null}
      </div>
      <PromptInputModal />
    </div>
  );
}
