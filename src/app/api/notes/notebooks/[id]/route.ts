import { NextRequest, NextResponse } from "next/server";
import { noteService } from "@/features/notesapp/server";
import { parseJsonBody } from "@/features/products/server";
import { notebookUpdateSchema } from "@/features/notesapp";
import { removeUndefined } from "@/shared/utils";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { apiHandlerWithParams } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";

/**
 * PATCH /api/notes/notebooks/[id]
 * Updates a notebook.
 */
async function PATCH_handler(req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
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
      source: "notes.notebooks.[id].PATCH",
      fallbackMessage: "Failed to update notebook",
    });
  }
}

/**
 * DELETE /api/notes/notebooks/[id]
 * Deletes a notebook (and its notes/tags/categories).
 */
async function DELETE_handler(req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  try {
    await noteService.deleteNotebook(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "notes.notebooks.[id].DELETE",
      fallbackMessage: "Failed to delete notebook",
    });
  }
}

export const PATCH = apiHandlerWithParams<{ id: string }>(
  async (req, _ctx, params) => PATCH_handler(req, { params: Promise.resolve(params) }), { source: "notes.notebooks.[id].PATCH" });
export const DELETE = apiHandlerWithParams<{ id: string }>(
  async (req, _ctx, params) => DELETE_handler(req, { params: Promise.resolve(params) }), { source: "notes.notebooks.[id].DELETE" });
