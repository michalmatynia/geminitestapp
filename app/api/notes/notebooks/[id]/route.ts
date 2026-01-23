import { NextResponse } from "next/server";
import { noteService } from "@/lib/services/noteService/index";
import { parseJsonBody } from "@/lib/api/parse-json";
import { notebookUpdateSchema } from "@/lib/validations/notes";
import { removeUndefined } from "@/lib/utils";
import { createErrorResponse } from "@/lib/api/handle-api-error";

/**
 * PATCH /api/notes/notebooks/[id]
 * Updates a notebook.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const parsed = await parseJsonBody(req, notebookUpdateSchema, {
      logPrefix: "notebooks.PATCH",
      allowEmpty: true,
    });
    if (!parsed.ok) {
      return parsed.response;
    }
    const notebook = await noteService.updateNotebook(id, removeUndefined(parsed.data));
    return NextResponse.json(notebook);
  } catch (error: unknown) {
    return createErrorResponse(error, {
      request: req,
      source: "notebooks.PATCH",
      fallbackMessage: "Failed to update notebook",
    });
  }
}

/**
 * DELETE /api/notes/notebooks/[id]
 * Deletes a notebook (and its notes/tags/categories).
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await noteService.deleteNotebook(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "notebooks.DELETE",
      fallbackMessage: "Failed to delete notebook",
    });
  }
}
