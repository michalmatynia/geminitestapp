import { NextResponse } from "next/server";
import { noteService } from "@/lib/services/noteService/index";
import { parseJsonBody } from "@/features/products/api/parse-json";
import { themeCreateSchema } from "@/lib/validations/notes";
import type { ThemeCreateInput } from "@/types/notes";
import { removeUndefined } from "@/shared/lib/utils";
import { createErrorResponse } from "@/lib/api/handle-api-error";
import { apiHandler } from "@/lib/api/api-handler";

/**
 * GET /api/notes/themes
 * Fetches themes for a notebook.
 */
async function GET_handler(req: Request) {
  const { searchParams } = new URL(req.url);
  const notebookIdParam = searchParams.get("notebookId");
  try {
    const notebookId = notebookIdParam
      ? notebookIdParam
      : (await noteService.getOrCreateDefaultNotebook()).id;
    const themes = await noteService.getAllThemes(notebookId);
    return NextResponse.json(themes);
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "notes.themes.GET",
      fallbackMessage: "Failed to fetch themes",
    });
  }
}

/**
 * POST /api/notes/themes
 * Creates a new theme.
 */
async function POST_handler(req: Request) {
  try {
    const parsed = await parseJsonBody(req, themeCreateSchema, {
      logPrefix: "themes.POST",
    });
    if (!parsed.ok) {
      return parsed.response;
    }
    const resolvedNotebookId =
      parsed.data.notebookId ?? (await noteService.getOrCreateDefaultNotebook()).id;
    const theme = await noteService.createTheme(removeUndefined({
      ...parsed.data,
      notebookId: resolvedNotebookId,
    }) as ThemeCreateInput);
    return NextResponse.json(theme, { status: 201 });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "notes.themes.POST",
      fallbackMessage: "Failed to create theme",
    });
  }
}

export const GET = apiHandler(GET_handler, { source: "notes.themes.GET" });
export const POST = apiHandler(POST_handler, { source: "notes.themes.POST" });
