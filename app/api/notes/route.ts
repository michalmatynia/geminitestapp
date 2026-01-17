import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { noteService } from "@/lib/services/noteService/index";
import { parseJsonBody } from "@/lib/api/parse-json";
import { noteCreateSchema } from "@/lib/validations/notes";
import type { NoteFilters, NoteWithRelations, RelatedNote } from "@/types/notes";

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
 * GET /api/notes
 * Fetches a list of notes with optional filters.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const filters: NoteFilters = {
    truncateContent: true,
  };
  const notebookIdParam = searchParams.get("notebookId");
  if (notebookIdParam) {
    filters.notebookId = notebookIdParam;
  } else {
    const notebook = await noteService.getOrCreateDefaultNotebook();
    filters.notebookId = notebook.id;
  }

  if (searchParams.has("search")) {
    filters.search = searchParams.get("search")!;
  }

  if (searchParams.has("searchScope")) {
    const scope = searchParams.get("searchScope");
    if (scope === "both" || scope === "title" || scope === "content") {
      filters.searchScope = scope;
    }
  }

  if (searchParams.has("isPinned")) {
    filters.isPinned = searchParams.get("isPinned") === "true";
  }

  if (searchParams.has("isArchived")) {
    filters.isArchived = searchParams.get("isArchived") === "true";
  }

  if (searchParams.has("isFavorite")) {
    filters.isFavorite = searchParams.get("isFavorite") === "true";
  }

  if (searchParams.has("tagIds")) {
    filters.tagIds = searchParams.get("tagIds")!.split(",");
  }

  if (searchParams.has("categoryIds")) {
    filters.categoryIds = searchParams.get("categoryIds")!.split(",");
  }

  try {
    const notes = await noteService.getAll(filters);
    const withRelations = notes.map((note) => ({
      ...note,
      relations: buildRelations(note),
    }));
    return NextResponse.json(withRelations);
  } catch (error) {
    const errorId = randomUUID();
    console.error("[notes][GET] Failed to fetch notes", {
      errorId,
      error,
      filters,
    });
    return NextResponse.json(
      { error: "Failed to fetch notes", errorId },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notes
 * Creates a new note.
 */
export async function POST(req: Request) {
  try {
    const parsed = await parseJsonBody(req, noteCreateSchema, {
      logPrefix: "notes:POST",
    });
    if (!parsed.ok) {
      return parsed.response;
    }

    const resolvedNotebookId =
      parsed.data.notebookId ?? (await noteService.getOrCreateDefaultNotebook()).id;
    const note = await noteService.create({
      ...parsed.data,
      notebookId: resolvedNotebookId,
    });
    return NextResponse.json(
      { ...note, relations: buildRelations(note) },
      { status: 201 }
    );
  } catch (error: unknown) {
    const errorId = randomUUID();
    if (error instanceof Error) {
      console.error("[notes][POST] Failed to create note", {
        errorId,
        message: error.message,
      });
      return NextResponse.json(
        { error: error.message, errorId },
        { status: 500 }
      );
    }
    console.error("[notes][POST] Unknown error creating note", {
      errorId,
      error,
    });
    return NextResponse.json(
      { error: "Failed to create note", errorId },
      { status: 500 }
    );
  }
}
