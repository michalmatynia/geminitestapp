'use client';

import Link from '@tiptap/extension-link';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading2,
  Quote,
  Undo,
  Redo,
  Code,
} from 'lucide-react';
import React, { useCallback, useEffect, useRef } from 'react';

import { Button } from '@/shared/ui';

type CaseResolverRichTextEditorProps = {
  value: string;
  onChange: (nextValue: string) => void;
  placeholder?: string;
};

type ToolbarButtonProps = {
  title: string;
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
};

function ToolbarButton({
  title,
  onClick,
  isActive = false,
  disabled = false,
  children,
}: ToolbarButtonProps): React.JSX.Element {
  return (
    <Button
      type='button'
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`h-7 w-7 rounded border p-0 ${
        isActive
          ? 'border-blue-500/50 bg-blue-500/20 text-blue-100'
          : 'border-border/60 bg-card/60 text-gray-200 hover:bg-muted/50'
      }`}
    >
      {children}
    </Button>
  );
}

const sanitizeContent = (value: string | null | undefined): string => {
  if (!value) return '';
  const root = document.createElement('div');
  root.innerHTML = value;
  return root.innerHTML;
};

export function CaseResolverRichTextEditor({
  value,
  onChange,
  placeholder,
}: CaseResolverRichTextEditorProps): React.JSX.Element {
  const lastValueRef = useRef(value);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2] },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-300 underline',
        },
      }),
    ],
    content: sanitizeContent(value),
    editorProps: {
      attributes: {
        class:
          'prose prose-invert max-w-none min-h-[220px] px-4 py-3 focus:outline-none',
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

  if (!editor) {
    return (
      <div className='rounded border border-border/60 bg-card/40 p-3 text-xs text-gray-400'>
        Loading editor...
      </div>
    );
  }

  return (
    <div className='space-y-2'>
      <div className='flex flex-wrap gap-1 rounded border border-border/60 bg-card/40 p-2'>
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
          title='Code'
          onClick={() => editor.chain().focus().toggleCode().run()}
          isActive={editor.isActive('code')}
        >
          <Code className='size-4' />
        </ToolbarButton>
        <ToolbarButton
          title='Heading'
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive('heading', { level: 2 })}
        >
          <Heading2 className='size-4' />
        </ToolbarButton>
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
        <ToolbarButton
          title='Quote'
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive('blockquote')}
        >
          <Quote className='size-4' />
        </ToolbarButton>
        <ToolbarButton
          title='Link'
          onClick={addLink}
          isActive={editor.isActive('link')}
        >
          ↗
        </ToolbarButton>
      </div>

      <div className='rounded border border-border/60 bg-card/20'>
        <EditorContent
          editor={editor}
          className='[&_.ProseMirror]:min-h-[220px] [&_.ProseMirror]:outline-none [&_.ProseMirror_p]:my-2 [&_.ProseMirror_ul]:ml-6 [&_.ProseMirror_ol]:ml-6 [&_.ProseMirror_blockquote]:border-l-2 [&_.ProseMirror_blockquote]:border-border/70 [&_.ProseMirror_blockquote]:pl-3 [&_.ProseMirror_h2]:text-lg [&_.ProseMirror_h2]:font-semibold'
        />
        {!value?.trim() && placeholder ? (
          <div className='pointer-events-none -mt-16 px-4 pb-4 text-xs text-gray-500'>
            {placeholder}
          </div>
        ) : null}
      </div>
    </div>
  );
}
