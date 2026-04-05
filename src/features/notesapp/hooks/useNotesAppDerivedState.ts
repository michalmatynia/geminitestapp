'use client';

import { useMemo } from 'react';

import type {
  NoteTagWithDetails,
  NoteWithRelations,
  TagRecord,
  UndoAction,
} from '@/shared/contracts/notes';
import { UI_GRID_RELAXED_CLASSNAME, UI_GRID_SPACED_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';
import { cn } from '@/shared/utils/ui-utils';

import type { NotesAppStateValue } from './NotesAppContext.types';

const formatUndoLabel = (action: UndoAction): string => {
  if (action.type === 'moveNote') return 'Moved note';
  if (action.type === 'moveFolder') return 'Moved folder';
  if (action.type === 'renameFolder') return `Renamed folder to "${action.toName}"`;
  return `Renamed note to "${action.toTitle}"`;
};

export function useNotesAppDerivedState({
  filters,
  notes,
  settings,
  undoStack,
}: {
  filters: NotesAppStateValue['filters'];
  notes: NoteWithRelations[];
  settings: NotesAppStateValue['settings'];
  undoStack: UndoAction[];
}): Pick<
  NotesAppStateValue,
  | 'sortedNotes'
  | 'pagedNotes'
  | 'totalPages'
  | 'noteLayoutClassName'
  | 'availableTagsInScope'
  | 'undoHistory'
> {
  const sortedNotes = useMemo((): NoteWithRelations[] => {
    const sorted: NoteWithRelations[] = [...notes].sort(
      (a: NoteWithRelations, b: NoteWithRelations): number => {
        if (settings.sortBy === 'name') {
          return a.title.localeCompare(b.title);
        }
        if (settings.sortBy === 'updated') {
          const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
          const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
          return aTime - bTime;
        }
        return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      }
    );
    return settings.sortOrder === 'desc' ? sorted.reverse() : sorted;
  }, [notes, settings.sortBy, settings.sortOrder]);

  const totalPages = useMemo((): number => {
    return Math.max(1, Math.ceil(sortedNotes.length / (filters.pageSize || 1)));
  }, [sortedNotes.length, filters.pageSize]);

  const pagedNotes = useMemo((): NoteWithRelations[] => {
    const clampedPage: number = Math.min(filters.page, totalPages);
    const start: number = (clampedPage - 1) * filters.pageSize;
    return sortedNotes.slice(start, start + filters.pageSize);
  }, [sortedNotes, filters.page, filters.pageSize, totalPages]);

  const noteLayoutClassName = useMemo((): string => {
    if (settings.viewMode === 'list') {
      return cn(UI_GRID_SPACED_CLASSNAME, 'grid-cols-1');
    }
    if (settings.gridDensity === 8) {
      return cn(
        UI_GRID_SPACED_CLASSNAME,
        'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8'
      );
    }
    return cn(UI_GRID_RELAXED_CLASSNAME, 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4');
  }, [settings.viewMode, settings.gridDensity]);

  const availableTagsInScope = useMemo((): TagRecord[] => {
    const tagMap: Map<string, TagRecord> = new Map<string, TagRecord>();
    notes.forEach((note: NoteWithRelations): void => {
      (note.tags as NoteTagWithDetails[]).forEach((noteTag: NoteTagWithDetails): void => {
        tagMap.set(noteTag.tagId, noteTag.tag);
      });
    });
    return Array.from(tagMap.values()).sort((a: TagRecord, b: TagRecord): number =>
      (a.name || '').localeCompare(b.name || '')
    );
  }, [notes]);

  const undoHistory = useMemo(
    (): { label: string }[] =>
      undoStack.map((action: UndoAction): { label: string } => ({
        label: formatUndoLabel(action),
      })),
    [undoStack]
  );

  return {
    sortedNotes,
    pagedNotes,
    totalPages,
    noteLayoutClassName,
    availableTagsInScope,
    undoHistory,
  };
}
