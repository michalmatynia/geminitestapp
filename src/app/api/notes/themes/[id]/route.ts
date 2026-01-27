import { NextResponse } from "next/server";
import { noteService } from "@/features/notesapp/services/notes";
import { parseJsonBody } from "@/features/products/api/parse-json";
import { themeUpdateSchema } from "@/features/notesapp/validations/notes";
import { removeUndefined } from "@/shared/utils";
import type { ThemeUpdateInput } from "@/shared/types/notes";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { notFoundError } from "@/shared/errors/app-error";
import { apiHandlerWithParams } from "@/shared/lib/api/api-handler";

/**
 * GET /api/notes/themes/[id]
 * Fetches a single theme by ID.
 */
async function GET_handler(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
async function PATCH_handler(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
async function DELETE_handler(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

export const GET = apiHandlerWithParams<{ id: string }>(async (req, _ctx, params) => GET_handler(req, { params: Promise.resolve(params) }), { source: "notes.themes.[id].GET" });
export const PATCH = apiHandlerWithParams<{ id: string }>(async (req, _ctx, params) => PATCH_handler(req, { params: Promise.resolve(params) }), { source: "notes.themes.[id].PATCH" });
export const DELETE = apiHandlerWithParams<{ id: string }>(async (req, _ctx, params) => DELETE_handler(req, { params: Promise.resolve(params) }), { source: "notes.themes.[id].DELETE" });
