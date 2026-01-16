import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { noteService } from "@/lib/services/noteService/index";
import { parseJsonBody } from "@/lib/api/parse-json";
import { tagCreateSchema } from "@/lib/validations/notes";

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
    const errorId = randomUUID();
    console.error("[tags][GET] Failed to fetch tags", { errorId, error });
    return NextResponse.json(
      { error: "Failed to fetch tags", errorId },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notes/tags
 * Creates a new tag.
 */
export async function POST(req: Request) {
  try {
    const parsed = await parseJsonBody(req, tagCreateSchema, {
      logPrefix: "tags:POST",
    });
    if (!parsed.ok) {
      return parsed.response;
    }

    const resolvedNotebookId =
      parsed.data.notebookId ?? (await noteService.getOrCreateDefaultNotebook()).id;
    const tag = await noteService.createTag({
      ...parsed.data,
      notebookId: resolvedNotebookId,
    });
    return NextResponse.json(tag, { status: 201 });
  } catch (error: unknown) {
    const errorId = randomUUID();
    if (error instanceof Error) {
      console.error("[tags][POST] Failed to create tag", {
        errorId,
        message: error.message,
      });
      return NextResponse.json(
        { error: error.message, errorId },
        { status: 500 }
      );
    }
    console.error("[tags][POST] Unknown error creating tag", { errorId, error });
    return NextResponse.json(
      { error: "Failed to create tag", errorId },
      { status: 500 }
    );
  }
}
