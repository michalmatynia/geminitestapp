import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { deleteNoteFile } from "@/lib/utils/fileUploader";
import { noteService } from "@/lib/services/noteService";

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
      return NextResponse.json(
        { error: `Slot index must be between 0 and ${MAX_SLOT_INDEX}` },
        { status: 400 }
      );
    }

    // Get the file to find its filepath
    const files = await noteService.getNoteFiles(noteId);
    const file = files.find((f) => f.slotIndex === slotIndex);

    if (!file) {
      return NextResponse.json(
        { error: "File not found in this slot" },
        { status: 404 }
      );
    }

    const success = await deleteNoteFile(noteId, slotIndex, file.filepath);
    if (!success) {
      return NextResponse.json(
        { error: "Failed to delete file" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const errorId = randomUUID();
    console.error("[notes][files][DELETE] Failed to delete file", {
      errorId,
      noteId,
      slotIndex: slotIndexStr,
      error,
    });
    return NextResponse.json(
      { error: "Failed to delete file", errorId },
      { status: 500 }
    );
  }
}
