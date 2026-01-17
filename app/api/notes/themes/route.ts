import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { noteService } from "@/lib/services/noteService/index";
import { parseJsonBody } from "@/lib/api/parse-json";
import { themeCreateSchema } from "@/lib/validations/notes";
import type { ThemeRecord } from "@/types/notes";

/**
 * GET /api/notes/themes
 * Fetches themes for a notebook.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const notebookIdParam = searchParams.get("notebookId");
  try {
    const notebookId = notebookIdParam
      ? notebookIdParam
      : (await noteService.getOrCreateDefaultNotebook()).id;
    const themes = await noteService.getAllThemes(notebookId);
    return NextResponse.json(themes);
  } catch (error) {
    const errorId = randomUUID();
    console.error("[themes][GET] Failed to fetch themes", { errorId, error });
    return NextResponse.json(
      { error: "Failed to fetch themes", errorId },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notes/themes
 * Creates a new theme.
 */
export async function POST(req: Request) {
  try {
    const parsed = await parseJsonBody(req, themeCreateSchema, {
      logPrefix: "themes:POST",
    });
    if (!parsed.ok) {
      return parsed.response;
    }
    const resolvedNotebookId =
      parsed.data.notebookId ?? (await noteService.getOrCreateDefaultNotebook()).id;
    const theme = await noteService.createTheme({
      ...parsed.data,
      notebookId: resolvedNotebookId,
    });
    return NextResponse.json(theme, { status: 201 });
  } catch (error) {
    const errorId = randomUUID();
    console.error("[themes][POST] Failed to create theme", { errorId, error });
    return NextResponse.json(
      { error: "Failed to create theme", errorId },
      { status: 500 }
    );
  }
}
