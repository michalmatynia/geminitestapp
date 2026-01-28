import { NextResponse } from "next/server";
import { noteService } from "@/features/notesapp/server";
import { parseJsonBody } from "@/features/products/server";
import { notebookCreateSchema } from "@/features/notesapp";
import { removeUndefined } from "@/shared/utils";
import type { NotebookCreateInput } from "@/shared/types/notes";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { apiHandler } from "@/shared/lib/api/api-handler";

/**
 * GET /api/notes/notebooks
 * Fetches all notebooks (creates a default if none exist).
 */
async function GET_handler(req: Request) {
  try {
    const notebooks = await noteService.getAllNotebooks();
    return NextResponse.json(notebooks);
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "notes.notebooks.GET",
      fallbackMessage: "Failed to fetch notebooks",
    });
  }
}

/**
 * POST /api/notes/notebooks
 * Creates a notebook.
 */
async function POST_handler(req: Request) {
  try {
    const parsed = await parseJsonBody(req, notebookCreateSchema, {
      logPrefix: "notebooks.POST",
    });
    if (!parsed.ok) {
      return parsed.response;
    }
    const notebook = await noteService.createNotebook(removeUndefined(parsed.data) as NotebookCreateInput);
    return NextResponse.json(notebook, { status: 201 });
  } catch (error: unknown) {
    return createErrorResponse(error, {
      request: req,
      source: "notes.notebooks.POST",
      fallbackMessage: "Failed to create notebook",
    });
  }
}

export const GET = apiHandler(GET_handler, { source: "notes.notebooks.GET" });
export const POST = apiHandler(POST_handler, { source: "notes.notebooks.POST" });
