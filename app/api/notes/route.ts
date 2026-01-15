import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { noteService } from "@/lib/services/noteService/index";
import type { NoteFilters } from "@/types/notes";

/**
 * GET /api/notes
 * Fetches a list of notes with optional filters.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const filters: NoteFilters = {};

  if (searchParams.has("search")) {
    filters.search = searchParams.get("search")!;
  }

  if (searchParams.has("isPinned")) {
    filters.isPinned = searchParams.get("isPinned") === "true";
  }

  if (searchParams.has("isArchived")) {
    filters.isArchived = searchParams.get("isArchived") === "true";
  }

  if (searchParams.has("tagIds")) {
    filters.tagIds = searchParams.get("tagIds")!.split(",");
  }

  if (searchParams.has("categoryIds")) {
    filters.categoryIds = searchParams.get("categoryIds")!.split(",");
  }

  try {
    const notes = await noteService.getAll(filters);
    return NextResponse.json(notes);
  } catch (error) {
    const errorId = randomUUID();
    console.error("[notes][GET] Failed to fetch notes", {
      errorId,
      error,
      filters,
    });
    return NextResponse.json(
      { error: "Failed to fetch notes", errorId },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notes
 * Creates a new note.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body.title || !body.content) {
      return NextResponse.json(
        { error: "Title and content are required" },
        { status: 400 }
      );
    }

    const note = await noteService.create(body);
    return NextResponse.json(note, { status: 201 });
  } catch (error: unknown) {
    const errorId = randomUUID();
    if (error instanceof Error) {
      console.error("[notes][POST] Failed to create note", {
        errorId,
        message: error.message,
      });
      return NextResponse.json(
        { error: error.message, errorId },
        { status: 500 }
      );
    }
    console.error("[notes][POST] Unknown error creating note", {
      errorId,
      error,
    });
    return NextResponse.json(
      { error: "Failed to create note", errorId },
      { status: 500 }
    );
  }
}
