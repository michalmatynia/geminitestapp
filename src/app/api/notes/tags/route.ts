import { NextResponse } from "next/server";
import { noteService } from "@/features/notesapp";
import { parseJsonBody } from "@/features/products";
import { tagCreateSchema } from "@/features/notesapp";
import { removeUndefined } from "@/shared/utils";
import type { TagCreateInput } from "@/shared/types/notes";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { apiHandler } from "@/shared/lib/api/api-handler";

/**
 * GET /api/notes/tags
 * Fetches all tags.
 */
async function GET_handler(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const notebookIdParam = searchParams.get("notebookId");
    const notebook = notebookIdParam
      ? { id: notebookIdParam }
      : await noteService.getOrCreateDefaultNotebook();
    const tags = await noteService.getAllTags(notebook.id);
    return NextResponse.json(tags);
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "notes.tags.GET",
      fallbackMessage: "Failed to fetch tags",
    });
  }
}

/**
 * POST /api/notes/tags
 * Creates a new tag.
 */
async function POST_handler(req: Request) {
  try {
    const parsed = await parseJsonBody(req, tagCreateSchema, {
      logPrefix: "tags.POST",
    });
    if (!parsed.ok) {
      return parsed.response;
    }

    const resolvedNotebookId =
      parsed.data.notebookId ?? (await noteService.getOrCreateDefaultNotebook()).id;
    const tag = await noteService.createTag(removeUndefined({
      ...parsed.data,
      notebookId: resolvedNotebookId,
    }) as TagCreateInput);
    return NextResponse.json(tag, { status: 201 });
  } catch (error: unknown) {
    return createErrorResponse(error, {
      request: req,
      source: "notes.tags.POST",
      fallbackMessage: "Failed to create tag",
    });
  }
}

export const GET = apiHandler(GET_handler, { source: "notes.tags.GET" });
export const POST = apiHandler(POST_handler, { source: "notes.tags.POST" });
