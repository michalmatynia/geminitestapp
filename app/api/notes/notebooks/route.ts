import { NextResponse } from "next/server";
import { noteService } from "@/lib/services/noteService/index";
import { parseJsonBody } from "@/lib/api/parse-json";
import { notebookCreateSchema } from "@/lib/validations/notes";
import { removeUndefined } from "@/lib/utils";
import type { NotebookCreateInput } from "@/types/notes";
import { createErrorResponse } from "@/lib/api/handle-api-error";

/**
 * GET /api/notes/notebooks
 * Fetches all notebooks (creates a default if none exist).
 */
export async function GET(req: Request) {
  try {
    const notebooks = await noteService.getAllNotebooks();
    return NextResponse.json(notebooks);
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "notebooks.GET",
      fallbackMessage: "Failed to fetch notebooks",
    });
  }
}

/**
 * POST /api/notes/notebooks
 * Creates a notebook.
 */
export async function POST(req: Request) {
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
      source: "notebooks.POST",
      fallbackMessage: "Failed to create notebook",
    });
  }
}
