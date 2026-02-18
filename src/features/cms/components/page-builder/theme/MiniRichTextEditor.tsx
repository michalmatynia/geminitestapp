'use client';

import Link from '@tiptap/extension-link';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Italic, Link2, List, ListOrdered } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

import { usePrompt } from '@/shared/hooks/ui/usePrompt';
import {
  Button,
  Label,
  SelectSimple,
} from '@/shared/ui';

import { sanitizeRichText } from './theme-utils';

function RichTextToolbarButton({
  title,
  onClick,
  active,
  disabled,
  children,
}: {
  title: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <Button
      type='button'
      variant='ghost'
      size='icon'
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`size-8 rounded-md ${active ? 'bg-blue-600 text-white hover:bg-blue-500' : 'text-gray-300 hover:text-white'}`}
    >
      {children}
    </Button>
  );
}

export function MiniRichTextEditor({
  label,
  value,
  onChange,
  minHeight = 90,
  showFormatSelect = false,
  enableLists = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  minHeight?: number;
  showFormatSelect?: boolean;
  enableLists?: boolean;
}): React.JSX.Element {
  const { prompt, PromptInputModal } = usePrompt();
  const lastValueRef = useRef<string>(value);
  const [formatValue, setFormatValue] = useState<string>('paragraph');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: showFormatSelect ? { levels: [1, 2, 3] } : false,
        ...(enableLists ? {} : { bulletList: false, orderedList: false, listItem: false }),
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-400 underline hover:text-blue-300',
        },
      }),
    ],
    content: sanitizeRichText(value),
    editorProps: {
      attributes: {
        class: 'min-h-full outline-none text-sm text-gray-200',
      },
    },
    onUpdate: ({ editor }: { editor: Editor }): void => {
      const html = editor.getHTML();
      if (html !== lastValueRef.current) {
        lastValueRef.current = html;
        onChange(html);
      }
    },
  });

  useEffect((): void => {
    if (!editor) return;
    if (value === lastValueRef.current) return;
    const sanitized = sanitizeRichText(value);
    if (sanitized !== editor.getHTML()) {
      lastValueRef.current = sanitized;
      editor.commands.setContent(sanitized, { emitUpdate: false });
    }
  }, [value, editor]);

  useEffect((): void | (() => void) => {
    if (!editor || !showFormatSelect) return;
    const updateFormat = (): void => {
      if (editor.isActive('heading', { level: 1 })) {
        setFormatValue('heading-1');
        return;
      }
      if (editor.isActive('heading', { level: 2 })) {
        setFormatValue('heading-2');
        return;
      }
      if (editor.isActive('heading', { level: 3 })) {
        setFormatValue('heading-3');
        return;
      }
      setFormatValue('paragraph');
    };
    updateFormat();
    editor.on('selectionUpdate', updateFormat);
    editor.on('transaction', updateFormat);
    return (): void => {
      editor.off('selectionUpdate', updateFormat);
      editor.off('transaction', updateFormat);
    };
  }, [editor, showFormatSelect]);

  const applyFormat = (format: string): void => {
    if (!editor) return;
    if (format === 'paragraph') {
      editor.chain().focus().setParagraph().run();
      return;
    }
    const level = format === 'heading-1' ? 1 : format === 'heading-2' ? 2 : 3;
    editor.chain().focus().setHeading({ level }).run();
  };

  const addLink = (): void => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link')['href'] as string | undefined;
    prompt({
      title: 'Insert Link',
      label: 'URL',
      defaultValue: previousUrl ?? '',
      placeholder: 'https://...',
      onConfirm: (url) => {
        if (url.trim() === '') {
          editor.chain().focus().unsetLink().run();
          return;
        }
        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
      }
    });
  };

  if (!editor) {
    return (
      <div className='space-y-2'>
        <Label className='text-[10px] uppercase tracking-wider text-gray-500'>{label}</Label>
        <div className='rounded border border-border/50 bg-gray-800/40 p-3 text-xs text-gray-500'>
          Loading editor...
        </div>
      </div>
    );
  }

  return (
    <div className='space-y-2'>
      <Label className='text-[10px] uppercase tracking-wider text-gray-500'>{label}</Label>
      <div className='flex flex-wrap items-center gap-1 rounded border border-border/50 bg-gray-900/60 px-2 py-1'>
        {showFormatSelect && (
          <div className='mr-2'>
            <SelectSimple
              size='xs'
              value={formatValue}
              onValueChange={applyFormat}
              options={[
                { value: 'paragraph', label: 'Paragraph' },
                { value: 'heading-1', label: 'Heading 1' },
                { value: 'heading-2', label: 'Heading 2' },
                { value: 'heading-3', label: 'Heading 3' },
              ]}
              triggerClassName='h-7 w-32 bg-gray-800/60 text-xs'
            />
          </div>
        )}
        <RichTextToolbarButton
          title='Bold'
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
        >
          <Bold className='size-4' />
        </RichTextToolbarButton>
        <RichTextToolbarButton
          title='Italic'
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
        >
          <Italic className='size-4' />
        </RichTextToolbarButton>
        {enableLists && (
          <>
            <RichTextToolbarButton
              title='Bullet list'
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              active={editor.isActive('bulletList')}
            >
              <List className='size-4' />
            </RichTextToolbarButton>
            <RichTextToolbarButton
              title='Numbered list'
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              active={editor.isActive('orderedList')}
            >
              <ListOrdered className='size-4' />
            </RichTextToolbarButton>
          </>
        )}
        <RichTextToolbarButton
          title='Insert link'
          onClick={addLink}
          active={editor.isActive('link')}
        >
          <Link2 className='size-4' />
        </RichTextToolbarButton>
      </div>
      <div className='rounded border border-border/50 bg-gray-800/40'>
        <EditorContent
          editor={editor}
          className='px-3 py-2 [&_.ProseMirror]:min-h-[80px] [&_.ProseMirror]:outline-none [&_.ProseMirror_h1]:text-xl [&_.ProseMirror_h1]:font-semibold [&_.ProseMirror_h2]:text-lg [&_.ProseMirror_h2]:font-semibold [&_.ProseMirror_h3]:text-base [&_.ProseMirror_h3]:font-semibold [&_.ProseMirror_p]:my-1 [&_.ProseMirror_ul]:ml-5 [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ol]:ml-5 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_a]:text-blue-400 [&_.ProseMirror_a]:underline'
          style={{ minHeight }}
        />
      </div>
      <PromptInputModal />
    </div>
  );
}
