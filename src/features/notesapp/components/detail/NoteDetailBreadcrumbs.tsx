'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { useNotesAppActions, useNotesAppState } from '@/features/notesapp/hooks/NotesAppContext';
import { Button } from '@/shared/ui';
import { buildBreadcrumbPath } from '../../utils';

type BreadcrumbItem = { id: string | null; name: string; isNote?: boolean };

export function NoteDetailBreadcrumbs(): React.JSX.Element | null {
  const { selectedNote, folderTree, isFolderTreeCollapsed } = useNotesAppState();
  const { setIsFolderTreeCollapsed, setSelectedFolderId, setSelectedNote, setIsEditing } =
    useNotesAppActions();

  if (!selectedNote) return null;

  const onExpandFolderTree = (): void => setIsFolderTreeCollapsed(false);

  const categories = folderTree;
  const breadcrumbs = buildBreadcrumbPath(
    selectedNote.categories?.[0]?.categoryId || null,
    selectedNote.title,
    categories
  );

  return (
    <div className='mb-4 flex items-center gap-2 text-sm text-gray-400'>
      {isFolderTreeCollapsed && (
        <Button
          onClick={onExpandFolderTree}
          variant='outline'
          className='border text-gray-300 hover:bg-muted/50 hover:text-white'
        >
          <ChevronLeft className='-scale-x-100' size={16} />
          <span className='ml-2'>Show Folders</span>
        </Button>
      )}
      {breadcrumbs.map((crumb: BreadcrumbItem, index: number, array: BreadcrumbItem[]) => (
        <React.Fragment key={index}>
          {crumb.isNote ? (
            <span className='text-gray-300'>{crumb.name}</span>
          ) : (
            <Button
              variant='link'
              onClick={(): void => {
                setSelectedFolderId(crumb.id);
                setSelectedNote(null);
                setIsEditing(false);
              }}
              className='h-auto p-0 text-gray-400 hover:text-blue-400 transition'
            >
              {crumb.name}
            </Button>
          )}
          {index < array.length - 1 && <ChevronRight size={16} className='text-gray-600' />}
        </React.Fragment>
      ))}
    </div>
  );
}
