import { NextResponse } from "next/server";
import { noteService } from "@/lib/services/noteService/index";
import { parseJsonBody } from "@/lib/api/parse-json";
import { themeUpdateSchema } from "@/lib/validations/notes";
import { removeUndefined } from "@/lib/utils";
import type { ThemeUpdateInput } from "@/types/notes";
import { createErrorResponse } from "@/lib/api/handle-api-error";
import { notFoundError } from "@/lib/errors/app-error";

/**
 * GET /api/notes/themes/[id]
 * Fetches a single theme by ID.
 */
export async function GET(
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
      source: "themes.GET",
      fallbackMessage: "Failed to fetch theme",
    });
  }
}

/**
 * PATCH /api/notes/themes/[id]
 * Updates a theme.
 */
export async function PATCH(
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
      source: "themes.PATCH",
      fallbackMessage: "Failed to update theme",
    });
  }
}

/**
 * DELETE /api/notes/themes/[id]
 * Deletes a theme.
 */
export async function DELETE(
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
      source: "themes.DELETE",
      fallbackMessage: "Failed to delete theme",
    });
  }
}
