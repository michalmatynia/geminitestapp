import { NextRequest, NextResponse } from "next/server";
import { noteService } from "@/features/notesapp/server";
import { parseJsonBody } from "@/features/products/server";
import { themeCreateSchema } from "@/features/notesapp";
import type { ThemeCreateInput } from "@/shared/types/notes";
import { removeUndefined } from "@/shared/utils";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";

/**
 * GET /api/notes/themes
 * Fetches themes for a notebook.
 */
async function GET_handler(req: NextRequest): Promise<Response> {
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
async function POST_handler(req: NextRequest): Promise<Response> {
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

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
 { source: "notes.themes.GET" });
export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
 { source: "notes.themes.POST" });
