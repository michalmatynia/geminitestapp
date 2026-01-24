import { NextResponse } from "next/server";
import { deleteNoteFile } from "@/lib/utils/fileUploader";
import { noteService } from "@/lib/services/noteService";
import { createErrorResponse } from "@/lib/api/handle-api-error";
import { badRequestError, internalError, notFoundError } from "@/lib/errors/app-error";
import { apiHandlerWithParams } from "@/lib/api/api-handler";

const MAX_SLOT_INDEX = 9;

/**
 * DELETE /api/notes/[id]/files/[slotIndex]
 * Delete a file from a specific slot
 */
async function DELETE_handler(
  req: Request,
  { params }: { params: Promise<{ id: string; slotIndex: string }> }
) {
  const { id: noteId, slotIndex: slotIndexStr } = await params;

  try {
    const slotIndex = parseInt(slotIndexStr, 10);
    if (isNaN(slotIndex) || slotIndex < 0 || slotIndex > MAX_SLOT_INDEX) {
      throw badRequestError(`Slot index must be between 0 and ${MAX_SLOT_INDEX}`, {
        slotIndex: slotIndexStr,
      });
    }

    // Get the file to find its filepath
    const files = await noteService.getNoteFiles(noteId);
    const file = files.find((f) => f.slotIndex === slotIndex);

    if (!file) {
      throw notFoundError("File not found in this slot", { noteId, slotIndex });
    }

    const success = await deleteNoteFile(noteId, slotIndex, file.filepath);
    if (!success) {
      throw internalError("Failed to delete file", { noteId, slotIndex });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "notes.[id].files.[slotIndex].DELETE",
      fallbackMessage: "Failed to delete file",
    });
  }
}

export const DELETE = apiHandlerWithParams<{ id: string; slotIndex: string }>(async (req, _ctx, params) => DELETE_handler(req, { params: Promise.resolve(params) }), { source: "notes.[id].files.[slotIndex].DELETE" });
