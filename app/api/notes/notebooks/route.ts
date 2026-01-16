import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { noteService } from "@/lib/services/noteService/index";
import { parseJsonBody } from "@/lib/api/parse-json";
import { notebookCreateSchema } from "@/lib/validations/notes";

/**
 * GET /api/notes/notebooks
 * Fetches all notebooks (creates a default if none exist).
 */
export async function GET() {
  try {
    const notebooks = await noteService.getAllNotebooks();
    return NextResponse.json(notebooks);
  } catch (error) {
    const errorId = randomUUID();
    console.error("[notebooks][GET] Failed to fetch notebooks", { errorId, error });
    return NextResponse.json(
      { error: "Failed to fetch notebooks", errorId },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notes/notebooks
 * Creates a notebook.
 */
export async function POST(req: Request) {
  try {
    const parsed = await parseJsonBody(req, notebookCreateSchema, {
      logPrefix: "notebooks:POST",
    });
    if (!parsed.ok) {
      return parsed.response;
    }
    const notebook = await noteService.createNotebook(parsed.data);
    return NextResponse.json(notebook, { status: 201 });
  } catch (error: unknown) {
    const errorId = randomUUID();
    if (error instanceof Error) {
      console.error("[notebooks][POST] Failed to create notebook", {
        errorId,
        message: error.message,
      });
      return NextResponse.json(
        { error: error.message, errorId },
        { status: 500 }
      );
    }
    console.error("[notebooks][POST] Unknown error creating notebook", { errorId, error });
    return NextResponse.json(
      { error: "Failed to create notebook", errorId },
      { status: 500 }
    );
  }
}
