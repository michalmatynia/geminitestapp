import { NextResponse } from "next/server";
import { noteService } from "@/lib/services/noteService/index";
import { parseJsonBody } from "@/lib/api/parse-json";
import { noteUpdateSchema } from "@/lib/validations/notes";
import { removeUndefined } from "@/lib/utils";
import type { NoteUpdateInput } from "@/types/notes";
import { createErrorResponse } from "@/lib/api/handle-api-error";
import { notFoundError } from "@/lib/errors/app-error";
import { apiHandlerWithParams } from "@/lib/api/api-handler";

/**
 * GET /api/notes/[id]
 * Fetches a single note by ID.
 */
async function GET_handler(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const note = await noteService.getById(id);

    if (!note) {
      throw notFoundError("Note not found", { noteId: id });
    }

    return NextResponse.json(note);
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "notes.[id].GET",
      fallbackMessage: "Failed to fetch note",
    });
  }
}

/**
 * PATCH /api/notes/[id]
 * Updates a note.
 */
async function PATCH_handler(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const parsed = await parseJsonBody(req, noteUpdateSchema, {
      logPrefix: "notes.PATCH",
      allowEmpty: true,
    });
    if (!parsed.ok) {
      return parsed.response;
    }
    const body = parsed.data;
    const note = await noteService.update(
      id,
      removeUndefined(body) as NoteUpdateInput
    );

    return NextResponse.json(note);
  } catch (error: unknown) {
    return createErrorResponse(error, {
      request: req,
      source: "notes.[id].PATCH",
      fallbackMessage: "Failed to update note",
    });
  }
}

/**
 * DELETE /api/notes/[id]
 * Deletes a note.
 */
async function DELETE_handler(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await noteService.delete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "notes.[id].DELETE",
      fallbackMessage: "Failed to delete note",
    });
  }
}

export const GET = apiHandlerWithParams<{ id: string }>(async (req, _ctx, params) => GET_handler(req, { params: Promise.resolve(params) }), { source: "notes.[id].GET" });
export const PATCH = apiHandlerWithParams<{ id: string }>(async (req, _ctx, params) => PATCH_handler(req, { params: Promise.resolve(params) }), { source: "notes.[id].PATCH" });
export const DELETE = apiHandlerWithParams<{ id: string }>(async (req, _ctx, params) => DELETE_handler(req, { params: Promise.resolve(params) }), { source: "notes.[id].DELETE" });
