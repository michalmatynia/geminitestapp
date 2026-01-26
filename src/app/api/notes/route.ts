import { NextResponse } from "next/server";
import { noteService } from "@/lib/services/noteService/index";
import { parseJsonBody } from "@/features/products/api/parse-json";
import { noteCreateSchema } from "@/lib/validations/notes";
import type { NoteFilters } from "@/types/notes";
import { createErrorResponse } from "@/lib/api/handle-api-error";
import { apiHandler } from "@/lib/api/api-handler";
import { ErrorSystem } from "@/lib/error-system";

/**
 * GET /api/notes
 * Fetches a list of notes with optional filters.
 */
async function GET_handler(req: Request) {
  const { searchParams } = new URL(req.url);

  const filters: NoteFilters = {
    truncateContent: searchParams.get("truncateContent") === "true",
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
    return NextResponse.json(notes);
  } catch (error) {
    await ErrorSystem.captureException(error, {
      service: "api/notes",
      method: "GET",
      filters,
    });
    return createErrorResponse(error, {
      request: req,
      source: "notes.GET",
      fallbackMessage: "Failed to fetch notes",
    });
  }
}

/**
 * POST /api/notes
 * Creates a new note.
 */
async function POST_handler(req: Request) {
  try {
    const parsed = await parseJsonBody(req, noteCreateSchema, {
      logPrefix: "notes.POST",
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
    return NextResponse.json(note, { status: 201 });
  } catch (error: unknown) {
    await ErrorSystem.captureException(error, {
      service: "api/notes",
      method: "POST",
    });
    return createErrorResponse(error, {
      request: req,
      source: "notes.POST",
      fallbackMessage: "Failed to create note",
    });
  }
}

export const GET = apiHandler(GET_handler, { source: "notes.GET" });
export const POST = apiHandler(POST_handler, { source: "notes.POST" });
