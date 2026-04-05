'use client';

import React from 'react';

import { useNotesAppActions, useNotesAppState } from '@/features/notesapp/hooks/NotesAppContext';
import type {
  NoteWithRelations,
  RelatedNote,
} from '@/shared/contracts/notes';
import { Breadcrumbs } from '@/shared/ui/navigation-and-layout.public';

import { buildBreadcrumbPath, darkenColor } from '../../utils';
import {
  dedupeRelatedNotes,
  resolveNoteCardFooterRelatedNotes,
  shouldRenderNoteCardFooter,
} from './NoteCardFooter.helpers';

type BreadcrumbItem = { id: string | null; name: string };

export type NoteCardFooterProps = {
  note: NoteWithRelations;
  backgroundColor: string;
  relatedNoteStyle: React.CSSProperties;
};

export function NoteCardFooter(props: NoteCardFooterProps): React.JSX.Element | null {
  const { note, backgroundColor, relatedNoteStyle } = props;
  const { folderTree, settings } = useNotesAppState();
  const { setSelectedFolderId, setSelectedNote, setIsEditing } = useNotesAppActions();

  const showTimestamps = settings.showTimestamps;
  const showBreadcrumbs = settings.showBreadcrumbs;
  const showRelatedNotes = settings.showRelatedNotes;

  const onSelectFolder = (folderId: string | null): void => {
    setSelectedFolderId(folderId);
    setSelectedNote(null);
    setIsEditing(false);
  };

  const breadcrumbs = React.useMemo(
    () =>
      buildBreadcrumbPath(
        note.categories?.[0]?.categoryId || null,
        null,
        folderTree
      ) as BreadcrumbItem[],
    [note.categories, folderTree]
  );

  const relatedNotes = React.useMemo((): RelatedNote[] => resolveNoteCardFooterRelatedNotes(note), [note]);

  if (
    !shouldRenderNoteCardFooter({
      relatedNotes,
      showBreadcrumbs,
      showRelatedNotes,
      showTimestamps,
    })
  ) {
    return null;
  }

  return (
    <div className='flex flex-col items-stretch pt-2 mt-2 border-t border-white/10'>
      {showTimestamps && (
        <div className='flex flex-col gap-0.5 text-[10px] text-gray-500'>
          <span>Created: {new Date(note.createdAt || 0).toLocaleString()}</span>
          <span>
            Modified: {note.updatedAt ? new Date(note.updatedAt || 0).toLocaleString() : 'Never'}
          </span>
        </div>
      )}
      {showBreadcrumbs && (
        <div className={showTimestamps ? 'mt-3' : ''}>
          <Breadcrumbs
            scrollable
            backgroundColor={darkenColor(backgroundColor, 20)}
            items={breadcrumbs.map((crumb) => ({
              label: crumb.name,
              onClick: (e) => {
                e.stopPropagation();
                if (crumb.id) onSelectFolder(crumb.id);
              },
            }))}
          />
        </div>
      )}

      {showRelatedNotes && relatedNotes.length > 0 && (
        <div className='mt-2 flex flex-wrap gap-2'>
          {dedupeRelatedNotes(relatedNotes)
            .slice(0, 4)
            .map((related: RelatedNote) => (
              <div
                key={related.id}
                className='w-24 cursor-pointer rounded-md px-2 py-1 text-[10px]'
                style={relatedNoteStyle}
              >
                <div className='truncate font-semibold'>{related.title}</div>
                <div className='line-clamp-2 text-[9px] opacity-80'>No content</div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
