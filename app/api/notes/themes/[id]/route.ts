import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { noteService } from "@/lib/services/noteService/index";
import { parseJsonBody } from "@/lib/api/parse-json";
import { themeUpdateSchema } from "@/lib/validations/notes";

/**
 * GET /api/notes/themes/[id]
 * Fetches a single theme by ID.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const theme = await noteService.getThemeById(id);
    if (!theme) {
      return NextResponse.json({ error: "Theme not found" }, { status: 404 });
    }
    return NextResponse.json(theme);
  } catch (error) {
    const errorId = randomUUID();
    console.error("[themes][GET] Failed to fetch theme", { errorId, error });
    return NextResponse.json(
      { error: "Failed to fetch theme", errorId },
      { status: 500 }
    );
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
      logPrefix: "themes:PATCH",
    });
    if (!parsed.ok) {
      return parsed.response;
    }
    const updated = await noteService.updateTheme(id, parsed.data);
    if (!updated) {
      return NextResponse.json({ error: "Theme not found" }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error) {
    const errorId = randomUUID();
    console.error("[themes][PATCH] Failed to update theme", { errorId, error });
    return NextResponse.json(
      { error: "Failed to update theme", errorId },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notes/themes/[id]
 * Deletes a theme.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const success = await noteService.deleteTheme(id);
    if (!success) {
      return NextResponse.json({ error: "Theme not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    const errorId = randomUUID();
    console.error("[themes][DELETE] Failed to delete theme", { errorId, error });
    return NextResponse.json(
      { error: "Failed to delete theme", errorId },
      { status: 500 }
    );
  }
}
