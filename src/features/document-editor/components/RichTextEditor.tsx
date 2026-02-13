'use client';

import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { Table } from '@tiptap/extension-table';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableRow } from '@tiptap/extension-table-row';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  Bold,
  CheckSquare,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo,
  Table as TableIcon,
  Undo,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';

import { Button } from '@/shared/ui';
import { cn } from '@/shared/utils';

import type { RichTextEditorVariant } from '../types';

type HeadingLevel = 1 | 2 | 3;

export interface RichTextEditorProps {
  value: string;
  onChange: (nextValue: string) => void;
  placeholder?: string | undefined;
  variant?: RichTextEditorVariant | undefined;
  headingLevels?: HeadingLevel[] | undefined;
  allowImage?: boolean | undefined;
  allowTable?: boolean | undefined;
  allowTaskList?: boolean | undefined;
  loadingLabel?: string | undefined;
  containerClassName?: string | undefined;
  toolbarClassName?: string | undefined;
  surfaceClassName?: string | undefined;
  editorContentClassName?: string | undefined;
  surfaceStyle?: React.CSSProperties | undefined;
}

type ToolbarButtonProps = {
  title: string;
  onClick: () => void;
  isActive?: boolean | undefined;
  disabled?: boolean | undefined;
  variant: RichTextEditorVariant;
  children: React.ReactNode;
};

const sanitizeContent = (value: string | null | undefined): string => {
  if (!value) return '';
  if (typeof value !== 'string') return '';
  if (typeof document === 'undefined') return value;
  const root = document.createElement('div');
  root.innerHTML = value;
  return root.innerHTML;
};

function ToolbarButton({
  title,
  onClick,
  isActive = false,
  disabled = false,
  variant,
  children,
}: ToolbarButtonProps): React.JSX.Element {
  if (variant === 'full') {
    return (
      <Button
        type='button'
        onClick={onClick}
        disabled={disabled}
        title={title}
        className={cn(
          'rounded p-1.5 transition-colors',
          isActive
            ? 'bg-blue-600 text-white'
            : 'bg-gray-800 text-gray-200 hover:bg-gray-700',
          disabled && 'cursor-not-allowed opacity-50'
        )}
      >
        {children}
      </Button>
    );
  }

  return (
    <Button
      type='button'
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'h-7 w-7 rounded border p-0',
        isActive
          ? 'border-blue-500/50 bg-blue-500/20 text-blue-100'
          : 'border-border/60 bg-card/60 text-gray-200 hover:bg-muted/50'
      )}
    >
      {children}
    </Button>
  );
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  variant = 'compact',
  headingLevels = [2],
  allowImage = false,
  allowTable = false,
  allowTaskList = false,
  loadingLabel = 'Loading editor...',
  containerClassName,
  toolbarClassName,
  surfaceClassName,
  editorContentClassName,
  surfaceStyle,
}: RichTextEditorProps): React.JSX.Element {
  const lastValueRef = useRef(value);
  const headingLevelsSignature = headingLevels.join(',');

  const normalizedHeadingLevels = useMemo<HeadingLevel[]>(() => {
    const normalized = headingLevels
      .filter((level): level is HeadingLevel => level === 1 || level === 2 || level === 3)
      .filter((level, index, list) => list.indexOf(level) === index)
      .sort((left, right) => left - right);
    return normalized.length > 0 ? normalized : [2];
  }, [headingLevelsSignature]);

  const extensions = useMemo(() => {
    const activeExtensions = [
      StarterKit.configure({
        heading: { levels: normalizedHeadingLevels },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-300 underline hover:text-blue-200',
        },
      }),
    ];

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
  }, [allowImage, allowTable, allowTaskList, normalizedHeadingLevels]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions,
    content: sanitizeContent(value),
    editorProps: {
      attributes: {
        class:
          variant === 'full'
            ? 'prose prose-invert max-w-none min-h-[250px] px-4 py-3 focus:outline-none'
            : 'prose prose-invert max-w-none min-h-[220px] px-4 py-3 focus:outline-none',
      },
    },
    onUpdate: ({ editor: instance }: { editor: Editor }): void => {
      const next = instance.getHTML();
      if (next === lastValueRef.current) return;
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

  const addLink = useCallback((): void => {
    if (!editor) return;
    const href = window.prompt('Enter URL');
    if (!href) return;
    editor.chain().focus().setLink({ href }).run();
  }, [editor]);

  const addImage = useCallback((): void => {
    if (!editor || !allowImage) return;
    const src = window.prompt('Enter image URL');
    if (!src) return;
    editor.chain().focus().setImage({ src }).run();
  }, [allowImage, editor]);

  const addTable = useCallback((): void => {
    if (!editor || !allowTable) return;
    editor
      .chain()
      .focus()
      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      .run();
  }, [allowTable, editor]);

  if (!editor) {
    return (
      <div
        className={cn(
          'rounded border border-border/60 bg-card/40 p-3 text-xs text-gray-400',
          surfaceClassName
        )}
        style={surfaceStyle}
      >
        {loadingLabel}
      </div>
    );
  }

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
        <ToolbarButton
          title='Undo'
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          variant={variant}
        >
          <Undo className='size-4' />
        </ToolbarButton>
        <ToolbarButton
          title='Redo'
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          variant={variant}
        >
          <Redo className='size-4' />
        </ToolbarButton>

        <ToolbarButton
          title='Bold'
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          variant={variant}
        >
          <Bold className='size-4' />
        </ToolbarButton>
        <ToolbarButton
          title='Italic'
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          variant={variant}
        >
          <Italic className='size-4' />
        </ToolbarButton>
        <ToolbarButton
          title='Code'
          onClick={() => editor.chain().focus().toggleCode().run()}
          isActive={editor.isActive('code')}
          variant={variant}
        >
          <Code className='size-4' />
        </ToolbarButton>

        {normalizedHeadingLevels.includes(1) ? (
          <ToolbarButton
            title='Heading 1'
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            isActive={editor.isActive('heading', { level: 1 })}
            variant={variant}
          >
            <Heading1 className='size-4' />
          </ToolbarButton>
        ) : null}
        {normalizedHeadingLevels.includes(2) ? (
          <ToolbarButton
            title='Heading 2'
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            isActive={editor.isActive('heading', { level: 2 })}
            variant={variant}
          >
            <Heading2 className='size-4' />
          </ToolbarButton>
        ) : null}
        {normalizedHeadingLevels.includes(3) ? (
          <ToolbarButton
            title='Heading 3'
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            isActive={editor.isActive('heading', { level: 3 })}
            variant={variant}
          >
            <Heading3 className='size-4' />
          </ToolbarButton>
        ) : null}

        <ToolbarButton
          title='Bullet list'
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          variant={variant}
        >
          <List className='size-4' />
        </ToolbarButton>
        <ToolbarButton
          title='Numbered list'
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          variant={variant}
        >
          <ListOrdered className='size-4' />
        </ToolbarButton>
        {allowTaskList ? (
          <ToolbarButton
            title='Task list'
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            isActive={editor.isActive('taskList')}
            variant={variant}
          >
            <CheckSquare className='size-4' />
          </ToolbarButton>
        ) : null}

        <ToolbarButton
          title='Quote'
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive('blockquote')}
          variant={variant}
        >
          <Quote className='size-4' />
        </ToolbarButton>

        {variant === 'full' ? (
          <>
            <ToolbarButton
              title='Horizontal rule'
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
              variant={variant}
            >
              <Minus className='size-4' />
            </ToolbarButton>
            <ToolbarButton
              title='Code block'
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              isActive={editor.isActive('codeBlock')}
              variant={variant}
            >
              <Code className='size-4' />
            </ToolbarButton>
          </>
        ) : null}

        <ToolbarButton
          title='Link'
          onClick={addLink}
          isActive={editor.isActive('link')}
          variant={variant}
        >
          <LinkIcon className='size-4' />
        </ToolbarButton>
        {allowImage ? (
          <ToolbarButton
            title='Insert image'
            onClick={addImage}
            variant={variant}
          >
            <ImageIcon className='size-4' />
          </ToolbarButton>
        ) : null}
        {allowTable ? (
          <ToolbarButton
            title='Insert table'
            onClick={addTable}
            variant={variant}
          >
            <TableIcon className='size-4' />
          </ToolbarButton>
        ) : null}
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
    </div>
  );
}
