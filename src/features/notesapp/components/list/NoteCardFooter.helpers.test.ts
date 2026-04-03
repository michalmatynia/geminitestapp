import { describe, expect, it } from 'vitest';

import type { NoteWithRelations } from '@/shared/contracts/notes';

import {
  dedupeRelatedNotes,
  resolveNoteCardFooterRelatedNotes,
  shouldRenderNoteCardFooter,
} from './NoteCardFooter.helpers';

const makeNote = (overrides: Partial<NoteWithRelations> = {}): NoteWithRelations => ({
  id: 'note-1',
  createdAt: '2026-04-03T12:00:00.000Z',
  updatedAt: '2026-04-03T12:00:00.000Z',
  title: 'Primary note',
  content: 'Body',
  editorType: 'markdown',
  notebookId: null,
  categoryId: null,
  color: null,
  isPinned: false,
  isFavorite: false,
  isArchived: false,
  tags: [],
  tagIds: [],
  categories: [],
  categoryIds: [],
  relatedNoteIds: [],
  relations: [],
  relationsFrom: [],
  relationsTo: [],
  ...overrides,
});

describe('NoteCardFooter helpers', () => {
  it('prefers direct related notes when present', () => {
    expect(
      resolveNoteCardFooterRelatedNotes(
        makeNote({
          relations: [{ id: 'direct-1', title: 'Direct', color: '#111' }],
          relationsFrom: [
            {
              targetNoteId: 'fallback-1',
              targetNote: { id: 'fallback-1', title: 'Fallback', color: '#222' },
            },
          ] as NoteWithRelations['relationsFrom'],
        })
      )
    ).toEqual([{ id: 'direct-1', title: 'Direct', color: '#111' }]);
  });

  it('builds related notes from source and target relations with title and color fallbacks', () => {
    expect(
      resolveNoteCardFooterRelatedNotes(
        makeNote({
          relationsFrom: [
            {
              targetNoteId: 'target-1',
              targetNote: { id: 'target-1', title: undefined, color: null },
            },
          ] as NoteWithRelations['relationsFrom'],
          relationsTo: [
            {
              sourceNoteId: 'source-1',
              sourceNote: { id: 'source-1', title: 'Source title', color: '#123456' },
            },
          ] as NoteWithRelations['relationsTo'],
        })
      )
    ).toEqual([
      { id: 'target-1', title: 'Untitled note', color: null },
      { id: 'source-1', title: 'Source title', color: '#123456' },
    ]);
  });

  it('dedupes related notes by id and computes footer visibility', () => {
    const relatedNotes = dedupeRelatedNotes([
      { id: 'note-a', title: 'A', color: null },
      { id: 'note-a', title: 'A duplicate', color: '#fff' },
      { id: 'note-b', title: 'B', color: '#000' },
    ]);

    expect(relatedNotes).toEqual([
      { id: 'note-a', title: 'A', color: null },
      { id: 'note-b', title: 'B', color: '#000' },
    ]);
    expect(
      shouldRenderNoteCardFooter({
        relatedNotes,
        showBreadcrumbs: false,
        showRelatedNotes: true,
        showTimestamps: false,
      })
    ).toBe(true);
    expect(
      shouldRenderNoteCardFooter({
        relatedNotes: [],
        showBreadcrumbs: false,
        showRelatedNotes: true,
        showTimestamps: false,
      })
    ).toBe(false);
  });
});
