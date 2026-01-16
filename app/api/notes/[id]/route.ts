import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { noteService } from "@/lib/services/noteService/index";
import { parseJsonBody } from "@/lib/api/parse-json";
import { noteUpdateSchema } from "@/lib/validations/notes";
import type { NoteWithRelations, RelatedNote } from "@/types/notes";

const buildRelations = (note: NoteWithRelations): RelatedNote[] => {
  const relations = [
    ...(note.relationsFrom ?? []).map((rel) => rel.targetNote),
    ...(note.relationsTo ?? []).map((rel) => rel.sourceNote),
  ];
  const seen = new Set<string>();
  return relations.filter((rel) => {
    if (!rel?.id || seen.has(rel.id)) return false;
    seen.add(rel.id);
    return true;
  });
};

/**
 * GET /api/notes/[id]
 * Fetches a single note by ID.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const note = await noteService.getById(id);

    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    return NextResponse.json({ ...note, relations: buildRelations(note) });
  } catch (error) {
    const errorId = randomUUID();
    console.error("[notes][GET] Failed to fetch note", {
      errorId,
      noteId: id,
      error,
    });
    return NextResponse.json(
      { error: "Failed to fetch note", errorId },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/notes/[id]
 * Updates a note.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const parsed = await parseJsonBody(req, noteUpdateSchema, {
      logPrefix: "notes:PATCH",
      allowEmpty: true,
    });
    if (!parsed.ok) {
      return parsed.response;
    }
    const body = parsed.data;
    const previousNote = await noteService.getById(id);
    const note = await noteService.update(id, body);

    if (Array.isArray(body.relatedNoteIds) && previousNote) {
      const previousRelatedIds =
        previousNote.relationsFrom?.map((rel) => rel.targetNote.id) || [];
      const nextRelatedIds = body.relatedNoteIds;
      const addedRelations = nextRelatedIds.filter(
        (relId) => !previousRelatedIds.includes(relId) && relId !== id
      );
      const removedRelations = previousRelatedIds.filter(
        (relId) => !nextRelatedIds.includes(relId) && relId !== id
      );

      const syncRelatedNote = async (relatedId: string, shouldAdd: boolean) => {
        try {
          const relatedNote = await noteService.getById(relatedId);
          if (!relatedNote) return;
          const relatedIds =
            relatedNote.relationsFrom?.map((rel) => rel.targetNote.id) || [];
          const nextIds = shouldAdd
            ? Array.from(new Set([...relatedIds, id]))
            : relatedIds.filter((relId) => relId !== id);
          await noteService.update(relatedId, { relatedNoteIds: nextIds });
        } catch (syncError) {
          console.error("[notes][PATCH] Failed to sync relation", {
            noteId: id,
            relatedId,
            syncError,
          });
        }
      };

      await Promise.all([
        ...addedRelations.map((relId) => syncRelatedNote(relId, true)),
        ...removedRelations.map((relId) => syncRelatedNote(relId, false)),
      ]);
    }

    return NextResponse.json(
      note ? { ...note, relations: buildRelations(note) } : note
    );
  } catch (error: unknown) {
    const errorId = randomUUID();
    if (error instanceof Error) {
      console.error("[notes][PATCH] Failed to update note", {
        errorId,
        noteId: id,
        message: error.message,
      });
      return NextResponse.json(
        { error: error.message, errorId },
        { status: 500 }
      );
    }
    console.error("[notes][PATCH] Unknown error updating note", {
      errorId,
      noteId: id,
      error,
    });
    return NextResponse.json(
      { error: "Failed to update note", errorId },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notes/[id]
 * Deletes a note.
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await noteService.delete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const errorId = randomUUID();
    console.error("[notes][DELETE] Failed to delete note", {
      errorId,
      noteId: id,
      error,
    });
    return NextResponse.json(
      { error: "Failed to delete note", errorId },
      { status: 500 }
    );
  }
}
