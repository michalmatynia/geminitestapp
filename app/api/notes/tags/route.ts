import { NextResponse } from "next/server";
import { noteService } from "@/lib/services/noteService/index";
import { parseJsonBody } from "@/lib/api/parse-json";
import { tagCreateSchema } from "@/lib/validations/notes";
import { removeUndefined } from "@/lib/utils";
import type { TagCreateInput } from "@/types/notes";
import { createErrorResponse } from "@/lib/api/handle-api-error";

/**
 * GET /api/notes/tags
 * Fetches all tags.
 */
export async function GET(req: Request) {
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
      source: "tags.GET",
      fallbackMessage: "Failed to fetch tags",
    });
  }
}

/**
 * POST /api/notes/tags
 * Creates a new tag.
 */
export async function POST(req: Request) {
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
      source: "tags.POST",
      fallbackMessage: "Failed to create tag",
    });
  }
}
