'use client';

import Link from '@tiptap/extension-link';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Italic, Link2, List, ListOrdered } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import { usePrompt } from '@/shared/hooks/ui/usePrompt';
import {
  Button,
  SelectSimple,
  Card,
  Hint,
} from '@/shared/ui';

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
      variant={active ? 'solid' : 'ghost'}
      size='icon'
      onClick={onClick}
      disabled={disabled}
      title={title}
      className='size-8 rounded-md'
    >
      {children}
    </Button>
  );
}

export function MiniRichTextEditor({
  value,
  onChange,
  label,
  minHeight = '120px',
  showFormatSelect = true,
  enableLists = true,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  minHeight?: string;
  showFormatSelect?: boolean;
  enableLists?: boolean;
}): React.JSX.Element {
  const { prompt, PromptInputModal } = usePrompt();

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: false,
      }),
      Link.configure({
        openOnClick: false,
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  const [formatValue, setFormatValue] = useState('paragraph');

  useEffect(() => {
    if (!editor) return;
    if (editor.isActive('heading', { level: 1 })) setFormatValue('heading-1');
    else if (editor.isActive('heading', { level: 2 })) setFormatValue('heading-2');
    else if (editor.isActive('heading', { level: 3 })) setFormatValue('heading-3');
    else setFormatValue('paragraph');
  }, [editor?.state.selection, editor]);

  const applyFormat = (type: string) => {
    if (!editor) return;
    if (type === 'paragraph') editor.chain().focus().setParagraph().run();
    else if (type === 'heading-1') editor.chain().focus().toggleHeading({ level: 1 }).run();
    else if (type === 'heading-2') editor.chain().focus().toggleHeading({ level: 2 }).run();
    else if (type === 'heading-3') editor.chain().focus().toggleHeading({ level: 3 }).run();
    setFormatValue(type);
  };

  const addLink = async () => {
    if (!editor) return;
    const url = await prompt({
      title: 'Insert Link',
      message: 'Enter the URL for the link:',
      label: 'URL',
      defaultValue: editor.getAttributes('link')['href'] as string | undefined,
    });

    if (url === null) return;    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
  };

  if (!editor) {
    return (
      <div className='space-y-2'>
        <Hint size='xxs' uppercase className='text-gray-500'>{label}</Hint>
        <Card variant='subtle-compact' padding='sm' className='text-xs text-gray-500'>
          Loading editor...
        </Card>
      </div>
    );
  }

  return (
    <div className='space-y-2'>
      <Hint size='xxs' uppercase className='text-gray-500'>{label}</Hint>
      <Card variant='subtle-compact' padding='none' className='flex flex-wrap items-center gap-1 bg-card/60 px-2 py-1'>
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
              triggerClassName='h-7 w-32 bg-card/40 text-xs'
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
          onClick={() => { void addLink(); }}
          active={editor.isActive('link')}
        >          <Link2 className='size-4' />
        </RichTextToolbarButton>
      </Card>
      <Card variant='subtle-compact' padding='none' className='bg-card/40'>
        <EditorContent
          editor={editor}
          className='px-3 py-2 [&_.ProseMirror]:min-h-[80px] [&_.ProseMirror]:outline-none [&_.ProseMirror_h1]:text-xl [&_.ProseMirror_h1]:font-semibold [&_.ProseMirror_h2]:text-lg [&_.ProseMirror_h2]:font-semibold [&_.ProseMirror_h3]:text-base [&_.ProseMirror_h3]:font-semibold [&_.ProseMirror_p]:my-1 [&_.ProseMirror_ul]:ml-5 [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ol]:ml-5 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_a]:text-blue-400 [&_.ProseMirror_a]:underline'
          style={{ minHeight }}
        />
      </Card>
      <PromptInputModal />
    </div>
  );
}
