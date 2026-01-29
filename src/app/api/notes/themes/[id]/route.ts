import { NextRequest, NextResponse } from "next/server";
import { noteService } from "@/features/notesapp/server";
import { parseJsonBody } from "@/features/products/server";
import { themeUpdateSchema } from "@/features/notesapp";
import { removeUndefined } from "@/shared/utils";
import type { ThemeUpdateInput } from "@/shared/types/notes";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { notFoundError } from "@/shared/errors/app-error";
import { apiHandlerWithParams } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";

/**
 * GET /api/notes/themes/[id]
 * Fetches a single theme by ID.
 */
async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext, params: { id: string }): Promise<Response> {
  const { id } = params;
  try {
    const theme = await noteService.getThemeById(id);
    if (!theme) {
      throw notFoundError("Theme not found", { themeId: id });
    }
    return NextResponse.json(theme);
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "notes.themes.[id].GET",
      fallbackMessage: "Failed to fetch theme",
    });
  }
}

/**
 * PATCH /api/notes/themes/[id]
 * Updates a theme.
 */
async function PATCH_handler(req: NextRequest, _ctx: ApiHandlerContext, params: { id: string }): Promise<Response> {
  const { id } = params;
  try {
    const parsed = await parseJsonBody(req, themeUpdateSchema, {
      logPrefix: "themes.PATCH",
    });
    if (!parsed.ok) {
      return parsed.response;
    }
    const updated = await noteService.updateTheme(
      id,
      removeUndefined(parsed.data) as ThemeUpdateInput
    );
    if (!updated) {
      throw notFoundError("Theme not found", { themeId: id });
    }
    return NextResponse.json(updated);
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "notes.themes.[id].PATCH",
      fallbackMessage: "Failed to update theme",
    });
  }
}

/**
 * DELETE /api/notes/themes/[id]
 * Deletes a theme.
 */
async function DELETE_handler(req: NextRequest, _ctx: ApiHandlerContext, params: { id: string }): Promise<Response> {
  const { id } = params;
  try {
    const success = await noteService.deleteTheme(id);
    if (!success) {
      throw notFoundError("Theme not found", { themeId: id });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "notes.themes.[id].DELETE",
      fallbackMessage: "Failed to delete theme",
    });
  }
}

export const GET = apiHandlerWithParams<{ id: string }>(GET_handler, { source: "notes.themes.[id].GET" });
export const PATCH = apiHandlerWithParams<{ id: string }>(PATCH_handler, { source: "notes.themes.[id].PATCH" });
export const DELETE = apiHandlerWithParams<{ id: string }>(DELETE_handler, { source: "notes.themes.[id].DELETE" });
