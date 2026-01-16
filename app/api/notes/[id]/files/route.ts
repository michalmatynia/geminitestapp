import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { uploadNoteFile } from "@/lib/utils/fileUploader";
import { noteService } from "@/lib/services/noteService";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_SLOT_INDEX = 9;

/**
 * GET /api/notes/[id]/files
 * Get all files for a note
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const files = await noteService.getNoteFiles(id);
    return NextResponse.json(files);
  } catch (error) {
    const errorId = randomUUID();
    console.error("[notes][files][GET] Failed to get files", {
      errorId,
      noteId: id,
      error,
    });
    return NextResponse.json(
      { error: "Failed to get files", errorId },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notes/[id]/files
 * Upload a file to a specific slot
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: noteId } = await params;

  try {
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json(
        { error: "Invalid form data" },
        { status: 400 }
      );
    }

    const file = formData.get("file") as File | null;
    const slotIndexStr = formData.get("slotIndex") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (!slotIndexStr) {
      return NextResponse.json(
        { error: "No slot index provided" },
        { status: 400 }
      );
    }

    const slotIndex = parseInt(slotIndexStr, 10);
    if (isNaN(slotIndex) || slotIndex < 0 || slotIndex > MAX_SLOT_INDEX) {
      return NextResponse.json(
        { error: `Slot index must be between 0 and ${MAX_SLOT_INDEX}` },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit" },
        { status: 400 }
      );
    }

    // Check if note exists
    const note = await noteService.getById(noteId);
    if (!note) {
      return NextResponse.json(
        { error: "Note not found" },
        { status: 404 }
      );
    }

    // Check if slot is already occupied
    const existingFiles = await noteService.getNoteFiles(noteId);
    const existingFile = existingFiles.find((f) => f.slotIndex === slotIndex);
    if (existingFile) {
      return NextResponse.json(
        { error: `Slot ${slotIndex} is already occupied. Delete the existing file first.` },
        { status: 409 }
      );
    }

    const noteFile = await uploadNoteFile(file, noteId, slotIndex);
    return NextResponse.json(noteFile, { status: 201 });
  } catch (error) {
    const errorId = randomUUID();
    console.error("[notes][files][POST] Failed to upload file", {
      errorId,
      noteId,
      error,
    });
    return NextResponse.json(
      { error: "Failed to upload file", errorId },
      { status: 500 }
    );
  }
}
