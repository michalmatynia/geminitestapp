'use client';

import React from 'react';
import Image from 'next/image';

import type { NoteFileRecord } from '@/shared/contracts/notes';
import { Tag } from '@/shared/ui';
import { sanitizeHtml } from '@/shared/utils';
import { renderMarkdownToHtml } from '../../utils';
import { useNoteCardHeaderRuntime } from './NoteCardHeader';

export function NoteCardContent(): React.JSX.Element {
  const { note } = useNoteCardHeaderRuntime();
  const contentHtml = React.useMemo((): string => {
    let html =
      (note.editorType as string) === 'wysiwyg' ? note.content : renderMarkdownToHtml(note.content);
    // Remove image tags from preview to avoid duplication with thumbnail
    html = html.replace(/<img[^>]*>/g, '');
    // Also remove image paragraphs (markdown renders images in <p> tags)
    html = html.replace(/<p>\s*<\/p>/g, '');
    return sanitizeHtml(html);
  }, [note.content, note.editorType]);

  const thumbnailFile = note.files?.find(
    (file: NoteFileRecord) => file.mimetype?.startsWith('image/') && file.filepath
  );

  return (
    <div className='pt-0'>
      {thumbnailFile && (
        <div className='mb-3 overflow-hidden rounded-md border'>
          <Image
            src={thumbnailFile.filepath}
            alt={thumbnailFile.filename}
            width={320}
            height={180}
            className='h-28 w-full object-cover'
            sizes='(min-width: 1024px) 240px, 100vw'
          />
        </div>
      )}
      <div
        className='mb-3 max-h-36 overflow-hidden text-sm prose prose-sm'
        dangerouslySetInnerHTML={{ __html: contentHtml }}
      />
      <div className='flex flex-wrap gap-2'>
        {note.tags?.map((nt: { tagId: string; tag: { color?: string | null; name?: string } }) => (
          <Tag key={nt.tagId} color={nt.tag.color ?? null} label={nt.tag.name || 'Unnamed'} />
        ))}
      </div>
    </div>
  );
}
