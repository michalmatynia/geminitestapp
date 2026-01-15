import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { noteService } from "@/lib/services/noteService/index";

/**
 * GET /api/notes/[id]
 * Fetches a single note by ID.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const note = await noteService.getById(id);

    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    return NextResponse.json(note);
  } catch (error) {
    const errorId = randomUUID();
    console.error("[notes][GET] Failed to fetch note", {
      errorId,
      noteId: id,
      error,
    });
    return NextResponse.json(
      { error: "Failed to fetch note", errorId },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/notes/[id]
 * Updates a note.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await req.json();
    const note = await noteService.update(id, body);
    return NextResponse.json(note);
  } catch (error: unknown) {
    const errorId = randomUUID();
    if (error instanceof Error) {
      console.error("[notes][PATCH] Failed to update note", {
        errorId,
        noteId: id,
        message: error.message,
      });
      return NextResponse.json(
        { error: error.message, errorId },
        { status: 500 }
      );
    }
    console.error("[notes][PATCH] Unknown error updating note", {
      errorId,
      noteId: id,
      error,
    });
    return NextResponse.json(
      { error: "Failed to update note", errorId },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notes/[id]
 * Deletes a note.
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await noteService.delete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const errorId = randomUUID();
    console.error("[notes][DELETE] Failed to delete note", {
      errorId,
      noteId: id,
      error,
    });
    return NextResponse.json(
      { error: "Failed to delete note", errorId },
      { status: 500 }
    );
  }
}
