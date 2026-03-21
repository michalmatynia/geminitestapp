'use client';

import React from 'react';

import { useNotesAppActions, useNotesAppState } from '@/features/notesapp/hooks/NotesAppContext';
import type {
  NoteRelationWithSource,
  NoteRelationWithTarget,
  RelatedNote,
} from '@/shared/contracts/notes';
import { Breadcrumbs } from '@/shared/ui';

import { useNoteCardHeaderRuntime } from './NoteCardHeader';
import { buildBreadcrumbPath, darkenColor } from '../../utils';

type BreadcrumbItem = { id: string | null; name: string };

export function NoteCardFooter(): React.JSX.Element | null {
  const { note, backgroundColor, relatedNoteStyle } = useNoteCardHeaderRuntime();
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

  const relatedNotes = React.useMemo((): RelatedNote[] => {
    if (note.relations && note.relations.length > 0) {
      return note.relations;
    }

    const build = (
      id: string | undefined,
      title: string | undefined,
      color: string | null | undefined
    ): RelatedNote | null =>
      id ? { id, title: title ?? 'Untitled note', color: color ?? null } : null;

    const fromRelations = (note.relationsFrom ?? [])
      .map((relation: NoteRelationWithTarget) =>
        build(
          relation.targetNote?.id ?? relation.targetNoteId,
          relation.targetNote?.title,
          relation.targetNote?.color
        )
      )
      .filter((item: RelatedNote | null): item is RelatedNote => Boolean(item));

    const toRelations = (note.relationsTo ?? [])
      .map((relation: NoteRelationWithSource) =>
        build(
          relation.sourceNote?.id ?? relation.sourceNoteId,
          relation.sourceNote?.title,
          relation.sourceNote?.color
        )
      )
      .filter((item: RelatedNote | null): item is RelatedNote => Boolean(item));

    return [...fromRelations, ...toRelations];
  }, [note]);

  if (!(showTimestamps || showBreadcrumbs || (showRelatedNotes && relatedNotes.length > 0))) {
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
          {relatedNotes
            .filter(
              (item: RelatedNote, index: number, array: RelatedNote[]) =>
                array.findIndex((entry: RelatedNote) => entry.id === item.id) === index
            )
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
