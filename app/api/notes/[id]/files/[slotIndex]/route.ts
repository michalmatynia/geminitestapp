import { NextResponse } from "next/server";
import { deleteNoteFile } from "@/lib/utils/fileUploader";
import { noteService } from "@/lib/services/noteService";
import { createErrorResponse } from "@/lib/api/handle-api-error";
import { badRequestError, internalError, notFoundError } from "@/lib/errors/app-error";

const MAX_SLOT_INDEX = 9;

/**
 * DELETE /api/notes/[id]/files/[slotIndex]
 * Delete a file from a specific slot
 */
export async function DELETE(
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
      source: "notes.files.DELETE",
      fallbackMessage: "Failed to delete file",
    });
  }
}
