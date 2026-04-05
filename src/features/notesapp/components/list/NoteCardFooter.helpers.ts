import type {
  NoteRelationWithSource,
  NoteRelationWithTarget,
  NoteWithRelations,
  RelatedNote,
} from '@/shared/contracts/notes';

const buildRelatedNote = (
  id: string | undefined,
  title: string | undefined,
  color: string | null | undefined
): RelatedNote | null => (id ? { id, title: title ?? 'Untitled note', color: color ?? null } : null);

const fromTargetRelation = (relation: NoteRelationWithTarget): RelatedNote | null =>
  buildRelatedNote(
    relation.targetNote?.id ?? relation.targetNoteId,
    relation.targetNote?.title,
    relation.targetNote?.color
  );

const fromSourceRelation = (relation: NoteRelationWithSource): RelatedNote | null =>
  buildRelatedNote(
    relation.sourceNote?.id ?? relation.sourceNoteId,
    relation.sourceNote?.title,
    relation.sourceNote?.color
  );

export const resolveNoteCardFooterRelatedNotes = (note: NoteWithRelations): RelatedNote[] => {
  if (note.relations && note.relations.length > 0) {
    return note.relations;
  }

  return [...(note.relationsFrom ?? []).map(fromTargetRelation), ...(note.relationsTo ?? []).map(fromSourceRelation)]
    .filter((item: RelatedNote | null): item is RelatedNote => Boolean(item));
};

export const dedupeRelatedNotes = (relatedNotes: RelatedNote[]): RelatedNote[] => {
  const seen = new Set<string>();

  return relatedNotes.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }

    seen.add(item.id);
    return true;
  });
};

export const shouldRenderNoteCardFooter = (input: {
  relatedNotes: RelatedNote[];
  showBreadcrumbs: boolean;
  showRelatedNotes: boolean;
  showTimestamps: boolean;
}): boolean =>
  input.showTimestamps ||
  input.showBreadcrumbs ||
  (input.showRelatedNotes && input.relatedNotes.length > 0);
