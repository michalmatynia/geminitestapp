import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { noteService } from "@/lib/services/noteService";

/**
 * GET /api/notes/tags
 * Fetches all tags.
 */
export async function GET() {
  try {
    const tags = await noteService.getAllTags();
    return NextResponse.json(tags);
  } catch (error) {
    const errorId = randomUUID();
    console.error("[tags][GET] Failed to fetch tags", { errorId, error });
    return NextResponse.json(
      { error: "Failed to fetch tags", errorId },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notes/tags
 * Creates a new tag.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body.name) {
      return NextResponse.json(
        { error: "Tag name is required" },
        { status: 400 }
      );
    }

    const tag = await noteService.createTag(body);
    return NextResponse.json(tag, { status: 201 });
  } catch (error: unknown) {
    const errorId = randomUUID();
    if (error instanceof Error) {
      console.error("[tags][POST] Failed to create tag", {
        errorId,
        message: error.message,
      });
      return NextResponse.json(
        { error: error.message, errorId },
        { status: 500 }
      );
    }
    console.error("[tags][POST] Unknown error creating tag", { errorId, error });
    return NextResponse.json(
      { error: "Failed to create tag", errorId },
      { status: 500 }
    );
  }
}
