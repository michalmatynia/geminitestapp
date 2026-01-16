import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { noteService } from "@/lib/services/noteService/index";
import { parseJsonBody } from "@/lib/api/parse-json";
import { notebookUpdateSchema } from "@/lib/validations/notes";

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
      logPrefix: "notebooks:PATCH",
      allowEmpty: true,
    });
    if (!parsed.ok) {
      return parsed.response;
    }
    const notebook = await noteService.updateNotebook(id, parsed.data);
    return NextResponse.json(notebook);
  } catch (error: unknown) {
    const errorId = randomUUID();
    if (error instanceof Error) {
      console.error("[notebooks][PATCH] Failed to update notebook", {
        errorId,
        notebookId: id,
        message: error.message,
      });
      return NextResponse.json(
        { error: error.message, errorId },
        { status: 500 }
      );
    }
    console.error("[notebooks][PATCH] Unknown error updating notebook", {
      errorId,
      notebookId: id,
      error,
    });
    return NextResponse.json(
      { error: "Failed to update notebook", errorId },
      { status: 500 }
    );
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
    const errorId = randomUUID();
    console.error("[notebooks][DELETE] Failed to delete notebook", {
      errorId,
      notebookId: id,
      error,
    });
    return NextResponse.json(
      { error: "Failed to delete notebook", errorId },
      { status: 500 }
    );
  }
}
